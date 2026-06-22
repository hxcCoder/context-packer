import type { TokenizerStrategy } from './Tokenizer.interface';

export class HeuristicTokenizerStrategy implements TokenizerStrategy {
    private readonly modelName: string;
    private readonly contextLimit: number;
    private readonly bytesPerToken: number;
/**
   * Por defecto configurado para DeepSeek Coder V2.
   * Puede ser instanciado con otros valores para Claude, Llama, etc.
   */
constructor(
    modelName: string = 'deepseek-coder',
    contextLimit: number = 128000,
    bytesPerToken: number = 3.5
) {
    this.modelName = modelName;
    this.contextLimit = contextLimit;
    this.bytesPerToken = bytesPerToken;
}

getModelName(): string {
    return this.modelName;
}

getContextLimit(): number {
    return this.contextLimit;
}

async initialize(): Promise<void> {
    // No requiere carga de WASM ni dependencias pesadas
    return Promise.resolve();
}

estimateTokensFromBytes(bytes: number): number {
    return Math.ceil(bytes / this.bytesPerToken);
}

countTokensExact(text: string): number {
    // En texto crudo (asumiendo UTF-8 estándar), la longitud del string
    // es un proxy razonable para nuestra heurística segura.
    return Math.ceil(text.length / this.bytesPerToken);
}

destroy(): void {
    // Nada que liberar de la memoria
    }
}