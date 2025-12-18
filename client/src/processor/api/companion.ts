export type CompanionMode = 'action' | 'chat' | 'autonomous'

export interface CompanionRequest {
  mode: CompanionMode
  action?: string
  text?: string
  threadId?: string
  voiceId: string
  rules: string[]
  tweaks?: string
}

export interface CompanionResponse {
  text: string
  auditFlags?: string[]
}

export async function callCompanion(req: CompanionRequest): Promise<CompanionResponse> {
  const res = await fetch('/api/companion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Companion request failed (${res.status}): ${body || 'Unknown error'}`)
  }
  const data = (await res.json()) as CompanionResponse
  return data
}
