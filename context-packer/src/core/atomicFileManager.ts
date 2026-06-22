import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import type { Writable } from 'node:stream';

export class AtomicFileManager {
    private readonly targetPath: string;
    private readonly tempPath: string;
    private writeStream: Writable | null = null;
    private isCommitted: boolean = false;

constructor(targetPath: string = 'contexto-ia.txt', tempPath: string = '.contexto-ia.tmp') {
    this.targetPath = targetPath;
    this.tempPath = tempPath;
}

/**
   * Crea y retorna el WriteStream apuntando exclusivamente al archivo temporal.
   */
public createTempStream(signal?: AbortSignal): Writable {
    if (this.writeStream) {
        throw new Error('[AtomicFileManager] Ya existe un stream activo de escritura.');
    }

    // Pasamos la AbortSignal nativa para que Node cierre el descriptor de archivo automáticamente si se cancela
    this.writeStream = fs.createWriteStream(this.tempPath, { 
    flags: 'w', 
    encoding: 'utf8',
    signal 
    });

    return this.writeStream;
}

/**
   * Transforma el archivo temporal en el archivo definitivo de forma atómica.
   */
public async commit(): Promise<void> {
    await this.ensureClosedStream();

    try {
      // Operación atómica a nivel de OS (renombrado asíncrono)
        await fsPromises.rename(this.tempPath, this.targetPath);
        this.isCommitted = true;
    } catch (error: any) {
        throw new Error(`[AtomicFileManager] Error fatal al consolidar el archivo final: ${error.message}`);
    }
}

/**
   * Limpia el archivo temporal si el proceso falló o fue cancelado.
   */
public async rollback(): Promise<void> {
    await this.ensureClosedStream();

    if (this.isCommitted) return;

    try {
      // Verificamos si el archivo temporal realmente existe antes de borrarlo
        await fsPromises.access(this.tempPath);
        await fsPromises.unlink(this.tempPath);
    } catch {
      // Ignoramos si el archivo no existía (ej. falló antes de crear el stream)
    }
}

/**
   * Asegura que los descriptores de archivo se liberen ANTES de moverlos en disco.
   * Evita el error EBUSY (Resource Locked) en Windows.
   */
private async ensureClosedStream(): Promise<void> {
    if (this.writeStream) {
        await new Promise<void>((resolve) => {
        // Si el stream ya terminó su ciclo, resolvemos de inmediato
        if (this.writeStream!.writableEnded) {
            resolve();
        } else {
          // Esperamos el cierre completo a nivel OS antes de resolver
            this.writeStream!.end(resolve);
        }
});
this.writeStream = null;
    }
    }
}