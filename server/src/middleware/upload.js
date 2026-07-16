import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const imagesDir = path.join(__dirname, '../../uploads/images')
const audioDir = path.join(__dirname, '../../uploads/audio')

fs.mkdirSync(imagesDir, { recursive: true })
fs.mkdirSync(audioDir, { recursive: true })

const MAGIC_BYTES = [
  { ext: 'jpeg', bytes: [0xff, 0xd8, 0xff] },
  { ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: 'gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { ext: 'webp', bytes: [0x52, 0x49, 0x46, 0x46] },
]

const AUDIO_MAGIC = [
  { ext: 'mp3', bytes: [0x49, 0x44, 0x33] },
  { ext: 'wav', bytes: [0x52, 0x49, 0x46, 0x46] },
  { ext: 'ogg', bytes: [0x4f, 0x67, 0x67, 0x53] },
]

function checkMagic(buffer, signatures) {
  return signatures.some((sig) => {
    if (buffer.length < sig.bytes.length) return false
    return sig.bytes.every((byte, i) => buffer[i] === byte)
  })
}

function writeFile(file) {
  const dest = file.fieldname === 'audio' ? audioDir : imagesDir
  const ext = path.extname(file.originalname).toLowerCase() || ''
  const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
  const fullPath = path.join(dest, safeName)
  fs.writeFileSync(fullPath, file.buffer)
  return { filename: safeName, path: fullPath, size: file.buffer.length }
}

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.buffer || !checkMagic(file.buffer, MAGIC_BYTES)) {
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
    if (!file.buffer || !checkMagic(file.buffer, AUDIO_MAGIC)) {
      cb(new Error('Format audio non supporté (MP3, WAV, OGG)'))
      return
    }
    cb(null, true)
  },
})

export { writeFile }
