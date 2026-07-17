import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const imagesDir = path.join(__dirname, '../../uploads/images')
const audioDir = path.join(__dirname, '../../uploads/audio')

fs.mkdirSync(imagesDir, { recursive: true })
fs.mkdirSync(audioDir, { recursive: true })

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const AUDIO_MIMES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/x-m4a',
  'video/webm', // MediaRecorder peut envoyer webm audio sous ce type
])

const IMAGE_MAGIC = [
  { ext: 'jpeg', bytes: [0xff, 0xd8, 0xff] },
  { ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: 'gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { ext: 'webp', bytes: [0x52, 0x49, 0x46, 0x46] },
]

const AUDIO_MAGIC = [
  { ext: 'mp3', bytes: [0x49, 0x44, 0x33] }, // ID3
  { ext: 'mp3-frame', bytes: [0xff, 0xfb] },
  { ext: 'mp3-frame2', bytes: [0xff, 0xf3] },
  { ext: 'mp3-frame3', bytes: [0xff, 0xf2] },
  { ext: 'wav', bytes: [0x52, 0x49, 0x46, 0x46] },
  { ext: 'ogg', bytes: [0x4f, 0x67, 0x67, 0x53] },
  { ext: 'webm', bytes: [0x1a, 0x45, 0xdf, 0xa3] },
]

function checkMagic(buffer, signatures) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return false
  return signatures.some((sig) => {
    if (buffer.length < sig.bytes.length) return false
    return sig.bytes.every((byte, i) => buffer[i] === byte)
  })
}

/**
 * Écrit le fichier en mémoire sur disque après validation du contenu.
 * Multer memoryStorage : le buffer n’existe qu’après le fileFilter — ne pas
 * vérifier les magic bytes dans fileFilter.
 */
function writeFile(file) {
  if (!file?.buffer?.length) {
    throw Object.assign(new Error('Fichier vide ou illisible'), { status: 400 })
  }

  const isAudio = file.fieldname === 'audio'
  const signatures = isAudio ? AUDIO_MAGIC : IMAGE_MAGIC
  const label = isAudio
    ? 'Format audio non supporté (MP3, WAV, OGG, WebM)'
    : 'Format image non supporté (JPEG, PNG, WebP, GIF)'

  if (!checkMagic(file.buffer, signatures)) {
    throw Object.assign(new Error(label), { status: 400 })
  }

  const dest = isAudio ? audioDir : imagesDir
  const ext = path.extname(file.originalname).toLowerCase() || (isAudio ? '.webm' : '.jpg')
  const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
  const fullPath = path.join(dest, safeName)
  fs.writeFileSync(fullPath, file.buffer)
  return { filename: safeName, path: fullPath, size: file.buffer.length }
}

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // file.buffer n’existe pas encore ici (memoryStorage le remplit après)
    if (!IMAGE_MIMES.has(String(file.mimetype || '').toLowerCase())) {
      cb(new Error('Format image non supporté (JPEG, PNG, WebP, GIF)'))
      return
    }
    cb(null, true)
  },
})

export const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!AUDIO_MIMES.has(String(file.mimetype || '').toLowerCase())) {
      cb(new Error('Format audio non supporté (MP3, WAV, OGG, WebM)'))
      return
    }
    cb(null, true)
  },
})

export { writeFile }
