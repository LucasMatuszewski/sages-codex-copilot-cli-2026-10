import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { RegisterQueryResultSchema, RegisterQuerySchema, type RegisterQuery, type RegisterQueryResult } from '../../../../../shared/register-contracts.js'
import { ApiClient } from '../../core/http/api-client'

const queryFields: readonly (keyof RegisterQuery)[] = [
  'q', 'tag', 'product', 'client', 'status', 'eventStatus', 'severity', 'category', 'detectedFrom', 'detectedTo',
]

@Injectable({ providedIn: 'root' })
export class RegisterDataService {
  constructor(private readonly apiClient: ApiClient) {}

  load(query: RegisterQuery): Observable<RegisterQueryResult> {
    const normalizedQuery = RegisterQuerySchema.parse(query)
    const params = new URLSearchParams()
    for (const field of queryFields) {
      const value = normalizedQuery[field]
      if (value !== undefined) params.set(field, value)
    }

    const serializedQuery = params.toString()
    const suffix = serializedQuery ? `?${serializedQuery}` : ''
    return this.apiClient.request(RegisterQueryResultSchema, {
      method: 'GET',
      path: `/api/v1/vulnerabilities${suffix}` as `/api/v1/${string}`,
    })
  }
}
