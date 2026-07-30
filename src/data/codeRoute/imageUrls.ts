/** URLs Vite des images embarquées (hors ligne après premier chargement). N° = question. */
import img16_1 from '../../assets/code-images/chapitre-16/1.png?url'
import img16_2 from '../../assets/code-images/chapitre-16/2.png?url'
import img16_3 from '../../assets/code-images/chapitre-16/3.png?url'
import img16_8 from '../../assets/code-images/chapitre-16/8.png?url'
import img18_1 from '../../assets/code-images/chapitre-18/1.png?url'

const MAP: Record<number, Record<number, string>> = {
  16: {
    1: img16_1,
    2: img16_2,
    3: img16_3,
    8: img16_8,
  },
  18: {
    1: img18_1,
  },
}

export function getBundledCodeImageUrl(chapterOrder: number, imageIndex: number): string | null {
  return MAP[chapterOrder]?.[imageIndex] || null
}
