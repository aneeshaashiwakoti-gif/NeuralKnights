import type { ServiceErrorCode } from './types';

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly userMessage: string;

  constructor(code: ServiceErrorCode, userMessage: string, detail?: string) {
    super(detail ?? userMessage);
    this.name = 'ServiceError';
    this.code = code;
    this.userMessage = userMessage;
  }
}

export function isServiceError(err: unknown): err is ServiceError {
  return err instanceof ServiceError;
}

/** Human-readable message for any thrown value. Never includes tokens or stack traces. */
export function describeError(err: unknown): string {
  if (isServiceError(err)) return err.userMessage;
  return 'An unexpected error occurred. No changes were recorded. Please try again.';
}
