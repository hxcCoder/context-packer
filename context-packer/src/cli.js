#!/usr/bin/env node
import { program } from 'commander';
// Aquí importaremos tu tema de picocolors cuando lo creemos
// import { theme } from './ui/theme'; 

async function bootstrap() {
  // 1. Configuración base de Commander (Interceptar errores)
  program
    .name('context-packer')
    .description('Transforma repositorios en mapas de contexto para LLMs')
    .version('1.0.0')
    .exitOverride((err) => {
      // Delegaremos el error a nuestra UI en lugar de matar el proceso
      throw err; 
    });

  // TODO: Aquí inyectaremos el CancellationToken, los prompts de Inquirer
  // y llamaremos al compilador core.

  program.parse();
}

bootstrap().catch((error) => {
  // Reemplazaremos esto con tu renderizador de UI (picocolors)
  // console.error(theme.error(`Error fatal: ${error.message}`));
  process.stderr.write(`Error fatal: ${error.message}\n`);
  process.exit(1);
});