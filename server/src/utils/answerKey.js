/**
 * Contrôle de la clé de réponses d'une question. Une clé douteuse fausserait la correction et la note :
 * la question n'est alors pas proposée à l'apprenant.
 * @param {{ isCorrect?: boolean }[]} answers
 * @returns {string[]} problèmes (vide = clé exploitable)
 */
export function answerKeyProblems(answers) {
  const list = Array.isArray(answers) ? answers : []
  const good = list.filter((answer) => answer?.isCorrect).length
  const problems = []
  if (list.length < 2) problems.push('moins de deux réponses')
  if (good === 0) problems.push('aucune bonne réponse enregistrée')
  if (list.length > 1 && good === list.length) problems.push('toutes les réponses marquées bonnes (à confirmer)')
  return problems
}
