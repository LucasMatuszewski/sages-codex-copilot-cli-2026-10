import type { ApiError } from '../../../shared/common.js'

export class IntakeError extends Error {
  constructor(readonly status: 400 | 404 | 409, readonly body: ApiError) {
    super(body.message)
    this.name = 'IntakeError'
  }
}
