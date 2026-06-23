#!/usr/bin/env node
import process from 'node:process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { select, input } from '@inquirer/prompts'; // <-- Añadido "input"

import { theme } from './ui/theme';
import { ProcessCancellationToken, CancellationError } from './utils/cancelToken';
import { IgnoreFactory } from './core/ignoreFactory';
import { RepoScanner } from './core/scanner';
import { AtomicFileManager } from './core/atomicFileManager';
import { ContextCompiler } from './core/compiler';

// Estrategias de lectura (Tokenizers)
import { GeminiTokenizerStrategy } from './strategies/GeminiTokenizerStrategy';
import { HeuristicTokenizerStrategy } from './strategies/HeuristicTokenizerStrategy';
import { GptTokenizerStrategy } from './strategies/GptTokenizerStrategy';

// Estrategia de escritura (Writer)
import { XmlWriter } from './strategies/XmlWriter';

/**
 * NUEVO: Función segura para inyectar la versión del package.json en la UI
 */
function getVersion(): string {
	try {
		// Lee el package.json asumiendo que este script se compila dentro de la carpeta 'dist/'
		const pkgPath = join(__dirname, '..', 'package.json');
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
		return pkg.version || '1.x.x';
	} catch (error) {
		return '1.x.x'; // Fallback seguro en caso de que cambies las rutas
	}
}

async function main(): Promise<void> {
	// 1. Mostrar banner de bienvenida premium
	theme.printBanner();
	
	// Imprimir la versión actual dinámicamente debajo del banner
	process.stdout.write(` ${theme.color.muted(`v${getVersion()} - By Benjamin Millalonco`)}\n\n`);

	// 2. Activar el guardián de cancelaciones global (SIGINT/SIGTERM)
	const token = new ProcessCancellationToken();

	try {
		// 3. Menú interactivo para seleccionar la estrategia de optimización de tokens
		const modelChoice = await select({
			message: `${theme.icon.arrow} Selecciona el modelo de IA donde pegarás el contexto:`,
			choices: [
				{
					name: 'Gemini 1.5 Pro / Flash (Google AI Studio - Optimización Local)',
					value: 'gemini',
					description: 'Límite: 2M tokens. Heurística de bytes ultra-rápida y precisa.',
				},
				{
					name: 'DeepSeek Coder V2 (Heurística Matemática Conservadora)',
					value: 'deepseek',
					description: 'Límite: 128K tokens. Factor seguro de 3.5 bytes/token.',
				},
				{
					name: 'OpenAI GPT-4o / o1 (Conteo Exacto con Tiktoken WASM)',
					value: 'gpt',
					description: 'Límite: 128K tokens. Carga perezosa del codificador o200k_base.',
				},
			],
		});

		// NUEVO 4. Solicitar filtro de extensiones (Whitelist)
		const extensionsInput = await input({
			message: `${theme.icon.arrow} ¿Filtrar por extensión? (Ej: "ts, html" o presiona ENTER para todo el proyecto):`,
		});

		// 5. Factoría dinámica de la estrategia del Tokenizer
		let tokenizer;
		switch (modelChoice) {
			case 'gemini':
				tokenizer = new GeminiTokenizerStrategy();
				break;
			case 'deepseek':
				tokenizer = new HeuristicTokenizerStrategy('deepseek-coder', 128000, 3.5);
				break;
			case 'gpt':
				tokenizer = new GptTokenizerStrategy();
				break;
			default:
				throw new Error('Estrategia de modelo no soportada.');
		}

		const rootDir = process.cwd();
		process.stdout.write(`\n${theme.icon.info} Analizando espacio de trabajo y reglas de exclusión...\n`);

		// 6. Inicializar la infraestructura del Core mediante Inyección de Dependencias
		const ignoreFilter = await IgnoreFactory.create(rootDir);
		const scanner = new RepoScanner(rootDir, ignoreFilter);
		
		// NUEVO 7. Aplicar el filtro de usuario al motor del escáner
		scanner.setExtensionFilter(extensionsInput);

		const fileManager = new AtomicFileManager('contexto-ia.txt', '.contexto-ia.tmp');
		const writer = new XmlWriter();

		const compiler = new ContextCompiler(rootDir, scanner, fileManager, tokenizer, writer);

		process.stdout.write(`${theme.icon.info} Procesando archivos en modo reactivo. Compilando...\n`);

		// 8. Ejecutar el pipeline ETL masivo protegiendo la RAM
		const metrics = await compiler.compile(token);

		// 9. Imprimir la tarjeta de telemetría final con el éxito del proceso
		process.stdout.write(theme.formatMetrics(metrics));

	} catch (error: any) {
		// 10. Captura de errores especializada
		if (error instanceof CancellationError) {
			process.stdout.write(`\n${theme.icon.warn} ${theme.color.warn('Operación abortada de forma segura por el usuario.')}\n`);
			process.stdout.write(` ${theme.color.muted('El archivo temporal fue eliminado. Tu espacio de trabajo está limpio.')}\n\n`);
			process.exit(0);
		}

		// Errores inesperados del sistema
		process.stderr.write(`\n${theme.icon.error} ${theme.color.error('ERROR CRÍTICO EN EL PIPELINE:')}\n`);
		process.stderr.write(` ${error.message || error}\n\n`);
		process.exit(1);
	}
}

// Arrancar la CLI de grado de ingeniería
main();