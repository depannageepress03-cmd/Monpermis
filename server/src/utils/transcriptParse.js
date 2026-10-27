/**
 * Lecture d'une transcription d'énoncé (`texts/N.txt`) : énoncé + une ligne par réponse (« A. … »).
 * Fonctions pures, testables sans accès disque.
 */

/** @returns {{ stem: string, options: Record<string, string> }} */
export function parseTranscript(raw) {
  const lines = String(raw || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const firstOption = lines.findIndex((line) => /^[A-F][.)]\s*/.test(line))
  const stemLines = firstOption === -1 ? lines : lines.slice(0, firstOption)
  const options = {}
  for (const line of firstOption === -1 ? [] : lines.slice(firstOption)) {
    const match = /^([A-F])[.)]\s*(.*)$/.exec(line)
    if (match) options[match[1]] = match[2].trim()
  }
  return { stem: stemLines.join(' ').trim(), options }
}

/**
 * Une transcription est exploitable si l'énoncé est présent et si CHAQUE réponse proposée
 * a son texte. Renvoie la liste des problèmes (vide = exploitable).
 * @param {string} raw
 * @param {string[]} answerLabels ex. ['A', 'B', 'C']
 */
export function transcriptProblems(raw, answerLabels) {
  const problems = []
  if (!String(raw || '').trim()) return ['transcription vide']
  const { stem, options } = parseTranscript(raw)
  if (stem.length < 5) problems.push('énoncé vide ou trop court')
  for (const label of answerLabels) {
    const L = String(label).toUpperCase()
    if (!(L in options)) problems.push(`réponse ${L} absente`)
    else if (!options[L]) problems.push(`réponse ${L} vide`)
  }
  return problems
}

/**
 * L'énoncé renvoie-t-il à une image / une scène que l'élève doit VOIR (« Dans cette situation… »,
 * « Ce panneau est… », « Je peux dépasser ? ») ? Sans image rattachée, la question est inutilisable.
 */
const IMAGE_REFERENCES = [
  /\bcette (image|situation|intersection|scène|photo|signalisation|route|voie|zone|man[oœ]uvre|configuration|courbe|chaussée|piste|file)\b/i,
  /\bsur (l['’]\s?)?(image|photo|illustration|schéma)\b/i,
  /\bci-(dessus|dessous)\b/i,
  /\b(ce|ces|cet) (panneau|panneaux|véhicule|véhicules|bus|camion|piéton|cycliste|feu|feux|marquage|passage|croisement|carrefour|virage|signal|emplacement|endroit|usager|motard|conducteur|parking|stationnement|rond-point|tunnel|pont|trottoir|agent|automobiliste|deux|trois|quatre|cinq)\b/i,
  /\bla (ligne|voie|flèche|bande) (située|de droite|de gauche|visible)\b/i,
  /\bje (peux|dois) (dépasser|passer|tourner|stationner|m[’']arrêter|rouler|circuler)\b.*\?/i,
  /\bje suis bien placé\b/i,
  /\bdans cette\b/i,
]

export function referencesImage(stem) {
  const text = String(stem || '')
  return IMAGE_REFERENCES.some((pattern) => pattern.test(text))
}
