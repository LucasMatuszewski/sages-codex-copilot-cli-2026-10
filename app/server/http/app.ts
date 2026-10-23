import express from 'express'
import type { Router } from 'express'
import type { RequestHandler } from 'express'
import type { FindingsUnitOfWork } from '../application/ports/findings-store.js'
import { errorMiddleware, guardedJsonParser } from './error-middleware.js'
import { healthRouter } from './health.js'
import { findingsRouter } from './findings-routes.js'
import { vulnerabilityDetailRouter } from './vulnerability-detail-routes.js'

function jsonTransportGuards(): RequestHandler {
  return (req, res, next) => {
    if (!req.path.startsWith('/api/') || !['POST', 'PUT', 'PATCH'].includes(req.method)) return next()

    const contentType = req.header('content-type')
    if (!contentType) return res.status(415).json(transportError('UNSUPPORTED_MEDIA_TYPE', 'Wymagany jest format application/json.'))
    const [rawMediaType = '', ...parameters] = contentType.split(';').map((part) => part.trim())
    if (rawMediaType.toLowerCase() !== 'application/json') {
      return res.status(415).json(transportError('UNSUPPORTED_MEDIA_TYPE', 'Wymagany jest format application/json.'))
    }
    const charset = parameters.find((parameter) => /^charset\s*=/i.test(parameter))
    if (charset && !/^charset\s*=\s*["']?(?:utf-8|utf8)["']?$/i.test(charset)) {
      return res.status(415).json(transportError('UNSUPPORTED_MEDIA_TYPE', 'Obsługiwane jest kodowanie UTF-8.'))
    }
    const encoding = req.header('content-encoding')?.trim().toLowerCase()
    if (encoding && !['identity', 'gzip', 'deflate', 'br'].includes(encoding)) {
      return res.status(415).json(transportError('UNSUPPORTED_MEDIA_TYPE', 'Kodowanie treści nie jest obsługiwane.'))
    }
    next()
  }
}

function transportError(code: string, message: string) {
  return { code, message, fieldErrors: [], retryable: false }
}

export function createHttpApp(unitOfWork: FindingsUnitOfWork, testRoutes?: Router) {
  const app = express()
  app.disable('x-powered-by')
  app.use(jsonTransportGuards())
  app.use(guardedJsonParser(express.json({ limit: 1_048_576, strict: true })))
  app.use('/api/v1/health', healthRouter(unitOfWork))
  app.use('/api/v1/findings', findingsRouter(unitOfWork))
  app.use('/api/v1/vulnerabilities', vulnerabilityDetailRouter(unitOfWork))
  if (testRoutes) app.use(testRoutes)
  app.use('/api', (_req, res) => {
    res.status(404).json(transportError('NOT_FOUND', 'Nie znaleziono wskazanego zasobu.'))
  })
  app.use(errorMiddleware)
  return app
}
