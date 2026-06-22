/**
 * Contrato inmutable para cualquier modelo de IA.
 * Ninguna estrategia debe romper esta interfaz.
 */
export interface TokenizerStrategy {
/**
   * Identificador legible del modelo (ej. 'gpt-4o', 'deepseek-coder')
   */
getModelName(): string;

/**
   * Límite de contexto seguro recomendado para este modelo.
   */
getContextLimit(): number;

/**
   * Ciclo de vida: Carga dependencias pesadas (ej. WASM de tiktoken) dinámicamente.
   */
initialize(): Promise<void>;

/**
   * Heurística rápida: Estima tokens basados en bytes para el fast-glob.
   * Node: No bloquea el Event Loop.
   */
estimateTokensFromBytes(bytes: number): number;

/**
   * Conteo exacto: Retorna la cantidad de tokens desde un string.
   * Si el modelo no soporta conteo exacto local, retorna una estimación segura.
   */
countTokensExact(text: string): number;

/**
   * Ciclo de vida: Libera memoria y previene Memory Leaks (vital para WASM).
   */
destroy(): void;
}