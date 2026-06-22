import process from 'node:process';
/**
 * Error tipado para diferenciar una cancelación intencional de un fallo (bug) del sistema.
 */
export class CancellationError extends Error {
    constructor(message = "Proceso cancelado por el usuario.") {
    super(message);
    this.name = "CancellationError";
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, CancellationError);
    }
}
}

/**
 * Contrato inmutable para el control de flujo y cancelación.
 */
export interface CancellationToken {
    isCancelled(): boolean;
    throwIfCancelled(): void;
    getSignal(): AbortSignal;
}

/**
 * Implementación concreta vinculada a los eventos de proceso de Node.js (SIGINT / SIGTERM).
 */
export class ProcessCancellationToken implements CancellationToken {
    private cancelled: boolean = false;
    private cancelCount: number = 0;
    private readonly abortController: AbortController;

constructor() {
    this.abortController = new AbortController();
    this.registerSignalHandlers();
}

private registerSignalHandlers(): void {
    const handleSignal = (): void => {
        this.cancelCount++;
        
      // Patrón "Double Tap": Si el usuario presiona CTRL+C dos veces, matamos el proceso inmediatamente sin piedad
    if (this.cancelCount >= 2) {
        process.stderr.write('\n[!] Salida forzada por el usuario. Abortando de inmediato.\n');
        process.exit(1);
    }

        process.stdout.write('\n[!] Cancelando de forma segura... (Presiona CTRL+C otra vez para forzar salida)\n');
        this.cancel();
    };

    // Escuchamos las señales estándar del sistema operativo
    process.on('SIGINT', handleSignal);  // CTRL+C en terminal
    process.on('SIGTERM', handleSignal); // Terminación desde Docker, PM2, etc.
}

private cancel(): void {
    if (this.cancelled) return;
    
    this.cancelled = true;
    // Dispara el evento de aborto nativo que detiene los streams de lectura/escritura de fs automáticamente
    this.abortController.abort(new CancellationError());
}

public isCancelled(): boolean {
    return this.cancelled;
}

public throwIfCancelled(): void {
    if (this.cancelled) {
        throw new CancellationError();
    }
}

/**
   * Retorna la señal nativa para inyectar en las opciones de fs.createReadStream y fs.createWriteStream
   */
public getSignal(): AbortSignal {
    return this.abortController.signal;
}
}
/**
 * Error tipado para diferenciar una cancelación intencional de un fallo (bug) del sistema.
 */
// ... (tu código se mantiene exactamente igual a partir de aquí)