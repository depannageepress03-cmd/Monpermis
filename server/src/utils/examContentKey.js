/**
 * Empreinte de contenu pour éviter deux questions au même énoncé dans un même sujet
 * (ex. chapitres 17 et 18 quasi identiques).
 */

/** Normalise un texte pour comparer deux énoncés / options. */
export function normalizeExamText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/co[₂2]/gi, 'co2')
    .replace(/millimetres?/g, 'mm')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * @param {string} stem
 * @param {Record<string, string>} options
 */
export function examContentKey(stem, options = {}) {
  const opts = Object.entries(options || {})
    .map(([label, text]) => [String(label).toUpperCase(), normalizeExamText(text)])
    .filter(([, text]) => text)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, text]) => `${label}:${text}`)
    .join('|')
  return `${normalizeExamText(stem)}::${opts}`
}
