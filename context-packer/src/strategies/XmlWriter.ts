import type { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ContextWriter } from './ContextWriter.interface';
import { escapeXml } from '../utils/xmlEscape';

export class XmlWriter implements ContextWriter {
private outputStream!: Writable;

initialize(outputStream: Writable): void {
    this.outputStream = outputStream;
}

async writeHeader(treeMap: string): Promise<void> {
    this.ensureInitialized();
    this.outputStream.write('<repository>\n\n');
    this.outputStream.write('<directory_tree>\n');
    this.outputStream.write(treeMap);
    this.outputStream.write('\n</directory_tree>\n\n');
}

async writeFileBlock(filePath: string, transformedStream: Readable): Promise<void> {
    this.ensureInitialized();

    // Normalizar rutas a Unix (/) para Windows y mantener consistencia
    const normalizedPath = filePath.replace(/\\/g, '/');
    const safePath = escapeXml(normalizedPath);

    this.outputStream.write(`<file path="${safePath}">\n`);

    await pipeline(transformedStream, this.outputStream, { end: false });

    this.outputStream.write('\n</file>\n\n');
}

async finalize(): Promise<void> {
    this.ensureInitialized();
    this.outputStream.write('</repository>\n');

    await new Promise<void>((resolve, reject) => {
        this.outputStream.end((error?: Error | null) => {
        if (error) reject(error);
        else resolve();
        });
    });
}

private ensureInitialized(): void {
    if (!this.outputStream) {
        throw new Error('[XmlWriter] No ha sido inicializado. Llama a initialize() con un Writable Stream válido.');
    }
}
}