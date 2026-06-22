import { readFile } from 'node:fs/promises';
import { stat } from 'node:fs/promises';
import { relative } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { escapeXml } from '../utils/xmlEscape';
import type { RepoScanner } from './scanner';
import type { AtomicFileManager } from './atomicFileManager';
import type { TokenizerStrategy } from '../strategies/Tokenizer.interface';
import type { ContextWriter } from '../strategies/ContextWriter.interface';
import type { CancellationToken } from '../utils/cancelToken';
import { DirectoryTreeBuilder } from './directoryTreeBuilder';

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

  public async compile(token: CancellationToken): Promise<CompilerMetrics> {
    const startTime = Date.now();
    let totalFilesProcessed = 0;
    let totalBytesProcessed = 0;
    let totalTokensCounted = 0;

    await this.tokenizer.initialize();

    const outputStream = this.fileManager.createTempStream(token.getSignal());
    this.writer.initialize(outputStream);

    try {
      const treeBuilder = new DirectoryTreeBuilder(
        this.rootDir,
        this.scanner.getIgnoreFilter()
      );
      const tree = await treeBuilder.build();
      await this.writer.writeHeader(tree);

      for await (const absolutePath of this.scanner.scan(token)) {
        token.throwIfCancelled();

        const relativePath = relative(this.rootDir, absolutePath);
        const fileStats = await stat(absolutePath);

        totalFilesProcessed++;
        totalBytesProcessed += fileStats.size;

        // ──────────────────────────────────────────────────────────────
        // 1. LECTURA COMPLETA PARA CONTEO EXACTO DE TOKENS
        //    Justificación: Los tokenizadores BPE (tiktoken) requieren
        //    el texto completo para no romper tokens en los bordes del chunk.
        //    La memoria se libera en cada iteración (archivo por archivo).
        // ──────────────────────────────────────────────────────────────
        const fileContent = await readFile(absolutePath, 'utf8');
        totalTokensCounted += this.tokenizer.countTokensExact(fileContent);

        // ──────────────────────────────────────────────────────────────
        // 2. STREAMING PARA ESCRITURA (sin perder la eficiencia O(1))
        //    Fragmentamos el string en chunks de 64KB y lo pasamos por
        //    un transform que escapa el XML antes de escribir en disco.
        // ──────────────────────────────────────────────────────────────
        const contentStream = Readable.from(
          this.chunkString(fileContent, 64 * 1024)
        );

        const escapeTransform = new Transform({
          decodeStrings: false,
          transform(chunk: string, encoding: string, callback) {
            callback(null, escapeXml(chunk));
          }
        });

        const transformedStream = contentStream.pipe(escapeTransform);

        await this.writer.writeFileBlock(relativePath, transformedStream);
      }

      await this.writer.finalize();
      await this.fileManager.commit();

    } catch (error) {
      await this.fileManager.rollback();
      throw error;
    } finally {
      this.tokenizer.destroy();
    }

    return {
      totalFilesProcessed,
      totalBytesProcessed,
      totalTokensCounted,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * Generador que divide un string en chunks de tamaño fijo.
   * Útil para mantener el flujo de escritura sin saturar el buffer.
   */
  private *chunkString(str: string, size: number): Generator<string> {
    for (let i = 0; i < str.length; i += size) {
      yield str.slice(i, i + size);
    }
  }
}