import crypto from 'crypto'
import { v2 as cloudinary } from 'cloudinary'
import { logger } from '../utils/logger.js'

let configured = false

function parseCloudinaryUrl(url) {
  const value = String(url || '').trim()
  if (!value) return null
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'cloudinary:') return null
    return {
      cloud_name: parsed.hostname,
      api_key: decodeURIComponent(parsed.username || ''),
      api_secret: decodeURIComponent(parsed.password || ''),
    }
  } catch {
    return null
  }
}

function resolveCredentials() {
  const fromUrl = parseCloudinaryUrl(process.env.CLOUDINARY_URL)
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME || fromUrl?.cloud_name
  const api_key = process.env.CLOUDINARY_API_KEY || fromUrl?.api_key
  let api_secret = process.env.CLOUDINARY_API_SECRET || fromUrl?.api_secret || ''

  // Tolerate pasted values like CLOUDINARY_URL=cloudinary://...
  if (api_secret.includes('cloudinary://')) {
    const nested = parseCloudinaryUrl(api_secret.replace(/^CLOUDINARY_URL=/i, ''))
    if (nested?.api_secret) api_secret = nested.api_secret
  }

  if (!cloud_name || !api_key || !api_secret) {
    throw Object.assign(
      new Error(
        'Cloudinary non configuré (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)',
      ),
      { status: 500 },
    )
  }

  return { cloud_name, api_key, api_secret }
}

/** Configure Cloudinary SDK (destroy/ping). Never expose API_SECRET to clients. */
export function configureCloudinary() {
  if (configured) return cloudinary
  const { cloud_name, api_key, api_secret } = resolveCredentials()
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true })
  configured = true
  return cloudinary
}

function guessExtension(mimeType, originalName = '') {
  const fromName = String(originalName || '')
    .toLowerCase()
    .match(/\.[a-z0-9]+$/)?.[0]
  if (fromName) return fromName
  const mime = String(mimeType || '').toLowerCase()
  if (mime.includes('mpeg') || mime.includes('mp3')) return '.mp3'
  if (mime.includes('wav')) return '.wav'
  if (mime.includes('ogg')) return '.ogg'
  if (mime.includes('mp4') || mime.includes('m4a')) return '.m4a'
  return '.webm'
}

function signParams(params, api_secret) {
  const toSign = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  return crypto.createHash('sha1').update(`${toSign}${api_secret}`).digest('hex')
}

/**
 * Upload an audio buffer to Cloudinary (signed REST upload — more reliable than SDK streams).
 * Audio is stored as resource_type=video (Cloudinary convention) for HTML5/Expo playback.
 * @returns {{ audioUrl: string, audioPublicId: string, bytes: number, format?: string }}
 */
export async function uploadAudioBuffer(buffer, { mimeType, originalName } = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw Object.assign(new Error('Fichier audio vide'), { status: 400 })
  }

  const { cloud_name, api_key, api_secret } = resolveCredentials()
  const ext = guessExtension(mimeType, originalName)
  const filename = `audio${ext}`
  const folder = 'monpermis/audio'
  const timestamp = Math.floor(Date.now() / 1000)
  const params = { folder, timestamp }
  const signature = signParams(params, api_secret)

  const form = new FormData()
  form.append(
    'file',
    new Blob([buffer], { type: mimeType || 'application/octet-stream' }),
    filename,
  )
  form.append('api_key', api_key)
  form.append('timestamp', String(timestamp))
  form.append('signature', signature)
  form.append('folder', folder)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 120000)
  let response
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/video/upload`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timer)
    throw Object.assign(new Error(`Upload Cloudinary réseau: ${error.message}`), { status: 502 })
  }
  clearTimeout(timer)

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload?.error?.message || `Upload Cloudinary HTTP ${response.status}`
    throw Object.assign(new Error(message), { status: response.status >= 500 ? 502 : 400 })
  }

  const audioUrl = String(payload.secure_url || '').trim()
  const audioPublicId = String(payload.public_id || '').trim()
  if (!audioUrl || !audioPublicId) {
    throw Object.assign(new Error('Réponse Cloudinary invalide'), { status: 502 })
  }

  return {
    audioUrl,
    audioPublicId,
    bytes: Number(payload.bytes) || buffer.length,
    format: payload.format,
  }
}

/** Delete a Cloudinary audio asset by public_id. Ignores already-deleted assets. */
export async function destroyAudioByPublicId(publicId) {
  const id = String(publicId || '').trim()
  if (!id) return { deleted: false, reason: 'empty' }

  try {
    const { cloud_name, api_key, api_secret } = resolveCredentials()
    const timestamp = Math.floor(Date.now() / 1000)
    const params = { public_id: id, timestamp }
    const signature = signParams(params, api_secret)

    const body = new URLSearchParams({
      public_id: id,
      api_key,
      timestamp: String(timestamp),
      signature,
    })

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/video/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const payload = await response.json().catch(() => ({}))
    const result = payload?.result
    const ok = result === 'ok' || result === 'not found'
    if (!ok) {
      logger.warn('Cloudinary destroy inattendu:', id, payload)
    }
    return { deleted: result === 'ok', result }
  } catch (error) {
    logger.error('Cloudinary destroy échoué:', id, error)
    return { deleted: false, error: error.message }
  }
}

function guessImageExtension(mimeType, originalName = '') {
  const fromName = String(originalName || '')
    .toLowerCase()
    .match(/\.[a-z0-9]+$/)?.[0]
  if (fromName) return fromName
  const mime = String(mimeType || '').toLowerCase()
  if (mime.includes('png')) return '.png'
  if (mime.includes('webp')) return '.webp'
  if (mime.includes('gif')) return '.gif'
  return '.jpg'
}

function guessVideoExtension(mimeType, originalName = '') {
  const fromName = String(originalName || '')
    .toLowerCase()
    .match(/\.[a-z0-9]+$/)?.[0]
  if (fromName) return fromName
  const mime = String(mimeType || '').toLowerCase()
  if (mime.includes('webm')) return '.webm'
  if (mime.includes('quicktime')) return '.mov'
  if (mime.includes('ogg')) return '.ogv'
  return '.mp4'
}

/** Folder prefix for code / course media (env override). */
export function resolveCodeMediaFolder(fallback = 'monpermis/code') {
  const fromEnv = String(process.env.CLOUDINARY_FOLDER || '').trim()
  return fromEnv || fallback
}

/**
 * Upload an image buffer to Cloudinary (signed REST upload).
 * @returns {{ imageUrl: string, imagePublicId: string, bytes: number, format?: string }}
 */
export async function uploadImageBuffer(buffer, { mimeType, originalName, folder = 'monpermis/conduite' } = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw Object.assign(new Error('Fichier image vide'), { status: 400 })
  }

  const { cloud_name, api_key, api_secret } = resolveCredentials()
  const ext = guessImageExtension(mimeType, originalName)
  const filename = `image${ext}`
  const timestamp = Math.floor(Date.now() / 1000)
  const params = { folder, timestamp }
  const signature = signParams(params, api_secret)

  const form = new FormData()
  form.append(
    'file',
    new Blob([buffer], { type: mimeType || 'application/octet-stream' }),
    filename,
  )
  form.append('api_key', api_key)
  form.append('timestamp', String(timestamp))
  form.append('signature', signature)
  form.append('folder', folder)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 120000)
  let response
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timer)
    throw Object.assign(new Error(`Upload Cloudinary réseau: ${error.message}`), { status: 502 })
  }
  clearTimeout(timer)

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload?.error?.message || `Upload Cloudinary HTTP ${response.status}`
    throw Object.assign(new Error(message), { status: response.status >= 500 ? 502 : 400 })
  }

  const imageUrl = String(payload.secure_url || '').trim()
  const imagePublicId = String(payload.public_id || '').trim()
  if (!imageUrl || !imagePublicId) {
    throw Object.assign(new Error('Réponse Cloudinary invalide'), { status: 502 })
  }

  return {
    imageUrl,
    imagePublicId,
    bytes: Number(payload.bytes) || buffer.length,
    format: payload.format,
  }
}

/**
 * Upload a video buffer to Cloudinary (signed REST upload, resource_type=video).
 * @returns {{ videoUrl: string, videoPublicId: string, bytes: number, format?: string }}
 */
export async function uploadVideoBuffer(buffer, { mimeType, originalName, folder = 'monpermis/code' } = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw Object.assign(new Error('Fichier vidéo vide'), { status: 400 })
  }

  const { cloud_name, api_key, api_secret } = resolveCredentials()
  const ext = guessVideoExtension(mimeType, originalName)
  const filename = `video${ext}`
  const timestamp = Math.floor(Date.now() / 1000)
  const params = { folder, timestamp }
  const signature = signParams(params, api_secret)

  const form = new FormData()
  form.append(
    'file',
    new Blob([buffer], { type: mimeType || 'application/octet-stream' }),
    filename,
  )
  form.append('api_key', api_key)
  form.append('timestamp', String(timestamp))
  form.append('signature', signature)
  form.append('folder', folder)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 300000)
  let response
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/video/upload`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    })
  } catch (error) {
    clearTimeout(timer)
    throw Object.assign(new Error(`Upload Cloudinary réseau: ${error.message}`), { status: 502 })
  }
  clearTimeout(timer)

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload?.error?.message || `Upload Cloudinary HTTP ${response.status}`
    throw Object.assign(new Error(message), { status: response.status >= 500 ? 502 : 400 })
  }

  const videoUrl = String(payload.secure_url || '').trim()
  const videoPublicId = String(payload.public_id || '').trim()
  if (!videoUrl || !videoPublicId) {
    throw Object.assign(new Error('Réponse Cloudinary invalide'), { status: 502 })
  }

  return {
    videoUrl,
    videoPublicId,
    bytes: Number(payload.bytes) || buffer.length,
    format: payload.format,
  }
}

/** Delete a Cloudinary image asset by public_id. Ignores already-deleted assets. */
export async function destroyImageByPublicId(publicId) {
  const id = String(publicId || '').trim()
  if (!id) return { deleted: false, reason: 'empty' }

  try {
    const { cloud_name, api_key, api_secret } = resolveCredentials()
    const timestamp = Math.floor(Date.now() / 1000)
    const params = { public_id: id, timestamp }
    const signature = signParams(params, api_secret)

    const body = new URLSearchParams({
      public_id: id,
      api_key,
      timestamp: String(timestamp),
      signature,
    })

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const payload = await response.json().catch(() => ({}))
    const result = payload?.result
    const ok = result === 'ok' || result === 'not found'
    if (!ok) {
      logger.warn('Cloudinary image destroy inattendu:', id, payload)
    }
    return { deleted: result === 'ok', result }
  } catch (error) {
    logger.error('Cloudinary image destroy échoué:', id, error)
    return { deleted: false, error: error.message }
  }
}

export function isCloudinaryUrl(url) {
  return /res\.cloudinary\.com\//i.test(String(url || ''))
}
