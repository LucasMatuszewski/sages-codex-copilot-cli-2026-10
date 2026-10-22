import type { ErrorRequestHandler, RequestHandler } from 'express'
import { PersistenceUnavailableError } from '../application/ports/findings-store.js'

export class JsonBodyParserError extends Error {
  constructor(readonly originalError: unknown) {
    super('JSON body parser rejected the request.')
    this.name = 'JsonBodyParserError'
  }
}

export function guardedJsonParser(parser: RequestHandler): RequestHandler {
  return (req, res, next) => parser(req, res, (error?: unknown) => {
    if (error) next(new JsonBodyParserError(error))
    else next()
  })
}

function safeError(code: string, message: string, retryable = false) {
  return { code, message, fieldErrors: [], retryable }
}

function parserErrorType(error: unknown): unknown {
  if (typeof error !== 'object' || error === null) return undefined
  return 'type' in error ? (error as { type?: unknown }).type : undefined
}

function parserErrorCode(error: unknown): unknown {
  if (typeof error !== 'object' || error === null) return undefined
  return 'code' in error ? (error as { code?: unknown }).code : undefined
}

export const errorMiddleware: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof PersistenceUnavailableError) {
    res.status(503).json(safeError('STORAGE_UNAVAILABLE', 'Magazyn danych jest chwilowo niedostępny.', true))
    return
  }

  if (error instanceof JsonBodyParserError) {
    const cause = error.originalError
    const type = parserErrorType(cause)
    if (type === 'entity.too.large') {
      res.status(413).json(safeError('PAYLOAD_TOO_LARGE', 'Treść żądania przekracza dozwolony rozmiar.'))
      return
    }
    if (type === 'entity.parse.failed' || type === 'encoding.invalid' || ['Z_DATA_ERROR', 'Z_BUF_ERROR'].includes(String(parserErrorCode(cause)))) {
      res.status(400).json(safeError('INVALID_JSON', 'Treść żądania zawiera niepoprawny JSON.'))
      return
    }
    if (type === 'charset.unsupported' || type === 'encoding.unsupported') {
      res.status(415).json(safeError('UNSUPPORTED_MEDIA_TYPE', 'Format lub kodowanie treści nie jest obsługiwane.'))
      return
    }
  }

  res.status(500).json(safeError('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd serwera.'))
}
