import { opendir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { Ignore } from 'ignore';
import type { CancellationToken } from '../utils/cancelToken';

export class RepoScanner {
    private readonly rootDir: string;
    private readonly ignoreFilter: Ignore;
    
    public getIgnoreFilter(): Ignore {
    return this.ignoreFilter;
}
constructor(rootDir: string, ignoreFilter: Ignore) {
    this.rootDir = rootDir;
    this.ignoreFilter = ignoreFilter;
}

/**
   * Punto de entrada público del escáner.
   * Produce rutas de archivos una por una sin acumularlas en memoria.
   */
  public async *scan(token: CancellationToken): AsyncGenerator<string> {
    yield* this.traverse(this.rootDir, token);
}

/**
   * Algoritmo recursivo basado en Streams de directorio (opendir).
   */
  private async *traverse(currentDir: string, token: CancellationToken): AsyncGenerator<string> {
    // Red de seguridad: Verificar cancelación antes de abrir un nuevo directorio
    token.throwIfCancelled();

    // opendir no lee todo el directorio a la memoria, abre un flujo hacia el OS
    const dir = await opendir(currentDir);

    // El bucle for await...of asegura el cierre automático (auto-close) del handle 
    // del directorio incluso si se lanza una excepción en su interior.
    for await (const entry of dir) {
      // Red de seguridad: Verificar cancelación por cada archivo procesado
        token.throwIfCancelled();

        const fullPath = join(currentDir, entry.name);
    
      // Calculamos la ruta relativa (ej: 'src/index.ts') porque 'ignore' evalúa así
        const relativePath = relative(this.rootDir, fullPath);

      // EARLY RETURN: Si la ruta coincide con .gitignore o reglas hardcodeadas, se descarta ya mismo
        if (this.ignoreFilter.ignores(relativePath)) {
        continue;
}

        if (entry.isDirectory()) {
        // Recursión por generador asíncrono: delega la producción de datos
    yield* this.traverse(fullPath, token);
        } else if (entry.isFile()) {
        yield fullPath;
    }
    }
}
}