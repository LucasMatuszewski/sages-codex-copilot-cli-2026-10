import { Router } from 'express'
import type { FindingsUnitOfWork } from '../application/ports/findings-store.js'
import { queryRegister, RegisterQueryError } from '../application/register-query.js'

export function registerRouter(unitOfWork: FindingsUnitOfWork) {
  const router = Router()
  router.get('/', async (req, res, next) => {
    try { res.status(200).json(await queryRegister(unitOfWork, req.query)) }
    catch (error) {
      if (error instanceof RegisterQueryError) res.status(400).json(error.body)
      else next(error)
    }
  })
  return router
}
