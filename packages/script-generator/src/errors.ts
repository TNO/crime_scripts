export class GeneratorError extends Error {
  readonly code: string;
  readonly path?: string;
  readonly details?: unknown;

  constructor(code: string, message: string, path?: string, details?: unknown) {
    super(message);
    this.name = 'GeneratorError';
    this.code = code;
    this.path = path;
    this.details = details;
  }
}

export const exitCodeForErrorCode = (code: string): number =>
  code === 'output-exists' ? 5
    : code.includes('conversion') || code === 'docling-unavailable' ? 6
      : code.includes('confirmation') ? 7
        : code === 'prepare-required' || code === 'target-script-changed' ? 4
          : 3;
