export interface VoiceProfile {
  id: string
  name: string
  summary: string
  prompt: string
}

export const voicePresets: VoiceProfile[] = [
  {
    id: 'mathew-master',
    name: 'Mathew Master',
    summary: 'Primary voice profile drawn from style + rules docs.',
    prompt:
      'Use Mathew Moslow master voice. Preserve cadence, directness, and ban-listed wording. Avoid cliches. No em/en dashes unless explicitly requested for emphasis. Vary sentence length and paragraph length. Section-by-section processing only. Facts over feelings when discussing grievances. Include a sensory anchor per section. If it sounds good but forgettable, rewrite it.',
  },
  {
    id: 'brene',
    name: 'Vulnerability (Brené)',
    summary: 'Gentle vulnerability-forward tone, honest and grounded.',
    prompt: 'Lean into candid vulnerability without performance; warm but concise; no platitudes.',
  },
  {
    id: 'esther',
    name: 'Relational (Esther)',
    summary: 'Relational intelligence, reflective, emotionally precise.',
    prompt: 'Precise relational framing; avoid judgment; keep language concrete and balanced.',
  },
  {
    id: 'editorial-neutral',
    name: 'Editorial Neutral',
    summary: 'Crisp editorial polish without changing voice.',
    prompt: 'Tighten clarity and grammar while preserving original voice; no stylistic drift.',
  },
]
