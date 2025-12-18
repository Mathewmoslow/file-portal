import { banList, clicheChecks } from './rules'

export interface AuditResult {
  passed: boolean
  flags: string[]
}

export function auditText(text: string, opts?: { full?: boolean }): AuditResult {
  const flags: string[] = []

  banList.forEach((term) => {
    if (text.toLowerCase().includes(term)) {
      flags.push(`Contains banned term: "${term}"`)
    }
  })

  if (opts?.full) {
    clicheChecks.forEach((term) => {
      if (text.toLowerCase().includes(term)) {
        flags.push(`Contains cliché: "${term}"`)
      }
    })
  }

  return {
    passed: flags.length === 0,
    flags,
  }
}
