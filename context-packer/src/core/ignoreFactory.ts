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
   '.git', '.git/',
    'node_modules', 'node_modules/',
    'vendor', 'vendor/',           // Proyectos PHP/Composer
    '__pycache__', '__pycache__/', // Proyectos Python
    '.venv', '.venv/',             // Entornos virtuales Python
    'dist', 'dist/',
    'build', 'build/',
    '.next', '.next/',             // Next.js
    '.nuxt', '.nuxt/',             // Nuxt.js
    '.svelte-kit', '.svelte-kit/', // Svelte
    '.angular', '.angular/',       // Angular
    '.expo', '.expo/',             // React Native
    'out', 'out/',
    'coverage', 'coverage/',
    '.cache', '.cache/',

    // 2. Archivos propios de la herramienta
    '.contexto-ia.tmp',
    'contexto-ia.txt',

    // 3. Seguridad Extrema (Secretos y Certificados)
    '.env*',
    '*.pem', '*.key', '*.crt', '*.cer', // Evita filtrar llaves privadas SSL/SSH
    'secrets.json',

    // 4. Bloqueadores de dependencias (Ruido masivo de tokens)
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'bun.lockb',
    'composer.lock', // PHP
    'Cargo.lock',    // Rust
    'Gemfile.lock',  // Ruby
    'poetry.lock',   // Python

    // 5. Archivos Multimedia e Imágenes
    '*.png', '*.jpg', '*.jpeg', '*.gif', '*.webp', '*.ico', 
    '*.svg', '*.mp4', '*.mp3', '*.wav', '*.pdf',

    // 6. Archivos Comprimidos, Binarios y Fuentes (CRÍTICO)
    '*.zip', '*.tar', '*.tar.gz', '*.rar', '*.7z', // Comprimidos
    '*.ttf', '*.woff', '*.woff2', '*.eot', '*.otf', // Fuentes web
    '*.exe', '*.dll', '*.so', '*.dylib', // Binarios compilados de OS

    // 7. Bases de datos y logs
    '*.log',
    '*.sqlite', '*.sqlite3', '*.db', '*.sql',

    // 8. Compilación pesada y Basura del Sistema Operativo
    '*.map',       // Source maps (¡Pesadísimos!)
    '*.min.js',    // Código JS minificado
    '*.min.css',   // Código CSS minificado
    '.DS_Store',   // Metadata basura de macOS
    'Thumbs.db'
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