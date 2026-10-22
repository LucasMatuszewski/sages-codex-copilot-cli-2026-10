import { Router } from 'express'
import type { FindingsUnitOfWork } from '../application/ports/findings-store.js'

export function healthRouter(unitOfWork: FindingsUnitOfWork) {
  const router = Router()
  router.get('/', async (_req, res) => {
    await unitOfWork.run(async () => undefined)
    res.status(200).json({ status: 'ok' })
  })
  return router
}
