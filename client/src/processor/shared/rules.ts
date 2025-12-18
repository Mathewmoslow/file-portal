// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import masterStyleFull from './master-style.md?raw'

export { masterStyleFull }

export const banList = [
  'fractured',
  'quiet spaces',
  'quiet space',
  'quiet moment',
  'poisons everything it touches',
  'finds its way into your blood',
  'ghost that walked beside me',
  'piece by piece',
  'healing journey',
  'journey',
  'do the work',
  'hold space',
  'safe space',
  'at the end of the day',
  'it is what it is',
  'deep down',
  'heart of hearts',
] as const

// Common cliches/phrases to flag when auditing the full document
export const clicheChecks = [
  'swept under the rug',
  'swept under the carpet',
  'hold space',
  'needless to say',
  'at the end of the day',
  'poisons everything it touches',
  'finds its way into your blood',
  'ghost that walked beside me',
  'piece by piece',
  'healing journey',
  'journey',
  'do the work',
  'safe space',
  'it is what it is',
  'deep down',
  'heart of hearts',
] as const

export const punctuationRules = [
  'No em dash or en dash unless explicitly emphasized; prefer sentences or commas.',
  'Avoid ellipses for tone.',
] as const

export const cadenceRules = [
  'Vary sentence length; avoid uniform paragraph rhythm.',
  'Prefer concrete nouns/verbs; limit abstractions and filler qualifiers.',
] as const

export const styleNotes = [
  'Direct address, letter cadence first; clarity over ornament.',
  'No cliches; avoid "swept under the rug/carpet", "hold space", etc.',
  'Keep descriptive detail purposeful; tie imagery to narrative beats.',
] as const

export const masterRulesSummary = [
  'Honor Mathew master voice; preserve cadence and phrasing choices.',
  'Respect ban list and punctuation constraints.',
  'Audit for cliche and repetitive patterns before presenting.',
  'Vary sentence and paragraph length; uniformity is a failure state.',
  'Section-by-section processing only; never flatten tone across the piece.',
  'Facts over feelings when discussing grievances.',
  'Include at least one sensory anchor per section.',
  'If it sounds good but forgettable, rewrite it.',
] as const

export const masterStyleCondensed = [
  'Voice blend: Brene Brown vulnerability-as-strength, Esther Perel relational intelligence, blunt honesty, respectful irreverence. Minimal sarcasm.',
  'Writing must feel authored, not optimized. If anyone could have written it, rewrite it.',
  'Paragraph and sentence length must vary visibly. Uniformity is a failure state.',
  'Process section-by-section. Do not flatten tone across an entire piece.',
  'No cliches or banned vocabulary. Replace with specific, personal images.',
  'Use sensory anchors in every section. Personal specificity over generic metaphor.',
  'Facts over feelings when discussing grievances. Do not editorialize.',
  'Slow down at significant moments. Use short rhythm beats sparingly.',
  'Em and en dashes only for absolute emphasis. Prefer periods or restructuring.',
] as const
