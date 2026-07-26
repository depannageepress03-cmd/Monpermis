import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import multer from 'multer'
import { MediaAsset } from '../models/MediaAsset.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const imagesDir = path.join(__dirname, '../../uploads/images')
const audioDir = path.join(__dirname, '../../uploads/audio')
const vehiclesDir = path.join(__dirname, '../../uploads/vehicles')

fs.mkdirSync(imagesDir, { recursive: true })
fs.mkdirSync(audioDir, { recursive: true })
fs.mkdirSync(vehiclesDir, { recursive: true })

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

const MIME_BY_EXT = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.webm': 'audio/webm',
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

function checkMagic(buffer, signatures) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return false
  return signatures.some((sig) => {
    if (buffer.length < sig.bytes.length) return false
    return sig.bytes.every((byte, i) => buffer[i] === byte)
  })
}

function resolveKind(file) {
  if (file.fieldname === 'audio') return 'audio'
  if (file.fieldname === 'vehicle' || file.fieldname === 'vehiclePhoto') return 'vehicles'
  return 'images'
}

function resolveDir(kind) {
  if (kind === 'audio') return audioDir
  if (kind === 'vehicles') return vehiclesDir
  return imagesDir
}

/**
 * Écrit le fichier en mémoire sur disque + MongoDB (persistance Render).
 * Multer memoryStorage : le buffer n’existe qu’après le fileFilter — ne pas
 * vérifier les magic bytes dans fileFilter.
 */
async function writeFile(file) {
  if (!file?.buffer?.length) {
    throw Object.assign(new Error('Fichier vide ou illisible'), { status: 400 })
  }

  if (file.fieldname === 'audio') {
    throw Object.assign(
      new Error('Les audios doivent être uploadés via Cloudinary (upload-audio)'),
      { status: 400 },
    )
  }

  const isAudio = false
  const signatures = IMAGE_MAGIC
  const label = 'Format image non supporté (JPEG, PNG, WebP, GIF)'

  if (!checkMagic(file.buffer, signatures)) {
    throw Object.assign(new Error(label), { status: 400 })
  }

  const kind = resolveKind(file)
  const dest = resolveDir(kind)
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
  const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
  const fullPath = path.join(dest, safeName)
  fs.writeFileSync(fullPath, file.buffer)

  const mimeType =
    String(file.mimetype || '').toLowerCase() || MIME_BY_EXT[ext] || 'application/octet-stream'
  const key = `${kind}/${safeName}`

  await MediaAsset.findOneAndUpdate(
    { key },
    {
      key,
      filename: safeName,
      kind,
      mimeType,
      size: file.buffer.length,
      data: file.buffer,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  return { filename: safeName, path: fullPath, size: file.buffer.length, kind, key }
}

/** Sert un média depuis le disque, sinon depuis MongoDB. */
async function sendMediaAsset(req, res, next) {
  try {
    const kind = String(req.params.kind || '')
    const filename = path.basename(String(req.params.filename || ''))
    if (!['audio', 'images', 'vehicles'].includes(kind) || !filename) {
      return res.status(404).end()
    }

    const diskPath = path.join(resolveDir(kind), filename)
    if (fs.existsSync(diskPath)) {
      return res.sendFile(diskPath)
    }

    const key = `${kind}/${filename}`
    const asset = await MediaAsset.findOne({ key }).lean()
    if (!asset?.data) {
      return res.status(404).end()
    }

    const ext = path.extname(filename).toLowerCase()
    const mimeType = asset.mimeType || MIME_BY_EXT[ext] || 'application/octet-stream'
    const raw = asset.data
    let body
    if (Buffer.isBuffer(raw)) body = raw
    else if (raw?.buffer && typeof raw.byteLength === 'number') {
      body = Buffer.from(raw.buffer, raw.byteOffset || 0, raw.byteLength)
    } else body = Buffer.from(raw)
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('Content-Length', String(body.length))
    return res.end(body)
  } catch (error) {
    return next(error)
  }
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

export { writeFile, sendMediaAsset }
