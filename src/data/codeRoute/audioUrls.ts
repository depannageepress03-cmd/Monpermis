/** URLs Vite des MP3 embarqués (hors ligne après premier chargement navigateur). */
import a20_1 from '../../assets/code-audio/chapitre-20/1.mp3?url'
import a20_2 from '../../assets/code-audio/chapitre-20/2.mp3?url'
import a20_3 from '../../assets/code-audio/chapitre-20/3.mp3?url'
import a20_4 from '../../assets/code-audio/chapitre-20/4.mp3?url'
import a20_5 from '../../assets/code-audio/chapitre-20/5.mp3?url'
import a21_1 from '../../assets/code-audio/chapitre-21/1.mp3?url'
import a21_2 from '../../assets/code-audio/chapitre-21/2.mp3?url'
import a21_3 from '../../assets/code-audio/chapitre-21/3.mp3?url'
import a21_4 from '../../assets/code-audio/chapitre-21/4.mp3?url'
import a21_5 from '../../assets/code-audio/chapitre-21/5.mp3?url'
import a21_6 from '../../assets/code-audio/chapitre-21/6.mp3?url'
import a21_7 from '../../assets/code-audio/chapitre-21/7.mp3?url'
import a21_8 from '../../assets/code-audio/chapitre-21/8.mp3?url'
import a21_9 from '../../assets/code-audio/chapitre-21/9.mp3?url'
import a21_10 from '../../assets/code-audio/chapitre-21/10.mp3?url'

const MAP: Record<number, Record<number, string>> = {
  20: { 1: a20_1, 2: a20_2, 3: a20_3, 4: a20_4, 5: a20_5 },
  21: {
    1: a21_1,
    2: a21_2,
    3: a21_3,
    4: a21_4,
    5: a21_5,
    6: a21_6,
    7: a21_7,
    8: a21_8,
    9: a21_9,
    10: a21_10,
  },
}

export function getBundledCodeAudioUrl(chapterOrder: number, questionOrder: number): string | null {
  return MAP[chapterOrder]?.[questionOrder] || null
}
