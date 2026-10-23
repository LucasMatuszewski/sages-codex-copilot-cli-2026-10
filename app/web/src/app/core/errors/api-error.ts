import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorSchema, type FieldError, type Revision, type UUID } from '../../../../../shared/common';

export type ApiClientErrorKind = 'api' | 'network' | 'unexpected';

export class ApiClientError extends Error {
  readonly kind: ApiClientErrorKind;
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: readonly FieldError[];
  readonly retryable: boolean;
  readonly currentRevision: Revision | undefined;
  readonly existingResourceId: UUID | undefined;
  readonly recovery: 'none' | 'reload-current';

  constructor(details: {
    kind: ApiClientErrorKind;
    status: number;
    code: string;
    fieldErrors: readonly FieldError[];
    retryable: boolean;
    currentRevision?: Revision;
    existingResourceId?: UUID;
    recovery: 'none' | 'reload-current';
    message: string;
  }) {
    super(details.message);
    this.name = 'ApiClientError';
    this.kind = details.kind;
    this.status = details.status;
    this.code = details.code;
    this.fieldErrors = details.fieldErrors;
    this.retryable = details.retryable;
    this.currentRevision = details.currentRevision;
    this.existingResourceId = details.existingResourceId;
    this.recovery = details.recovery;
  }
}

export function mapApiError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error;

  const status = error instanceof HttpErrorResponse ? error.status : 0;
  if (error instanceof HttpErrorResponse && status === 0) {
    return new ApiClientError({
      kind: 'network', status, code: 'NETWORK_ERROR', fieldErrors: [], retryable: true,
      recovery: 'none', message: 'Nie udało się połączyć z usługą. Sprawdź połączenie i spróbuj ponownie.',
    });
  }

  if (error instanceof HttpErrorResponse) {
    const parsed = ApiErrorSchema.safeParse(error.error);
    if (parsed.success) {
      const apiError = parsed.data;
      return new ApiClientError({
        kind: 'api',
        status,
        code: apiError.code,
        fieldErrors: apiError.fieldErrors,
        retryable: apiError.retryable,
        currentRevision: apiError.currentRevision,
        existingResourceId: apiError.existingResourceId,
        recovery: status === 409 && apiError.code === 'STALE_REVISION' ? 'reload-current' : 'none',
        message: apiError.message,
      });
    }
  }

  return new ApiClientError({
    kind: 'unexpected', status, code: 'UNEXPECTED_ERROR', fieldErrors: [], retryable: false,
    recovery: 'none', message: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.',
  });
}
