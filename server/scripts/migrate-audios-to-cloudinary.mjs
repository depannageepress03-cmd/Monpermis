/**
 * Migre les audios questions (/uploads/... ou MediaAsset) vers Cloudinary.
 * Met à jour prompt.audioUrl (secure_url) + prompt.audioPublicId.
 *
 * Usage (depuis server/) :
 *   node scripts/migrate-audios-to-cloudinary.mjs
 *   node scripts/migrate-audios-to-cloudinary.mjs --dry-run
 *   node scripts/migrate-audios-to-cloudinary.mjs --limit=20
 */
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import { destroyAudioByPublicId, isCloudinaryUrl, uploadAudioBuffer } from '../src/services/cloudinary.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const audioDir = path.join(__dirname, '../uploads/audio')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitArg = args.find((a) => a.startsWith('--limit='))
const limit = limitArg ? Math.max(1, parseInt(limitArg.split('=')[1], 10) || 0) : 0

function keyFromAudioUrl(audioUrl) {
  const value = String(audioUrl || '').trim()
  if (!value) return null
  const match = value.match(/\/uploads\/(audio|images|vehicles)\/([^/?#]+)/i)
  if (!match) return null
  return `${match[1].toLowerCase()}/${match[2]}`
}

function filenameFromKey(key) {
  return String(key || '').split('/')[1] || ''
}

async function loadBuffer(db, audioUrl) {
  const key = keyFromAudioUrl(audioUrl)
  if (!key) return null

  const filename = filenameFromKey(key)
  const diskPath = path.join(audioDir, filename)
  if (filename && fs.existsSync(diskPath)) {
    return {
      buffer: fs.readFileSync(diskPath),
      mimeType: guessMime(filename),
      originalName: filename,
      source: 'disk',
      key,
    }
  }

  const asset = await db.collection('mediaassets').findOne({ key })
  if (asset?.data) {
    const raw = asset.data
    let buffer
    if (Buffer.isBuffer(raw)) buffer = raw
    else if (raw?.buffer) buffer = Buffer.from(raw.buffer, raw.byteOffset || 0, raw.byteLength)
    else buffer = Buffer.from(raw)
    return {
      buffer,
      mimeType: asset.mimeType || guessMime(filename),
      originalName: asset.filename || filename,
      source: 'mediaasset',
      key,
    }
  }

  // Absolute API URL still pointing to /uploads/
  if (/^https?:\/\//i.test(audioUrl) && audioUrl.includes('/uploads/audio/')) {
    const res = await fetch(audioUrl)
    if (!res.ok) return null
    const ab = await res.arrayBuffer()
    return {
      buffer: Buffer.from(ab),
      mimeType: res.headers.get('content-type') || guessMime(filename),
      originalName: filename || 'audio.webm',
      source: 'http',
      key,
    }
  }

  return null
}

function guessMime(filename) {
  const ext = path.extname(filename || '').toLowerCase()
  if (ext === '.mp3') return 'audio/mpeg'
  if (ext === '.wav') return 'audio/wav'
  if (ext === '.ogg') return 'audio/ogg'
  if (ext === '.m4a' || ext === '.mp4') return 'audio/mp4'
  return 'audio/webm'
}

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI manquant')
    process.exit(1)
  }

  await mongoose.connect(uri)
  const db = mongoose.connection.db

  const query = {
    'prompt.audioUrl': { $exists: true, $nin: [null, ''] },
  }

  let cursor = db.collection('questions').find(query).sort({ updatedAt: 1 })
  if (limit) cursor = cursor.limit(limit)
  const questions = await cursor.toArray()

  console.log(`Questions avec audio: ${questions.length}${dryRun ? ' (dry-run)' : ''}`)

  let migrated = 0
  let skipped = 0
  let failed = 0

  for (const question of questions) {
    const audioUrl = String(question.prompt?.audioUrl || '').trim()
    const existingPublicId = String(question.prompt?.audioPublicId || '').trim()

    if (isCloudinaryUrl(audioUrl) && existingPublicId) {
      skipped += 1
      console.log(`SKIP already cloudinary ${question._id}`)
      continue
    }

    if (isCloudinaryUrl(audioUrl) && !existingPublicId) {
      // URL already on Cloudinary but missing public_id — try extract from path
      const match = audioUrl.match(/\/(?:video|raw|image)\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i)
      const inferred = match ? match[1] : ''
      if (inferred && !dryRun) {
        await db.collection('questions').updateOne(
          { _id: question._id },
          { $set: { 'prompt.audioPublicId': inferred, updatedAt: new Date() } },
        )
        migrated += 1
        console.log(`FIXED public_id ${question._id} -> ${inferred}`)
      } else {
        skipped += 1
        console.log(`SKIP cloudinary url without public_id ${question._id}`)
      }
      continue
    }

    try {
      const loaded = await loadBuffer(db, audioUrl)
      if (!loaded?.buffer?.length) {
        failed += 1
        console.error(`FAIL no buffer ${question._id} ${audioUrl}`)
        continue
      }

      if (dryRun) {
        migrated += 1
        console.log(
          `DRY would migrate ${question._id} (${loaded.source}, ${loaded.buffer.length} bytes)`,
        )
        continue
      }

      const uploaded = await uploadAudioBuffer(loaded.buffer, {
        mimeType: loaded.mimeType,
        originalName: loaded.originalName,
      })

      await db.collection('questions').updateOne(
        { _id: question._id },
        {
          $set: {
            'prompt.audioUrl': uploaded.audioUrl,
            'prompt.audioPublicId': uploaded.audioPublicId,
            updatedAt: new Date(),
          },
        },
      )

      // Cleanup local/Mongo storage for this audio (Cloudinary is now source of truth)
      if (loaded.key) {
        await db.collection('mediaassets').deleteOne({ key: loaded.key })
        const diskFile = path.join(audioDir, filenameFromKey(loaded.key))
        if (fs.existsSync(diskFile)) fs.unlinkSync(diskFile)
      }

      if (existingPublicId && existingPublicId !== uploaded.audioPublicId) {
        await destroyAudioByPublicId(existingPublicId)
      }

      migrated += 1
      console.log(`OK ${question._id} -> ${uploaded.audioPublicId}`)
    } catch (error) {
      failed += 1
      console.error(`FAIL ${question._id}:`, error.message || error)
    }
  }

  console.log('')
  console.log(`Done. migrated=${migrated} skipped=${skipped} failed=${failed}`)
  await mongoose.disconnect()
  process.exit(failed > 0 ? 2 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
