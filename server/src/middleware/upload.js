import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const imagesDir = path.join(__dirname, '../../uploads/images')
const audioDir = path.join(__dirname, '../../uploads/audio')

fs.mkdirSync(imagesDir, { recursive: true })
fs.mkdirSync(audioDir, { recursive: true })

function makeStorage(destination) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ''
      const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
      cb(null, safeName)
    },
  })
}

const imageMime = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const audioMime = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
])

export const imageUpload = multer({
  storage: makeStorage(imagesDir),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (imageMime.has(file.mimetype)) {
      cb(null, true)
      return
    }
    cb(new Error('Format image non supporté (JPEG, PNG, WebP, GIF)'))
  },
})

export const audioUpload = multer({
  storage: makeStorage(audioDir),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (audioMime.has(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true)
      return
    }
    cb(new Error('Format audio non supporté (MP3, WAV, WebM, OGG, M4A)'))
  },
})
