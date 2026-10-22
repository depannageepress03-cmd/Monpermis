import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseTranscript, referencesImage, transcriptProblems } from '../utils/transcriptParse.js'
import { answerKeyProblems } from '../utils/answerKey.js'
import { UNCERTAIN_QUESTIONS } from '../data/hardcodedQuestions/uncertain.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONTENT_ROOT = path.resolve(__dirname, '../../content')

/** En dessous, un mp3 est vide ou tronqué (le plus court énoncé réel fait ~75 Ko). */
const MIN_AUDIO_BYTES = 3000

const cache = new Map()

function contentPath(...parts) {
  return path.join(CONTENT_ROOT, ...parts)
}

/** /content/code-images/chapitre-2/30.png?v=… → chemin disque. */
function imageFile(url) {
  const match = /\/content\/(code-images\/chapitre-\d+\/\d+\.[a-z0-9]+)/i.exec(String(url || ''))
  return match ? contentPath(match[1]) : null
}

/**
 * Une question n'est proposée à l'apprenant (révision, sujets test, examens) que si elle est SÛRE :
 *  - réponses fiables : au moins une bonne réponse, pas « toutes bonnes », pas signalée « à confirmer » ;
 *  - audio présent et non vide ;
 *  - transcription complète (énoncé + texte de chaque réponse) ;
 *  - toutes les images qu'elle exige existent, et une image est rattachée si l'audio en parle.
 * Résultat mis en cache : les fichiers ne changent pas pendant la vie du serveur.
 *
 * @param {{ id: string, prompt?: { imageUrls?: string[] }, answers?: { label: string }[] }} doc
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function checkExamEligibility(doc) {
  const id = String(doc?.id || '')
  if (cache.has(id)) return cache.get(id)

  const reasons = []
  for (const problem of answerKeyProblems(doc?.answers)) reasons.push(`réponses : ${problem}`)
  if (UNCERTAIN_QUESTIONS[id]) reasons.push('signalée à confirmer')
  const match = /^hc-ch(\d+)-q(\d+)$/i.exec(id)
  if (!match) {
    reasons.push('identifiant de question inconnu')
  } else {
    const chapter = Number(match[1])
    const order = Number(match[2])

    const audio = contentPath('code-audio', `chapitre-${chapter}`, `${order}.mp3`)
    if (!fs.existsSync(audio)) reasons.push('audio absent')
    else if (fs.statSync(audio).size < MIN_AUDIO_BYTES) reasons.push('audio vide ou tronqué')

    const textFile = contentPath('code-audio', `chapitre-${chapter}`, 'texts', `${order}.txt`)
    if (!fs.existsSync(textFile)) {
      reasons.push('transcription absente')
    } else {
      const raw = fs.readFileSync(textFile, 'utf8')
      const labels = (doc.answers || []).map((answer) => answer.label)
      const problems = transcriptProblems(raw, labels)
      if (problems.length) reasons.push('transcription incomplète')
      // L'audio renvoie à une scène (« Dans cette situation… ») mais aucune image n'est rattachée.
      if (!(doc?.prompt?.imageUrls || []).length && referencesImage(parseTranscript(raw).stem)) {
        reasons.push('image requise mais non rattachée')
      }
    }
  }

  for (const url of doc?.prompt?.imageUrls || []) {
    const file = imageFile(url)
    if (!file || !fs.existsSync(file)) {
      reasons.push('image manquante')
      break
    }
  }

  const result = { ok: reasons.length === 0, reasons }
  cache.set(id, result)
  return result
}

export function isExamEligible(doc) {
  return checkExamEligibility(doc).ok
}
