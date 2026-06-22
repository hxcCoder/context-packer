import process from 'node:process';
import pc from 'picocolors';
import type { CompilerMetrics } from '../core/compiler'; // <-- Reutilizamos el tipo para evitar duplicación

export const theme = {
  // Paleta de colores semántica de la aplicación
color: {
    primary: (text: string) => pc.cyan(text),
    success: (text: string) => pc.green(text),
    error: (text: string) => pc.red(text),
    warn: (text: string) => pc.yellow(text),
    info: (text: string) => pc.blue(text),
    muted: (text: string) => pc.dim(text),
    highlight: (text: string) => pc.bold(pc.magenta(text)),
    bold: (text: string) => pc.bold(text),
},

  // Prefijos e íconos consistentes para los logs de la terminal
icon: {
    info: pc.blue('ℹ'),
    success: pc.green('✔'),
    warn: pc.yellow('⚠'),
    error: pc.red('✖'),
    arrow: pc.cyan('❯'),
    bullet: pc.dim('•'),
},

/**
   * Imprime un banner de bienvenida premium al arrancar la CLI.
   */
printBanner(): void {
    process.stdout.write('\n');
    process.stdout.write(pc.cyan(pc.bold(' ╔══════════════════════════════════════════════════╗\n')));
    process.stdout.write(pc.cyan(pc.bold(' ║               CONTEXT PACKER IA                  ║\n')));
    process.stdout.write(pc.cyan(pc.bold(' ║       - Grado de Ingeniería Enterprise -         ║\n')));
    process.stdout.write(pc.cyan(pc.bold(' ╚══════════════════════════════════════════════════╝\n')));
    process.stdout.write(` ${pc.dim('Preparando el entorno local con huella de memoria O(1)...')}\n\n`);
},

/**
   * Renderiza una tarjeta estética con las métricas finales de telemetría.
   */
formatMetrics(metrics: CompilerMetrics): string {
    const sizeInMb = (metrics.totalBytesProcessed / (1024 * 1024)).toFixed(2);
    const timeInSec = (metrics.executionTimeMs / 1000).toFixed(2);
    const formattedTokens = metrics.totalTokensCounted.toLocaleString('es-CL');

    return `
${pc.bold(pc.green('╔══════════════════════════════════════════════════════════╗'))}
${pc.bold(pc.green('║               PROCESO COMPLETADO CON ÉXITO               ║'))}
${pc.bold(pc.green('╚══════════════════════════════════════════════════════════╝'))}
${pc.cyan('❯')} ${pc.bold('Archivos empaquetados :')} ${pc.white(metrics.totalFilesProcessed.toString())}
${pc.cyan('❯')} ${pc.bold('Tamaño total del lote :')} ${pc.white(sizeInMb)} MB
${pc.cyan('❯')} ${pc.bold('Consumo de Tokens IA  :')} ${pc.bold(pc.magenta(formattedTokens))}
${pc.cyan('❯')} ${pc.bold('Tiempo de compilación :')} ${pc.yellow(timeInSec)} segundos
${pc.dim('──────────────────────────────────────────────────────────')}
${pc.green('✔')} Archivo de salida consolidado en: ${pc.bold(pc.underline('contexto-ia.txt'))}
`;
}
};