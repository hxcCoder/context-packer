import { Buffer } from 'node:buffer';
import type { TokenizerStrategy } from './Tokenizer.interface';

export class GeminiTokenizerStrategy implements TokenizerStrategy {
  // Usamos readonly para garantizar la inmutabilidad de la configuración
    private readonly modelName: string;
    private readonly contextLimit: number;
    private readonly bytesPerToken: number;

/**
   * Gemini 1.5 Pro soporta hasta 2M de tokens.
   * Usamos una heurística segura: 1 token ≈ 4 bytes.
   */
constructor(
    modelName: string = 'gemini-1.5-pro',
    contextLimit: number = 2_097_152, // Separadores numéricos (_) para legibilidad
    bytesPerToken: number = 4
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
    // 100% offline y heurístico. Resolución asíncrona inmediata.
    return Promise.resolve();
}

estimateTokensFromBytes(bytes: number): number {
    return Math.ceil(bytes / this.bytesPerToken);
}

countTokensExact(text: string): number {
    // PERFECCIONAMIENTO: text.length falla con emojis o caracteres UTF-8 de múltiples bytes.
    // Usar Buffer.byteLength garantiza que nuestra heurística de bytes no se rompa
    // silenciosamente al leer código fuente con comentarios en español o caracteres raros.
    const actualBytes = Buffer.byteLength(text, 'utf8');
    return Math.ceil(actualBytes / this.bytesPerToken);
}

destroy(): void {
    // Arquitectura limpia: Sin estado pesado en memoria que liberar
}
}