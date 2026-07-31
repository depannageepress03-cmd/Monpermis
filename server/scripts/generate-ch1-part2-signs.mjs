/**
 * Génère des PNG de panneaux (style code FR/Bénin) pour ch1 partie 2.
 * Usage: node scripts/generate-ch1-part2-signs.mjs
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PART2 } from './ch1-part2-data.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SERVER = path.resolve(__dirname, '..')
const REPO = path.resolve(SERVER, '..')
const TMP = path.join(SERVER, 'content', 'code-images', '_tmp-svg')
const OUT_DIRS = [
  path.join(SERVER, 'content', 'code-images', 'chapitre-1'),
  path.join(REPO, 'mobile', 'assets', 'code-images', 'chapitre-1'),
  path.join(REPO, 'src', 'assets', 'code-images', 'chapitre-1'),
]

function wrap(inner, w = 512, h = 512) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${inner}
</svg>`
}

function dangerTriangle(content) {
  return `
  <polygon points="256,48 472,448 40,448" fill="#FFD200" stroke="#111" stroke-width="14"/>
  <polygon points="256,90 430,420 82,420" fill="#FFD200"/>
  ${content}`
}

function prohibitCircle(content) {
  return `
  <circle cx="256" cy="256" r="200" fill="#fff" stroke="#E30613" stroke-width="36"/>
  ${content}`
}

function obligationCircle(content) {
  return `
  <circle cx="256" cy="256" r="200" fill="#0055A4" stroke="#0055A4" stroke-width="8"/>
  ${content}`
}

function endCircle(content) {
  return `
  <circle cx="256" cy="256" r="200" fill="#fff" stroke="#111" stroke-width="10"/>
  ${content}
  <line x1="120" y1="390" x2="392" y2="122" stroke="#111" stroke-width="22"/>`
}

function priorityDiamond(content) {
  return `
  <polygon points="256,40 472,256 256,472 40,256" fill="#fff" stroke="#111" stroke-width="10"/>
  <polygon points="256,70 442,256 256,442 70,256" fill="#fff" stroke="#E30613" stroke-width="28"/>
  ${content}`
}

const SIGNS = {
  A25: () =>
    wrap(
      dangerTriangle(`
      <circle cx="256" cy="300" r="70" fill="none" stroke="#111" stroke-width="14"/>
      <polygon points="256,240 280,300 256,290 232,300" fill="#111"/>`),
    ),
  A18: () =>
    wrap(
      dangerTriangle(`
      <path d="M150,360 L200,250 L312,250 L362,360" fill="none" stroke="#111" stroke-width="18" stroke-linejoin="round"/>`),
    ),
  A1c: () =>
    wrap(
      dangerTriangle(`
      <path d="M160,360 Q200,220 256,300 Q312,380 360,220" fill="none" stroke="#111" stroke-width="18" stroke-linecap="round"/>`),
    ),
  A7: () =>
    wrap(
      dangerTriangle(`
      <rect x="168" y="250" width="176" height="22" rx="3" fill="#111"/>
      <rect x="188" y="280" width="18" height="90" fill="#111"/>
      <rect x="306" y="280" width="18" height="90" fill="#111"/>
      <rect x="210" y="300" width="92" height="14" fill="#111"/>`),
    ),
  A8: () =>
    wrap(
      dangerTriangle(`
      <rect x="236" y="230" width="40" height="160" fill="#111"/>
      <rect x="196" y="270" width="120" height="28" fill="#111"/>`),
    ),
  A3: () =>
    wrap(
      dangerTriangle(`
      <path d="M140,360 L200,250 L312,250 L372,360" fill="none" stroke="#111" stroke-width="16"/>
      <path d="M220,250 L220,200 M292,250 L292,200" stroke="#111" stroke-width="12"/>`),
    ),
  B1: () =>
    wrap(`
    <circle cx="256" cy="256" r="200" fill="#E30613" stroke="#fff" stroke-width="10"/>
    <rect x="120" y="230" width="272" height="52" rx="6" fill="#fff"/>`),
  B3: () =>
    wrap(
      prohibitCircle(`
      <rect x="150" y="210" width="90" height="50" rx="6" fill="#111"/>
      <rect x="270" y="250" width="90" height="50" rx="6" fill="#111"/>
      <line x1="120" y1="390" x2="392" y2="122" stroke="#E30613" stroke-width="28"/>`),
    ),
  B8: () =>
    wrap(
      prohibitCircle(`
      <rect x="170" y="200" width="170" height="95" rx="8" fill="#111"/>
      <circle cx="205" cy="310" r="22" fill="#111"/>
      <circle cx="305" cy="310" r="22" fill="#111"/>
      <rect x="300" y="215" width="55" height="45" fill="#111"/>`),
    ),
  B18a: () =>
    wrap(
      prohibitCircle(`
      <rect x="186" y="170" width="140" height="180" rx="8" fill="#FFD200" stroke="#111" stroke-width="6"/>
      <text x="256" y="280" text-anchor="middle" font-size="90" font-family="Arial Black, Arial" font-weight="700" fill="#111">!</text>`),
    ),
  B6a: () =>
    wrap(`
    <circle cx="256" cy="256" r="200" fill="#0055A4" stroke="#fff" stroke-width="6"/>
    <circle cx="256" cy="256" r="200" fill="none" stroke="#E30613" stroke-width="36"/>
    <line x1="130" y1="130" x2="382" y2="382" stroke="#E30613" stroke-width="36"/>`),
  B6d: () =>
    wrap(`
    <circle cx="256" cy="256" r="200" fill="#0055A4"/>
    <circle cx="256" cy="256" r="200" fill="none" stroke="#E30613" stroke-width="36"/>
    <line x1="130" y1="130" x2="382" y2="382" stroke="#E30613" stroke-width="32"/>
    <line x1="382" y1="130" x2="130" y2="382" stroke="#E30613" stroke-width="32"/>`),
  B12: () =>
    wrap(
      `${prohibitCircle(`
      <line x1="160" y1="300" x2="352" y2="180" stroke="#111" stroke-width="16"/>
      <text x="256" y="340" text-anchor="middle" font-size="54" font-family="Arial" font-weight="700" fill="#111">3,5m</text>`)}
      <rect x="156" y="430" width="200" height="54" rx="6" fill="#fff" stroke="#111" stroke-width="4"/>
      <text x="256" y="468" text-anchor="middle" font-size="28" font-family="Arial" font-weight="700" fill="#111">10 km</text>`,
      512,
      520,
    ),
  B13: () =>
    wrap(
      prohibitCircle(`
      <text x="256" y="250" text-anchor="middle" font-size="42" font-family="Arial" font-weight="700" fill="#111">5,5 t</text>
      <line x1="170" y1="290" x2="342" y2="290" stroke="#111" stroke-width="10"/>
      <path d="M190,290 L190,340 L322,340 L322,290" fill="none" stroke="#111" stroke-width="10"/>`),
    ),
  B10a: () =>
    wrap(
      prohibitCircle(`
      <text x="256" y="270" text-anchor="middle" font-size="56" font-family="Arial" font-weight="700" fill="#111">10 m</text>
      <line x1="150" y1="300" x2="362" y2="300" stroke="#111" stroke-width="10"/>`),
    ),
  B9g: () =>
    wrap(
      prohibitCircle(`
      <circle cx="230" cy="300" r="28" fill="none" stroke="#111" stroke-width="10"/>
      <circle cx="310" cy="300" r="28" fill="none" stroke="#111" stroke-width="10"/>
      <path d="M210,240 L250,240 L280,280 L330,280" fill="none" stroke="#111" stroke-width="10"/>
      <line x1="120" y1="390" x2="392" y2="122" stroke="#E30613" stroke-width="28"/>`),
    ),
  B9c: () =>
    wrap(
      prohibitCircle(`
      <ellipse cx="256" cy="270" rx="70" ry="40" fill="none" stroke="#111" stroke-width="12"/>
      <circle cx="210" cy="320" r="18" fill="#111"/>
      <circle cx="300" cy="320" r="18" fill="#111"/>
      <line x1="120" y1="390" x2="392" y2="122" stroke="#E30613" stroke-width="28"/>`),
    ),
  B7b: () =>
    wrap(
      prohibitCircle(`
      <rect x="186" y="190" width="140" height="90" rx="10" fill="#111"/>
      <circle cx="220" cy="300" r="22" fill="#111"/>
      <circle cx="292" cy="300" r="22" fill="#111"/>
      <line x1="120" y1="390" x2="392" y2="122" stroke="#E30613" stroke-width="28"/>`),
    ),
  B15: () =>
    wrap(
      `${priorityDiamond(`
      <polygon points="256,150 310,300 202,300" fill="#111"/>`)}`,
    ),
  B16: () =>
    wrap(
      `${priorityDiamond(`
      <polygon points="256,340 310,190 202,190" fill="#111"/>`)}`,
    ),
  B27: () =>
    wrap(
      obligationCircle(`
      <rect x="170" y="200" width="172" height="70" rx="8" fill="#fff"/>
      <circle cx="210" cy="300" r="20" fill="#fff"/>
      <circle cx="302" cy="300" r="20" fill="#fff"/>
      <text x="256" y="248" text-anchor="middle" font-size="28" font-family="Arial" font-weight="700" fill="#0055A4">BUS</text>`),
    ),
  B45: () =>
    wrap(
      endCircle(`
      <rect x="170" y="180" width="172" height="70" rx="8" fill="#111"/>
      <text x="256" y="228" text-anchor="middle" font-size="28" font-family="Arial" font-weight="700" fill="#fff">BUS</text>`),
    ),
  B33: () =>
    wrap(
      prohibitCircle(`
      <rect x="150" y="200" width="80" height="45" rx="5" fill="#111"/>
      <rect x="280" y="250" width="100" height="55" rx="5" fill="#111"/>
      <line x1="120" y1="390" x2="392" y2="122" stroke="#E30613" stroke-width="28"/>`),
    ),
  B34: () =>
    wrap(
      endCircle(`
      <rect x="150" y="180" width="80" height="45" rx="5" fill="#111"/>
      <rect x="280" y="230" width="90" height="50" rx="5" fill="#111"/>`),
    ),
  B34a: () =>
    wrap(
      endCircle(`
      <rect x="150" y="170" width="80" height="40" rx="5" fill="#111"/>
      <rect x="270" y="220" width="100" height="55" rx="5" fill="#111"/>
      <text x="256" y="330" text-anchor="middle" font-size="26" font-family="Arial" font-weight="700" fill="#111">3,5 t</text>`),
    ),
  B14_50: () =>
    wrap(
      prohibitCircle(`
      <text x="256" y="290" text-anchor="middle" font-size="120" font-family="Arial Black, Arial" font-weight="700" fill="#111">50</text>`),
    ),
  B14_moto: () =>
    wrap(
      prohibitCircle(`
      <text x="256" y="250" text-anchor="middle" font-size="88" font-family="Arial Black, Arial" font-weight="700" fill="#111">60</text>
      <text x="256" y="330" text-anchor="middle" font-size="28" font-family="Arial" font-weight="700" fill="#111">moto / cyclo</text>`),
    ),
  B14_camion: () =>
    wrap(
      prohibitCircle(`
      <text x="256" y="240" text-anchor="middle" font-size="88" font-family="Arial Black, Arial" font-weight="700" fill="#111">60</text>
      <rect x="176" y="280" width="160" height="55" rx="6" fill="#111"/>`),
    ),
  B29: () =>
    wrap(
      obligationCircle(`
      <text x="256" y="290" text-anchor="middle" font-size="110" font-family="Arial Black, Arial" font-weight="700" fill="#fff">60</text>`),
    ),
  B25: () =>
    wrap(
      obligationCircle(`
      <text x="256" y="290" text-anchor="middle" font-size="110" font-family="Arial Black, Arial" font-weight="700" fill="#fff">30</text>`),
    ),
  B21c1: () =>
    wrap(
      obligationCircle(`
      <path d="M180,300 L256,300 L256,160" fill="none" stroke="#fff" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>
      <polygon points="256,120 300,190 212,190" fill="#fff"/>`),
    ),
  B21b: () =>
    wrap(
      obligationCircle(`
      <path d="M330,300 L256,300 L256,160" fill="none" stroke="#fff" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>
      <polygon points="256,120 300,190 212,190" fill="#fff"/>`),
    ),
  B31: () =>
    wrap(
      endCircle(`
      <text x="256" y="250" text-anchor="middle" font-size="42" font-family="Arial" font-weight="700" fill="#111">FIN</text>`),
    ),
  B43: () =>
    wrap(
      endCircle(`
      <text x="256" y="250" text-anchor="middle" font-size="90" font-family="Arial Black, Arial" font-weight="700" fill="#999">50</text>`),
    ),
  B2c: () =>
    wrap(
      prohibitCircle(`
      <path d="M180,300 A76,76 0 1,1 332,300" fill="none" stroke="#111" stroke-width="18"/>
      <polygon points="332,300 300,270 300,330" fill="#111"/>
      <line x1="120" y1="390" x2="392" y2="122" stroke="#E30613" stroke-width="28"/>`),
    ),
  G1: () =>
    wrap(`
    <rect x="96" y="96" width="320" height="320" rx="12" fill="#fff" stroke="#111" stroke-width="10" transform="rotate(45 256 256)"/>
    <line x1="150" y1="150" x2="362" y2="362" stroke="#111" stroke-width="28"/>
    <line x1="362" y1="150" x2="150" y2="362" stroke="#111" stroke-width="28"/>`),
  AB2: () =>
    wrap(`
    <polygon points="256,40 472,256 256,472 40,256" fill="#fff" stroke="#111" stroke-width="12"/>
    <polygon points="256,100 400,256 256,412 112,256" fill="#FFD200" stroke="#111" stroke-width="8"/>
    <line x1="180" y1="180" x2="332" y2="332" stroke="#111" stroke-width="22"/>
    <polygon points="256,150 300,240 212,240" fill="#111"/>`),
  AB4: () =>
    wrap(`
    <rect x="86" y="86" width="340" height="340" rx="24" fill="#E30613" stroke="#fff" stroke-width="14"/>
    <text x="256" y="290" text-anchor="middle" font-size="92" font-family="Arial Black, Arial" font-weight="700" fill="#fff">STOP</text>`),
  AB3a: () =>
    wrap(`
    <polygon points="256,460 40,60 472,60" fill="#fff" stroke="#111" stroke-width="14"/>
    <polygon points="256,400 100,100 412,100" fill="#fff" stroke="#E30613" stroke-width="28"/>`),
}

function writePng(order, signKey) {
  const make = SIGNS[signKey]
  if (!make) throw new Error(`Unknown sign ${signKey}`)
  fs.mkdirSync(TMP, { recursive: true })
  const svgPath = path.join(TMP, `${order}.svg`)
  fs.writeFileSync(svgPath, make())
  for (const dir of OUT_DIRS) {
    fs.mkdirSync(dir, { recursive: true })
    const pngPath = path.join(dir, `${order}.png`)
    execFileSync('convert', ['-background', 'white', svgPath, pngPath])
  }
}

function main() {
  const withImg = PART2.filter((q) => q.image)
  for (const q of withImg) {
    writePng(q.order, q.image)
    console.log(`OK ${q.order}.png (${q.image})`)
  }
  console.log(`Generated ${withImg.length} images`)
}

main()
