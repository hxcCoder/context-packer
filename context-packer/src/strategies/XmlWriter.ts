import type { Readable, Writable } from 'node:stream'; // <-- Prefijo node:
import { pipeline } from 'node:stream/promises';       // <-- Prefijo node:
import type { ContextWriter } from './ContextWriter.interface';

export class XmlWriter implements ContextWriter {
private outputStream!: Writable;

initialize(outputStream: Writable): void {
    this.outputStream = outputStream;
}

async writeHeader(treeMap: string): Promise<void> {
    this.ensureInitialized();
    
    // Abrimos el contexto del repositorio
    this.outputStream.write('<repository>\n\n');
    
    // Empaquetamos el mapa estructural para que el LLM entienda la topología
    this.outputStream.write('<directory_tree>\n');
    this.outputStream.write(treeMap);
    this.outputStream.write('\n</directory_tree>\n\n');
}

async writeFileBlock(filePath: string, transformedStream: Readable): Promise<void> {
    this.ensureInitialized();
    
    // Abrimos la etiqueta del archivo con su ruta como atributo
    this.outputStream.write(`<file path="${filePath}">\n`);
    
    // ----------------------------------------------------------------------
    // ZERO-RAM COLLAPSE EN ACCIÓN:
    // Conectamos el stream de transformación directamente al stream de salida.
    // Pasamos { end: false } CRÍTICO para que el stream principal no se cierre
    // cuando este archivo individual termine de fluir.
    // ----------------------------------------------------------------------
    await pipeline(transformedStream, this.outputStream, { end: false });
    
    // Cerramos la etiqueta del archivo
    this.outputStream.write('\n</file>\n\n');
}

async finalize(): Promise<void> {
    this.ensureInitialized();
    
    // Cerramos el contexto global
    this.outputStream.write('</repository>\n');
}

/**
   * Validación de seguridad arquitectónica.
   */
private ensureInitialized(): void {
    if (!this.outputStream) {
        throw new Error("[XmlWriter] No ha sido inicializado. Llama a initialize() con un Writable Stream válido.");
    }
}
}