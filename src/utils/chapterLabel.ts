/** Affiche « Chapitre 1 : Nom » à partir de « 1. Nom » ou d’un nom brut. */
export function formatChapterHeading(chapterName: string) {
  const match = /^(\d+)\.\s*(.+)$/.exec(chapterName.trim())
  if (match) return `Chapitre ${match[1]} : ${match[2]}`
  return `Chapitre : ${chapterName}`
}

/** Affiche « Cours 1 : Titre » (index 0-based). */
export function formatCourseHeading(index: number, title: string) {
  const n = index >= 0 ? index + 1 : 1
  return `Cours ${n} : ${title}`
}
