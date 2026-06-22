import type { Readable, Writable } from 'node:stream';

/**
 * Contrato inmutable para los formateadores de salida.
 * Controla el ciclo de vida de la estructura del archivo final.
 */
export interface ContextWriter {
/**
   * Vincula el escritor al stream de destino provisto por el atomicFileManager.
   * Evita que el escritor dependa de rutas físicas de archivos.
   */
initialize(outputStream: Writable): void;

/**
   * Escribe los metadatos iniciales y el árbol de directorios escaneado.
   * @param treeMap Representación visual en texto del repositorio.
   */
writeHeader(treeMap: string): Promise<void>;

/**
   * Consume un flujo de datos ya transformado de un archivo y lo envuelve 
   * en la estructura correspondiente (bloques XML, bloques Markdown, etc.).
   * * CRÍTICO para Zero-RAM: Consume un Stream, nunca un string en memoria.
   */
writeFileBlock(filePath: string, transformedStream: Readable): Promise<void>;

/**
   * Cierra las estructuras abiertas (tags de cierre, arrays de JSON, etc.)
   * indicando que el pipeline de compilación ha terminado con éxito.
   */
finalize(): Promise<void>;
}