# North Star Architecture: ContextPacker CLI (Definitive Master Edition)

## 1. Objetivo del Proyecto

Construir una herramienta de línea de comandos en Node.js/TypeScript que actúe como un pipeline ETL avanzado para transformar repositorios completos en mapas de contexto estructurados y tokenizados para LLMs.

La arquitectura prioriza:

* Seguridad de memoria mediante Streams.
* Extensibilidad absoluta mediante el patrón Strategy.
* Integridad de datos mediante operaciones atómicas.
* Separación estricta de responsabilidades.
* Experiencia profesional de línea de comandos.

---

# 2. Principios de Ingeniería Base

## Zero-RAM Collapse (Streams)

Queda prohibido cargar archivos completos en memoria.

Todo procesamiento de contenido debe realizarse mediante:

* `ReadableStream`
* `TransformStream`
* `WritableStream`

El sistema debe mantener un consumo de memoria estable independientemente del tamaño total del repositorio.

---

## Separación de Responsabilidades (SRP)

### Transformación vs. Formateo

Los Writers únicamente estructuran el formato de salida.

Ejemplos:

* XML
* JSON
* Markdown

La transformación de datos:

* Escape XML
* Sanitización
* Normalización de saltos de línea
* Limpieza de contenido

debe realizarse exclusivamente mediante Transform Streams dentro del pipeline.

---

### Orquestación vs. I/O

La gestión del sistema de archivos está completamente desacoplada de la lógica de ensamblaje.

#### atomicFileManager

Responsable de:

* Crear archivos temporales
* Eliminar temporales
* Renombramientos atómicos
* Confirmación final del resultado

#### contextPipeline

Responsable de:

* Encadenar Streams
* Procesar archivos
* Aplicar transformaciones
* Entregar datos al Writer

---

## Agnosticismo de Modelos y Formatos

El Core no depende de un proveedor de IA específico.

La estimación de tokens se inyecta mediante:

```ts
TokenizerStrategy
```

El formato de salida se inyecta mediante:

```ts
ContextWriter
```

Esto permite soportar:

* GPT
* Gemini
* Claude
* DeepSeek
* Modelos futuros

sin modificar el núcleo del sistema.

---

## Control de Flujo Tipado (Graceful Shutdown)

El sistema intercepta señales del sistema operativo:

```txt
SIGINT (CTRL+C)
```

Cuando ocurre una cancelación:

1. El token marca el proceso como cancelado.
2. Se lanza una instancia de `CancellationError`.
3. El pipeline se detiene inmediatamente.
4. El archivo temporal se elimina.
5. La CLI informa una cancelación controlada.

Esto permite diferenciar:

* Cancelaciones del usuario.
* Errores reales de programación.

---

## Telemetría Desacoplada

El Core jamás escribe en consola.

Toda la información de ejecución se devuelve mediante:

```ts
CompilationResult
```

La CLI decide:

* Cómo renderizar métricas.
* Cómo mostrar errores.
* Cómo presentar estadísticas.

---

# 3. Topología del Proyecto

```text
context-packer/
├── bin/
│   └── cli.js
│
├── src/
│   ├── cli/
│   │   ├── prompt.ts
│   │   └── formatter.ts
│   │
│   ├── core/
│   │   ├── scanner.ts
│   │   ├── atomicFileManager.ts
│   │   ├── contextPipeline.ts
│   │   └── compiler.ts
│   │
│   ├── strategies/
│   │   ├── Tokenizer.interface.ts
│   │   ├── GPTTokenizer.ts
│   │   ├── ContextWriter.interface.ts
│   │   └── XmlWriter.ts
│   │
│   └── utils/
│       ├── config.ts
│       ├── cancelToken.ts
│       └── streamTransformers.ts
│
├── .gitignore
├── tsconfig.json
└── package.json
```

---

# 4. Pipeline de Ejecución

## Fase 1 — Inicialización e Inyección (CLI)

La CLI:

* Captura la ejecución del comando.
* Registra `SIGINT`.
* Inicializa `CancellationToken`.
* Instancia las estrategias.
* Inyecta dependencias al `Compiler`.

Ejemplo:

```ts
new Compiler(
  tokenizer,
  writer,
  cancellationToken
);
```

---

## Fase 2 — Escaneo Rápido (Core)

`scanner.ts`:

* Descubre archivos mediante `fast-glob`.
* Respeta `.gitignore`.
* Ignora binarios configurados.
* Obtiene tamaño en bytes.

La estimación se realiza sin leer contenido:

```ts
tokenizer.estimateTokensFromBytes(
  fileSize
);
```

---

## Fase 3 — Presupuesto Interactivo (CLI)

Si el presupuesto supera el límite del modelo:

1. Se pausa la ejecución.
2. Se abre un menú interactivo.
3. El usuario excluye directorios.
4. Se recalcula el presupuesto.

---

## Fase 4 — Transformación y Escritura (Core)

### Inicialización

```txt
atomicFileManager.createTempFile()
```

Genera:

```txt
.contexto-ia.tmp
```

### Procesamiento

```text
ReadStream
    ↓
TransformStream
    ↓
TransformStream
    ↓
ContextWriter
```

Ejemplos de transformaciones:

* escapeXmlStream
* trimWhitespaceStream
* normalizeLineEndingsStream

Durante el procesamiento:

```ts
token.throwIfCancelled();
```

Si se produce una cancelación:

```txt
CancellationError
        ↓
cleanup()
        ↓
Abortar ejecución
```

### Finalización

Si todo termina correctamente:

```txt
Writer.finalize()
        ↓
atomicFileManager.commit()
        ↓
contexto-ia.txt
```

---

## Fase 5 — Reporte Final (CLI)

El Compiler devuelve:

```ts
CompilationResult
```

La CLI decide:

### Cancelación

```txt
Proceso cancelado por el usuario.
```

Código de salida:

```txt
0
```

### Error real

Se muestra el stack trace.

### Éxito

Se renderiza:

* Archivos procesados
* Bytes procesados
* Tokens estimados
* Tiempo total
* Ruta del archivo generado

---

# 5. Contratos Arquitectónicos

## A. Resultados y Cancelación

```ts
export interface CompilationReport {
  filesProcessed: number;
  bytesProcessed: number;
  estimatedTokens: number;
  durationMs: number;
  outputFile: string;
}

export interface CompilationResult {
  success: boolean;
  report?: CompilationReport;
  error?: Error;
}
```

```ts
export class CancellationError extends Error {
  constructor() {
    super("Proceso cancelado por el usuario.");
    this.name = "CancellationError";
  }
}

export interface CancellationToken {
  isCancelled(): boolean;
  throwIfCancelled(): void;
}
```

---

## B. Estrategia de Tokenización

```ts
export interface TokenizerStrategy {
  estimateTokensFromBytes(
    bytes: number
  ): number;

  getContextLimit(): number;

  getModelName(): string;
}
```

---

## C. Estrategia de Escritura

```ts
export interface ContextWriter {
  writeHeader(
    treeMap: string
  ): Promise<void>;

  writeFileBlock(
    filePath: string,
    transformedStream: NodeJS.ReadableStream
  ): Promise<void>;

  finalize(): Promise<void>;
}
```

---

# Regla Suprema

Toda nueva funcionalidad debe respetar estos contratos.

Si una implementación requiere modificar estos principios para funcionar, la implementación debe reconsiderarse antes de ser aceptada en el proyecto.
