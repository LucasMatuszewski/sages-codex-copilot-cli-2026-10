import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { z } from 'zod';
import { mapApiError } from '../errors/api-error';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ApiRequest = { method: ApiMethod; path: `/api/v1/${string}`; body?: unknown };

@Injectable({ providedIn: 'root' })
export class ApiClient {
  constructor(private readonly http: HttpClient) {}

  request<S extends z.ZodType>(schema: S, request: ApiRequest): Observable<z.output<S>> {
    if (!isAllowedApiPath(request.path)) {
      throw mapApiError(new Error('Nieprawidłowa ścieżka API.'));
    }

    return this.http.request<unknown>(request.method, request.path, {
      body: request.body,
      observe: 'response',
    }).pipe(
      map((response) => {
        const parsed = schema.safeParse(response.body);
        if (!parsed.success) {
          throw mapApiError(new HttpErrorResponse({
            status: response.status,
            statusText: response.statusText,
            error: parsed.error,
          }));
        }
        return parsed.data;
      }),
      catchError((error: unknown) => throwError(() => mapApiError(error))),
    );
  }
}

function isAllowedApiPath(path: string): boolean {
  if (!path.startsWith('/api/v1/') || path.startsWith('//') || path.includes('#')) {
    return false;
  }

  const queryStart = path.indexOf('?');
  const rawPathname = queryStart < 0 ? path : path.slice(0, queryStart);
  if (rawPathname.includes('\\') || /%5c/i.test(rawPathname)) return false;
  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(rawPathname);
  } catch {
    return false;
  }

  if (decodedPathname.includes('\\')) return false;
  try {
    const resolved = new URL(decodedPathname, 'http://cra-api.invalid');
    return resolved.origin === 'http://cra-api.invalid' && resolved.pathname.startsWith('/api/v1/');
  } catch {
    return false;
  }
}
