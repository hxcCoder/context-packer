import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import ignore from 'ignore';
import type { Ignore } from 'ignore';

export class IgnoreFactory {
/**
   * Reglas de exclusión innegociables. 
   * Protegen la herramienta de bucles infinitos y basura binaria.
   */
private static readonly MANDATORY_IGNORES = [
    '.git',
    '.git/',
    'node_modules',
    'node_modules/',
    '.contexto-ia.tmp',
    'contexto-ia.txt',
    'dist/',
    'build/',
    'coverage/',
    '.env*',       // CRÍTICO: Evita filtrar secretos al LLM
    '*.log',
    '*.lock',      // package-lock.json o yarn.lock consumen demasiados tokens sin aportar lógica

    // ──────────────────────────────────────────────────────────
    // ESCUDO ANTIBINARIOS (Protección de Ventana de Tokens)
    // ──────────────────────────────────────────────────────────
    // Imágenes y Multimedia
    '*.jpg',
    '*.jpeg',
    '*.png',
    '*.gif',
    '*.webp',
    '*.ico',
    '*.svg',       // Aunque es XML, suele inflar el contexto innecesariamente
    '*.mp4',
    '*.mp3',
    
    // Documentos compilados o pesados
    '*.pdf',
    '*.zip',
    '*.tar.gz',
    '*.rar',
    '*.7z',
    
    // Binarios de fuentes y OS
    '*.woff',
    '*.woff2',
    '*.ttf',
    '*.eot',
    'Thumbs.db',
    '.DS_Store',
];

/**
   * Crea una instancia configurada de 'ignore' combinando reglas estáticas y el .gitignore
   * @param rootDir El directorio raíz del proyecto que se va a escanear
   */
public static async create(rootDir: string): Promise<Ignore> {
    const ig = ignore();

    // 1. Inyectar el escudo base
    ig.add(this.MANDATORY_IGNORES);

    // 2. Intentar cargar las reglas personalizadas del usuario
    const gitignorePath = join(rootDir, '.gitignore');
    
    try {
        const gitignoreContent = await readFile(gitignorePath, 'utf8');
        ig.add(gitignoreContent);
    } catch (error: any) {
      // Es perfectamente válido que un proyecto no tenga .gitignore
      // Si el error es ENOENT (archivo no encontrado), lo tragamos silenciosamente.
      // Si es un error de permisos u otra cosa, lanzamos una advertencia sutil.
    if (error.code !== 'ENOENT') {
        process.stderr.write(`\n[!] Advertencia: No se pudo procesar el .gitignore (${error.message})\n`);
    }
    }

    return ig;
}
}