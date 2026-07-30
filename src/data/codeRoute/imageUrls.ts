/** URLs Vite des images embarquées (hors ligne après premier chargement). N° = question. */
import img3_2 from '../../assets/code-images/chapitre-3/2.png?url'
import img3_6 from '../../assets/code-images/chapitre-3/6.png?url'
import img3_8 from '../../assets/code-images/chapitre-3/8.png?url'
import img8_22 from '../../assets/code-images/chapitre-8/22.png?url'
import img8_23 from '../../assets/code-images/chapitre-8/23.png?url'
import img8_31 from '../../assets/code-images/chapitre-8/31.png?url'
import img8_32 from '../../assets/code-images/chapitre-8/32.png?url'
import img8_33 from '../../assets/code-images/chapitre-8/33.png?url'
import img8_34 from '../../assets/code-images/chapitre-8/34.png?url'
import img9_1 from '../../assets/code-images/chapitre-9/1.png?url'
import img9_25 from '../../assets/code-images/chapitre-9/25.png?url'
import img9_26 from '../../assets/code-images/chapitre-9/26.png?url'
import img9_27 from '../../assets/code-images/chapitre-9/27.png?url'
import img9_28 from '../../assets/code-images/chapitre-9/28.png?url'
import img9_29 from '../../assets/code-images/chapitre-9/29.png?url'
import img16_1 from '../../assets/code-images/chapitre-16/1.png?url'
import img16_2 from '../../assets/code-images/chapitre-16/2.png?url'
import img16_3 from '../../assets/code-images/chapitre-16/3.png?url'
import img16_8 from '../../assets/code-images/chapitre-16/8.png?url'
import img18_1 from '../../assets/code-images/chapitre-18/1.png?url'

const MAP: Record<number, Record<number, string>> = {
  3: {
    2: img3_2,
    6: img3_6,
    8: img3_8,
  },
  8: {
    22: img8_22,
    23: img8_23,
    31: img8_31,
    32: img8_32,
    33: img8_33,
    34: img8_34,
  },
  9: {
    1: img9_1,
    25: img9_25,
    26: img9_26,
    27: img9_27,
    28: img9_28,
    29: img9_29,
  },
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
