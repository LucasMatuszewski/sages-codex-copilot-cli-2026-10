import { Router } from 'express'
import type { FindingsUnitOfWork } from '../application/ports/findings-store.js'
import { updateDetectionEvent } from '../application/review/event-update.js'
import { ReviewError } from '../application/review/errors.js'

export function eventRouter(unitOfWork: FindingsUnitOfWork) {
  const router = Router()
  router.patch('/:id', async (req, res, next) => {
    try { res.status(200).json(await updateDetectionEvent(unitOfWork, req.params.id, req.body)) }
    catch (error) {
      if (error instanceof ReviewError) res.status(error.status).json(error.body)
      else next(error)
    }
  })
  return router
}
