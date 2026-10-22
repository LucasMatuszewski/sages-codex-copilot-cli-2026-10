import { Router } from 'express'
import type { FindingsUnitOfWork } from '../application/ports/findings-store.js'
import { intakeFinding } from '../application/intake/command.js'
import { IntakeError } from '../application/intake/errors.js'

export function findingsRouter(unitOfWork: FindingsUnitOfWork) {
  const router = Router()
  router.post('/', async (req, res, next) => {
    try {
      const result = await intakeFinding(unitOfWork, req.body)
      res.status(result.eventOutcome === 'created' ? 201 : 200).json(result)
    } catch (error) {
      if (error instanceof IntakeError) res.status(error.status).json(error.body)
      else next(error)
    }
  })
  return router
}
