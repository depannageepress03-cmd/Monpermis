/**
 * Liste les audioUrl des questions et vérifie MediaAsset + HTTP.
 * Usage (depuis server/) :
 *   node scripts/audit-question-audios.mjs
 *   API_PUBLIC_URL=https://monpermis-api.onrender.com node scripts/audit-question-audios.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'

const API_BASE = String(process.env.API_PUBLIC_URL || 'https://monpermis-api.onrender.com').replace(
  /\/$/,
  '',
)

function keyFromAudioUrl(audioUrl) {
  const value = String(audioUrl || '').trim()
  if (!value) return null
  // /uploads/audio/xxx.webm  ou URL absolue
  const match = value.match(/\/uploads\/(audio|images|vehicles)\/([^/?#]+)/i)
  if (!match) return null
  return `${match[1].toLowerCase()}/${match[2]}`
}

async function httpStatus(pathOrUrl) {
  const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${API_BASE}${pathOrUrl}`
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
    if (res.status === 405 || res.status === 501) {
      const getRes = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } })
      return getRes.status
    }
    return res.status
  } catch {
    return 0
  }
}

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI manquant')
    process.exit(1)
  }

  await mongoose.connect(uri)
  const db = mongoose.connection.db

  const questions = await db
    .collection('questions')
    .find({ 'prompt.audioUrl': { $exists: true, $ne: '' } })
    .project({
      chapterId: 1,
      order: 1,
      published: 1,
      'prompt.audioUrl': 1,
      'prompt.text': 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .sort({ updatedAt: -1 })
    .toArray()

  const keys = [
    ...new Set(questions.map((q) => keyFromAudioUrl(q.prompt?.audioUrl)).filter(Boolean)),
  ]
  const assets = keys.length
    ? await db
        .collection('mediaassets')
        .find({ key: { $in: keys } })
        .project({ key: 1, size: 1, mimeType: 1, createdAt: 1 })
        .toArray()
    : []
  const assetByKey = new Map(assets.map((a) => [a.key, a]))

  console.log(`API_BASE=${API_BASE}`)
  console.log(`Questions avec audio: ${questions.length}`)
  console.log(`Clés MediaAsset uniques: ${keys.length}`)
  console.log(`MediaAsset trouvés: ${assets.length}`)
  console.log('')

  const rows = []
  for (const q of questions) {
    const audioUrl = q.prompt?.audioUrl || ''
    const key = keyFromAudioUrl(audioUrl)
    const asset = key ? assetByKey.get(key) : null
    const status = await httpStatus(audioUrl)
    const ok = status >= 200 && status < 400
    rows.push({
      id: String(q._id),
      chapterId: String(q.chapterId || ''),
      order: q.order ?? '',
      published: Boolean(q.published),
      audioUrl,
      key: key || '(url invalide)',
      inMediaAsset: Boolean(asset),
      mediaBytes: asset?.size ?? null,
      http: status,
      ok,
      text: String(q.prompt?.text || '').slice(0, 60),
      updatedAt: q.updatedAt ? new Date(q.updatedAt).toISOString() : '',
    })
  }

  const broken = rows.filter((r) => !r.ok)
  const missingAsset = rows.filter((r) => !r.inMediaAsset)
  const okRows = rows.filter((r) => r.ok)

  console.log('=== OK (jouables) ===')
  for (const r of okRows) {
    console.log(
      `✓ http=${r.http} asset=${r.inMediaAsset ? 'oui' : 'NON'}  ${r.audioUrl}  [${r.id}] ${r.text}`,
    )
  }

  console.log('')
  console.log('=== CASSÉS (à re-uploader) ===')
  if (!broken.length) {
    console.log('(aucun)')
  } else {
    for (const r of broken) {
      console.log(
        `✗ http=${r.http} asset=${r.inMediaAsset ? 'oui' : 'NON'}  ${r.audioUrl}  [${r.id}] chapter=${r.chapterId} ${r.text}`,
      )
    }
  }

  console.log('')
  console.log('=== SANS MediaAsset (risque au prochain redémarrage Render) ===')
  if (!missingAsset.length) {
    console.log('(aucun)')
  } else {
    for (const r of missingAsset) {
      console.log(
        `! http=${r.http}  ${r.audioUrl}  [${r.id}] chapter=${r.chapterId}`,
      )
    }
  }

  console.log('')
  console.log(
    `Résumé: ${okRows.length} OK / ${broken.length} cassés / ${missingAsset.length} sans MediaAsset`,
  )

  await mongoose.disconnect()
  process.exit(broken.length ? 2 : 0)
}

main().catch(async (error) => {
  console.error(error)
  try {
    await mongoose.disconnect()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
