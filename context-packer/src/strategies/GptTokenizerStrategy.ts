import type { TokenizerStrategy } from './Tokenizer.interface';
import type { Tiktoken, TiktokenEncoding } from 'tiktoken'; // Importación segura (solo tipos)

export class GptTokenizerStrategy implements TokenizerStrategy {
private encoder: Tiktoken | null = null;
private readonly modelName: string;
private readonly contextLimit: number;
private readonly encodingName: TiktokenEncoding;

/**
   * Por defecto usa GPT-4o y su codificador optimizado.
   */
constructor(
    modelName: string = 'gpt-4o',
    contextLimit: number = 128000,
    encodingName: TiktokenEncoding = 'o200k_base'
) {
    this.modelName = modelName;
    this.contextLimit = contextLimit;
    this.encodingName = encodingName;
}

getModelName(): string {
    return this.modelName;
}

getContextLimit(): number {
    return this.contextLimit;
}

async initialize(): Promise<void> {
    // Lazy Loading: Solo requerimos la dependencia si se activa la estrategia
    if (!this.encoder) {
        const { get_encoding } = await import('tiktoken');
        this.encoder = get_encoding(this.encodingName);
    }
}

estimateTokensFromBytes(bytes: number): number {
    // Heurística rápida: 1 token ≈ 4 bytes en texto en inglés/código
    return Math.ceil(bytes / 4);
}

countTokensExact(text: string): number {
    if (!this.encoder) {
        throw new Error(`[${this.modelName}] La estrategia no ha sido inicializada. Llama a initialize() primero.`);
    }
    return this.encoder.encode(text).length;
}

destroy(): void {
    if (this.encoder) {
        try {
        this.encoder.free(); // CRÍTICO: Previene el Memory Leak del WASM
    } catch (error) {
        // Tragar el error silenciosamente si el WASM ya estaba corrupto/liberado
    } finally {
        this.encoder = null;
    }
    }
}
}