/**
 * Mini serveur statique avec fallback SPA (toutes les routes -> index.html).
 * Usage : node scripts/serve-dist.mjs [port] [dossier]
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, normalize } from 'node:path'

const port = Number(process.argv[2] || 5199)
const root = process.argv[3] || 'dist'
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.webm': 'audio/webm',
  '.map': 'application/json',
}

async function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '')
  const candidate = join(root, clean)
  try {
    const info = await stat(candidate)
    if (info.isDirectory()) {
      return join(candidate, 'index.html')
    }
    return candidate
  } catch {
    return null
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    let file = await resolveFile(url.pathname)
    if (!file) file = join(root, 'index.html') // fallback SPA
    const body = await readFile(file)
    res.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`dist served at http://127.0.0.1:${port}`)
})
