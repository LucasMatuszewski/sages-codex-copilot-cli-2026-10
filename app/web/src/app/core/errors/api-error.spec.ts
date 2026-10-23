import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorSchema } from '../../../../../shared/common';
import { ApiClientError, mapApiError } from './api-error';

const conflictBody = ApiErrorSchema.parse({
  code: 'STALE_REVISION',
  message: 'Zmieniono rekord.',
  fieldErrors: [],
  retryable: false,
  currentRevision: 7,
});

describe('mapApiError', () => {
  it('preserves a valid direct API error body and marks only stale revisions for reload', () => {
    const mapped = mapApiError(new HttpErrorResponse({ status: 409, error: conflictBody }));

    expect(mapped.kind).toBe('api');
    expect(mapped.status).toBe(409);
    expect(mapped.code).toBe('STALE_REVISION');
    expect(mapped.message).toBe('Zmieniono rekord.');
    expect(mapped.currentRevision).toBe(7);
    expect(mapped.recovery).toBe('reload-current');
  });

  it('is idempotent for an already mapped error', () => {
    const mapped = mapApiError(new HttpErrorResponse({ status: 409, error: conflictBody }));
    expect(mapApiError(mapped)).toBe(mapped);
  });

  it('keeps other conflict field errors for feature-specific recovery', () => {
    const mapped = mapApiError(new HttpErrorResponse({
      status: 409,
      error: {
        code: 'INVALID_STATUS_TRANSITION',
        message: 'Nie można zmienić statusu.',
        fieldErrors: [{ path: 'status', code: 'TRANSITION_NOT_ALLOWED', message: 'Wybierz dostępny status.' }],
        retryable: false,
      },
    }));

    expect(mapped.recovery).toBe('none');
    expect(mapped.fieldErrors).toHaveLength(1);
    expect(mapped.fieldErrors[0]?.path).toBe('status');
  });

  it('retains strict UUID metadata and retryable service metadata', () => {
    const mapped = mapApiError(new HttpErrorResponse({
      status: 503,
      error: {
        code: 'SERVICE_UNAVAILABLE', message: 'Usługa niedostępna.', fieldErrors: [], retryable: true,
        existingResourceId: '123e4567-e89b-42d3-a456-426614174000',
      },
    }));
    expect(mapped.status).toBe(503);
    expect(mapped.retryable).toBe(true);
    expect(mapped.existingResourceId).toBe('123e4567-e89b-42d3-a456-426614174000');
  });

  it('uses safe Polish fallback text for malformed and HTML error bodies', () => {
    for (const body of ['<script>alert(1)</script>', { message: 'stack: private details' }, null]) {
      const malformed = body === '<script>alert(1)</script>'
        ? { ...conflictBody, message: body, fieldErrors: null }
        : body === null
          ? null
          : { ...conflictBody, message: 'stack: private details', fieldErrors: null };
      const mapped = mapApiError(new HttpErrorResponse({ status: 502, error: malformed }));
      expect(mapped.kind).toBe('unexpected');
      expect(mapped.status).toBe(502);
      expect(mapped.message).not.toContain('<script>');
      expect(mapped.message).not.toContain('private details');
    }
  });

  it('labels status zero as a retryable network failure', () => {
    const mapped = mapApiError(new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }));
    expect(mapped.kind).toBe('network');
    expect(mapped.status).toBe(0);
    expect(mapped.retryable).toBe(true);
    expect(mapped.message).toMatch(/połączen|sieci/i);
    expect(mapped).toBeInstanceOf(ApiClientError);
  });
});
