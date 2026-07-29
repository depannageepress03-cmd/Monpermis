/**
 * Tirage aléatoire et mélange équilibré par chapitre pour les examens blancs.
 */

export function shuffleInPlace(array, random = Math.random) {
  const pool = array
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}

/** Mélange global (sans contrainte de chapitre). */
export function pickRandomQuestions(questions, count) {
  const pool = shuffleInPlace([...questions])
  return pool.slice(0, Math.min(count, pool.length))
}

/**
 * Tirage équilibré : chaque chapitre publié avec des questions contribue
 * proportionnellement (et au moins 1 question si le quota le permet).
 * Les slots restants sont redistribués, puis l’ordre final est re-mélangé.
 */
export function pickChapterBalancedQuestions(questions, count) {
  const target = Math.min(Math.max(0, Number(count) || 0), questions.length)
  if (target <= 0) return []
  if (questions.length <= target) {
    return shuffleInPlace([...questions]).slice(0, target)
  }

  const byChapter = new Map()
  for (const question of questions) {
    const key = String(question.chapterId || 'unknown')
    if (!byChapter.has(key)) byChapter.set(key, [])
    byChapter.get(key).push(question)
  }

  const chapters = shuffleInPlace([...byChapter.entries()])
  const chapterCount = chapters.length
  const total = questions.length

  const allocations = chapters.map(([id, pool]) => {
    const shuffled = shuffleInPlace([...pool])
    const ideal = (shuffled.length / total) * target
    return {
      id,
      pool: shuffled,
      ideal,
      take: Math.floor(ideal),
    }
  })

  if (target >= chapterCount) {
    for (const allocation of allocations) {
      if (allocation.take < 1 && allocation.pool.length > 0) {
        allocation.take = 1
      }
    }
  }

  for (const allocation of allocations) {
    allocation.take = Math.min(allocation.take, allocation.pool.length)
  }

  let assigned = allocations.reduce((sum, allocation) => sum + allocation.take, 0)

  if (assigned > target) {
    const trimOrder = [...allocations].sort((a, b) => b.take - a.take || b.ideal - a.ideal)
    for (const allocation of trimOrder) {
      while (assigned > target && allocation.take > (target >= chapterCount ? 1 : 0)) {
        allocation.take -= 1
        assigned -= 1
      }
      if (assigned <= target) break
    }
  }

  if (assigned < target) {
    const growOrder = [...allocations].sort(
      (a, b) => b.ideal - Math.floor(b.ideal) - (a.ideal - Math.floor(a.ideal)),
    )
    let guard = 0
    while (assigned < target && guard < growOrder.length * target) {
      let progressed = false
      for (const allocation of growOrder) {
        if (assigned >= target) break
        if (allocation.take < allocation.pool.length) {
          allocation.take += 1
          assigned += 1
          progressed = true
        }
      }
      if (!progressed) break
      guard += 1
    }
  }

  const selected = []
  const usedIds = new Set()
  for (const allocation of allocations) {
    for (const question of allocation.pool.slice(0, allocation.take)) {
      selected.push(question)
      usedIds.add(String(question._id || question.id))
    }
  }

  if (selected.length < target) {
    const leftover = shuffleInPlace(
      questions.filter((question) => !usedIds.has(String(question._id || question.id))),
    )
    selected.push(...leftover.slice(0, target - selected.length))
  }

  return shuffleInPlace(selected).slice(0, target)
}

/** Empreinte stable de la banque publiée (régénération si le contenu change). */
export function computeQuestionBankFingerprint(questions) {
  const ids = questions
    .map((question) => String(question._id || question.id || ''))
    .filter(Boolean)
    .sort()
  const text = ids.join(',')
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `${ids.length}:${(hash >>> 0).toString(16)}`
}

export function summarizeChapterBank(questions, chapterNameById = new Map()) {
  const counts = new Map()
  for (const question of questions) {
    const key = String(question.chapterId || '')
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([chapterId, questionCount]) => ({
      chapterId,
      chapterName: chapterNameById.get(chapterId) || 'Chapitre',
      questionCount,
    }))
    .sort((a, b) => b.questionCount - a.questionCount || a.chapterName.localeCompare(b.chapterName))
}
