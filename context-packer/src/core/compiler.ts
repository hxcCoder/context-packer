import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { relative } from 'node:path';
import { Transform } from 'node:stream';
import type { TransformCallback } from 'node:stream';

import type { RepoScanner } from './scanner';
import type { AtomicFileManager } from './atomicFileManager';
import type { TokenizerStrategy } from '../strategies/Tokenizer.interface';
import type { ContextWriter } from '../strategies/ContextWriter.interface';
import type { CancellationToken } from '../utils/cancelToken';

export interface CompilerMetrics {
    totalFilesProcessed: number;
    totalBytesProcessed: number;
    totalTokensCounted: number;
    executionTimeMs: number;
}

export class ContextCompiler {
    private readonly scanner: RepoScanner;
    private readonly fileManager: AtomicFileManager;
    private readonly tokenizer: TokenizerStrategy;
    private readonly writer: ContextWriter;
    private readonly rootDir: string;

    constructor(
    rootDir: string,
    scanner: RepoScanner,
    fileManager: AtomicFileManager,
    tokenizer: TokenizerStrategy,
    writer: ContextWriter
) {
    this.rootDir = rootDir;
    this.scanner = scanner;
    this.fileManager = fileManager;
    this.tokenizer = tokenizer;
    this.writer = writer;
}

/**
   * Orquesta el pipeline de empaquetado protegiendo la RAM y escuchando cancelaciones.
   */
public async compile(token: CancellationToken): Promise<CompilerMetrics> {
    const startTime = Date.now();
    let totalFilesProcessed = 0;
    let totalBytesProcessed = 0;
    let totalTokensCounted = 0;

    // 1. Inicializar la estrategia de lectura (ej. Cargar WASM si es GPT)
    await this.tokenizer.initialize();

    // 2. Abrir el flujo de escritura en el archivo temporal (.contexto-ia.tmp)
    const outputStream = this.fileManager.createTempStream(token.getSignal());
    this.writer.initialize(outputStream);

    try {
      // 3. Escribir la cabecera inicial del contexto
      // Nota: En la siguiente fase alimentaremos un mapa de árbol real, por ahora pasamos un placeholder.
      await this.writer.writeHeader('/* Estructura del repositorio mapeada secuencialmente */\n');

      // 4. Consumir el generador asíncrono del Scanner del repositorio (RAM O(1))
        for await (const absolutePath of this.scanner.scan(token)) {
        // Red de seguridad: Cancelación antes de procesar el siguiente archivo
        token.throwIfCancelled();

        const relativePath = relative(this.rootDir, absolutePath);
        const fileStats = await stat(absolutePath);

        totalFilesProcessed++;
        totalBytesProcessed += fileStats.size;

        // 5. Crear el Stream de Lectura del archivo individual
        const fileReadStream = createReadStream(absolutePath, {
        encoding: 'utf8',
          highWaterMark: 64 * 1024, // Bloques óptimos de 64KB
          signal: token.getSignal() // Atado al ciclo de vida de cancelación
        });

        // Capturamos la referencia del tokenizer para usarla dentro del Transform
        const currentTokenizer = this.tokenizer;

        // 6. TRANSFORM STREAM SOBRE LA MARCHA: Sanitización y Telemetría en Vuelo
        const transformer = new Transform({
          decodeStrings: false, // Mantenemos los chunks como strings ya que especificamos 'utf8' arriba
            transform(chunk: string, encoding: string, callback: TransformCallback) {
            try {
              // Conteo exacto por bloque sin acumular el archivo entero en memoria
                totalTokensCounted += currentTokenizer.countTokensExact(chunk);

              // Escapamos entidades básicas de XML para asegurar que el archivo final sea válido
            const sanitizedChunk = chunk
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

              // Pasamos el chunk transformado al siguiente eslabón del pipeline
            callback(null, sanitizedChunk);
            } catch (err) {
              // Manejo seguro de errores dentro del stream
            callback(err as Error);
            }
        }
        });

        // Conectamos el stream de lectura al transformador
        const transformedStream = fileReadStream.pipe(transformer);

        // 7. Delegar al escritor la inserción estructurada del bloque de archivo
        await this.writer.writeFileBlock(relativePath, transformedStream);
    }

      // 8. Cerrar estructuras del archivo final (tags XML de cierre)
        await this.writer.finalize();

      // 9. Operación Atómica exitosa: Consolidamos el temporal a 'contexto-ia.txt'
        await this.fileManager.commit();

    } catch (error) {
      // ROLLBACK INMEDIATO: Si el usuario presiona CTRL+C o un archivo falla
        await this.fileManager.rollback();
        throw error;
    } finally {
      // CORRECCIÓN: finally en lugar de trim
      // Aseguramos la liberación de memoria en el tokenizer (WASM de tiktoken)
        this.tokenizer.destroy();
    }

    return {
    totalFilesProcessed,
    totalBytesProcessed,
    totalTokensCounted,
    executionTimeMs: Date.now() - startTime
    };
}
}