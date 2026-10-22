import PDFDocument from 'pdfkit'
import { formatNumberRanges, isValidCoefficient } from '../utils/gradeCalc.js'

const GREEN = '#0d8a62'
const INK = '#1b2a3a'
const SOFT = '#5b6b7b'
const LINE = '#d9e3ee'
const RED = '#c0392b'
const AMBER = '#a86f00'

const MARGIN = 40
const PAGE_W = 595.28
const PAGE_H = 841.89
const CONTENT_W = PAGE_W - MARGIN * 2
const BOTTOM = PAGE_H - 60

const MISSING = 'Non renseigné'

function fmtDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtNum(value) {
  if (value === null || value === undefined) return '—'
  return String(value).replace('.', ',')
}

function ensureSpace(doc, needed) {
  if (doc.y + needed > BOTTOM) {
    doc.addPage()
    doc.y = MARGIN
  }
}

function sectionTitle(doc, text) {
  ensureSpace(doc, 40)
  doc.moveDown(0.8)
  doc.font('Helvetica-Bold').fontSize(12).fillColor(GREEN).text(text, MARGIN, doc.y)
  const y = doc.y + 2
  doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y).lineWidth(1).strokeColor(GREEN).stroke()
  doc.y = y + 8
  doc.fillColor(INK)
}

/** Ligne « libellé : valeur » ; la valeur manquante est signalée en rouge, jamais inventée. */
function field(doc, x, y, width, label, value, missing = false) {
  doc.font('Helvetica').fontSize(8).fillColor(SOFT).text(label.toUpperCase(), x, y, { width })
  doc
    .font(missing ? 'Helvetica-Oblique' : 'Helvetica-Bold')
    .fontSize(10)
    .fillColor(missing ? RED : INK)
    .text(value, x, doc.y, { width })
  return doc.y
}

function distinct(rows, key) {
  return [...new Set(rows.map((r) => r[key]).filter(Boolean))]
}

function drawHeader(doc, report) {
  doc.rect(0, 0, PAGE_W, 78).fill(GREEN)
  doc.font('Helvetica-Bold').fontSize(20).fillColor('#ffffff').text('MONPERMIS.BJ', MARGIN, 22)
  doc.font('Helvetica').fontSize(11).text('Fiche de résultats — Code de la route', MARGIN, 48)
  doc
    .font('Helvetica')
    .fontSize(9)
    .text(`Édité le ${fmtDateTime(report.generatedAt)}`, MARGIN, 30, { width: CONTENT_W, align: 'right' })
  doc.y = 96
  doc.fillColor(INK)
}

function drawIdentity(doc, report) {
  const { learner, exams } = report
  const rows = exams.rows
  const scenes = distinct(rows, 'sceneName')
  const authors = distinct(rows, 'author')
  const someSceneMissing = rows.some((r) => !r.sceneName)
  const someAuthorMissing = rows.some((r) => !r.author)

  const fullName = `${learner.firstName} ${learner.lastName}`.trim()
  const colW = (CONTENT_W - 20) / 2
  const top = doc.y

  const leftEnd = (() => {
    let y = field(doc, MARGIN, top, colW, 'Nom et prénoms', fullName || MISSING, !fullName)
    y = field(doc, MARGIN, y + 6, colW, 'Téléphone', learner.phone || '—')
    y = field(doc, MARGIN, y + 6, colW, 'E-mail', learner.email || '—')
    y = field(doc, MARGIN, y + 6, colW, 'Date d’inscription', fmtDate(learner.registeredAt))
    return y
  })()

  const x2 = MARGIN + colW + 20
  const rightEnd = (() => {
    const sceneText = scenes.length ? scenes.join(' ; ') + (someSceneMissing ? ` (+ ${MISSING.toLowerCase()})` : '') : MISSING
    const authorText = authors.length ? authors.join(' ; ') + (someAuthorMissing ? ` (+ ${MISSING.toLowerCase()})` : '') : MISSING
    let y = field(doc, x2, top, colW, 'Nom de la scène / épreuve', sceneText, scenes.length === 0)
    y = field(doc, x2, y + 6, colW, 'Auteur du sujet', authorText, authors.length === 0)
    y = field(doc, x2, y + 6, colW, 'Identifiant', learner.id)
    return y
  })()

  doc.y = Math.max(leftEnd, rightEnd) + 12

  // Moyenne générale mise en avant
  const avg = exams.summary.average
  const boxY = doc.y
  doc.roundedRect(MARGIN, boxY, CONTENT_W, 46, 6).fillAndStroke('#f2fbf6', '#bfe8d2')
  doc.font('Helvetica').fontSize(9).fillColor(SOFT).text('MOYENNE GÉNÉRALE', MARGIN + 14, boxY + 9)
  doc
    .font('Helvetica-Bold')
    .fontSize(20)
    .fillColor(avg === null ? SOFT : GREEN)
    .text(avg === null ? 'Aucun sujet évalué' : `${fmtNum(avg)} / 20`, MARGIN + 14, boxY + 20)
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(SOFT)
    .text(
      `${exams.summary.evaluatedCount} sujet(s) évalué(s) · seuil de réussite des examens blancs : ${exams.passScore}/20`,
      MARGIN + 14,
      boxY + 18,
      { width: CONTENT_W - 28, align: 'right' },
    )
  doc.y = boxY + 56
  doc.fillColor(INK)
}

const COLS = [
  { key: 'n', title: 'N°', w: 22, align: 'center' },
  { key: 'subject', title: 'Sujet / scène', w: 130 },
  { key: 'author', title: 'Auteur', w: 85 },
  { key: 'total', title: 'Quest.', w: 28, align: 'center' },
  { key: 'treated', title: 'Trait.', w: 32, align: 'center' },
  { key: 'correct', title: 'Corr.', w: 32, align: 'center' },
  { key: 'incorrect', title: 'Inc.', w: 30, align: 'center' },
  { key: 'unanswered', title: 'Non tr.', w: 32, align: 'center' },
  { key: 'status', title: 'Statut', w: 62 },
  { key: 'note', title: 'Note /20', w: 36, align: 'center' },
  { key: 'coef', title: 'Coef.', w: 26, align: 'center' },
]

function drawTableHeader(doc) {
  const y = doc.y
  doc.rect(MARGIN, y, CONTENT_W, 22).fill('#eaf3fb')
  let x = MARGIN
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#3d5a73')
  for (const col of COLS) {
    doc.text(col.title, x + 2, y + 7, { width: col.w - 4, align: col.align || 'left', lineBreak: false })
    x += col.w
  }
  doc.y = y + 22
  doc.fillColor(INK)
}

function drawTable(doc, rows) {
  if (rows.length === 0) {
    doc.font('Helvetica-Oblique').fontSize(10).fillColor(SOFT).text('Aucun sujet composé pour le moment.', MARGIN, doc.y)
    doc.fillColor(INK)
    return
  }

  ensureSpace(doc, 60)
  drawTableHeader(doc)

  rows.forEach((row, index) => {
    const subjectW = COLS[1].w - 4
    const authorW = COLS[2].w - 4
    const subjectText = row.subject
    const sceneText = `Scène : ${row.sceneName || MISSING}`
    doc.font('Helvetica-Bold').fontSize(8)
    const h1 = doc.heightOfString(subjectText, { width: subjectW })
    doc.font('Helvetica').fontSize(7.5)
    const h2 = doc.heightOfString(sceneText, { width: subjectW })
    const h3 = doc.heightOfString(row.author || MISSING, { width: authorW })
    const rowH = Math.max(h1 + h2 + 8, h3 + 8, 22)

    if (doc.y + rowH > BOTTOM) {
      doc.addPage()
      doc.y = MARGIN
      drawTableHeader(doc)
    }

    const y = doc.y
    const muted = !row.counted
    const textColor = muted ? SOFT : INK
    if (index % 2 === 1) doc.rect(MARGIN, y, CONTENT_W, rowH).fill('#f8fbfe')
    doc.moveTo(MARGIN, y + rowH).lineTo(MARGIN + CONTENT_W, y + rowH).lineWidth(0.5).strokeColor(LINE).stroke()

    let x = MARGIN
    const cell = (col, text, opts = {}) => {
      doc
        .font(opts.bold ? 'Helvetica-Bold' : opts.italic ? 'Helvetica-Oblique' : 'Helvetica')
        .fontSize(opts.size || 8)
        .fillColor(opts.color || textColor)
        .text(text, x + 2, opts.y ?? y + 5, { width: col.w - 4, align: col.align || 'left' })
      x += col.w
    }

    cell(COLS[0], String(index + 1))
    // Sujet + scène (deux lignes dans la même cellule)
    doc.font('Helvetica-Bold').fontSize(8).fillColor(textColor).text(subjectText, x + 2, y + 5, { width: subjectW })
    doc
      .font(row.sceneName ? 'Helvetica' : 'Helvetica-Oblique')
      .fontSize(7.5)
      .fillColor(row.sceneName ? SOFT : RED)
      .text(sceneText, x + 2, y + 5 + h1 + 1, { width: subjectW })
    x += COLS[1].w
    cell(COLS[2], row.author || MISSING, { italic: !row.author, color: row.author ? textColor : RED })
    cell(COLS[3], String(row.total))
    cell(COLS[4], String(row.treated))
    cell(COLS[5], String(row.correct))
    cell(COLS[6], String(row.incorrect))
    cell(COLS[7], String(row.unanswered))
    cell(COLS[8], row.completed ? 'Terminé' : 'Non terminé', {
      bold: true,
      color: muted ? SOFT : row.completed ? GREEN : AMBER,
    })
    cell(COLS[9], row.note === null ? '—' : fmtNum(row.note), { bold: true })
    cell(COLS[10], fmtNum(row.coefficient))
    doc.y = y + rowH
  })

  doc.fillColor(INK)
  doc.y += 6
  doc
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor(SOFT)
    .text(
      'Chaque ligne est une tentative. Seule la meilleure tentative de chaque sujet compte dans la moyenne ; les autres sont affichées en gris. ' +
        'Questions non traitées = ratées. Note /20 = réponses correctes ÷ questions totales × 20.',
      MARGIN,
      doc.y,
      { width: CONTENT_W },
    )
  doc.fillColor(INK)
}

function drawErrorsDetail(doc, rows) {
  const detailed = rows.filter((r) => r.counted && (r.wrongNumbers.length || r.unansweredNumbers.length))
  if (detailed.length === 0) return
  doc.moveDown(0.6)
  doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text('Détail des erreurs par sujet (n° de question)', MARGIN, doc.y)
  doc.moveDown(0.2)
  for (const row of detailed) {
    ensureSpace(doc, 24)
    const wrong = row.wrongNumbers.length ? `fausses : ${formatNumberRanges(row.wrongNumbers)}` : 'aucune fausse'
    const unans = row.unansweredNumbers.length
      ? `non traitées : ${formatNumberRanges(row.unansweredNumbers)}`
      : 'aucune non traitée'
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(INK)
      .text(`${row.subject} — ${wrong} ; ${unans}.`, MARGIN, doc.y, { width: CONTENT_W })
  }
}

function drawSummary(doc, exams) {
  const s = exams.summary
  ensureSpace(doc, 120)
  const items = [
    ['Sujets évalués', s.evaluatedCount],
    ['Sujets terminés', s.completedCount],
    ['Sujets non terminés', s.unfinishedCount],
    ['Questions au total', s.totalQuestions],
    ['Réponses correctes', s.totalCorrect],
    ['Réponses incorrectes', s.totalIncorrect],
    ['Questions non traitées', s.totalUnanswered],
    ['Total ratées', s.totalFailed],
    ['Meilleure note', s.bestNote === null ? '—' : `${fmtNum(s.bestNote)}/20`],
    ['Note la plus faible', s.lowestNote === null ? '—' : `${fmtNum(s.lowestNote)}/20`],
  ]
  const perRow = 5
  const gap = 8
  const w = (CONTENT_W - gap * (perRow - 1)) / perRow
  const top = doc.y
  items.forEach(([label, value], i) => {
    const x = MARGIN + (i % perRow) * (w + gap)
    const y = top + Math.floor(i / perRow) * 44
    doc.roundedRect(x, y, w, 38, 4).lineWidth(0.7).strokeColor(LINE).stroke()
    doc.font('Helvetica').fontSize(7).fillColor(SOFT).text(label.toUpperCase(), x + 6, y + 6, { width: w - 12 })
    doc.font('Helvetica-Bold').fontSize(12).fillColor(INK).text(String(value), x + 6, y + 19, { width: w - 12 })
  })
  doc.y = top + Math.ceil(items.length / perRow) * 44 + 4

  // Calcul de la moyenne, vérifiable à la main
  const weighted = exams.rows.filter((r) => r.counted && r.note !== null && isValidCoefficient(r.coefficient))
  let formula
  if (weighted.length === 0) {
    formula = 'Moyenne non calculable : aucun sujet évalué (un sujet non évalué n’est jamais compté comme 0).'
  } else {
    const numerator = weighted.reduce((sum, r) => sum + r.note * Number(r.coefficient), 0)
    const terms =
      weighted.length <= 8
        ? weighted.map((r) => `${fmtNum(r.note)} × ${fmtNum(r.coefficient)}`).join(' + ')
        : `somme des (note × coefficient) = ${fmtNum(Math.round(numerator * 100) / 100)}`
    formula = `Moyenne générale = somme des (note × coefficient) ÷ somme des coefficients = (${terms}) ÷ ${fmtNum(s.coefficientSum)} = ${fmtNum(s.average)} / 20`
  }
  doc.font('Helvetica').fontSize(8.5).fillColor(INK).text(formula, MARGIN, doc.y, { width: CONTENT_W })
}

function drawCourse(doc, course) {
  ensureSpace(doc, 110)
  const pct = course.percent
  const top = doc.y

  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(
    `Leçons terminées : ${course.completed} / ${course.total}${pct === null ? '' : ` (${pct} %)`}`,
    MARGIN,
    top,
  )
  const barY = doc.y + 4
  doc.roundedRect(MARGIN, barY, CONTENT_W, 8, 4).fill('#e8eef5')
  if (pct) doc.roundedRect(MARGIN, barY, Math.max(8, (CONTENT_W * pct) / 100), 8, 4).fill(GREEN)
  doc.y = barY + 16

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(course.status === 'completed' || course.status === 'validated' ? GREEN : course.status === 'to_verify' ? RED : AMBER)
    .text(`Statut du cours : ${course.statusLabel}`, MARGIN, doc.y)
  doc
    .font('Helvetica')
    .fontSize(8.5)
    .fillColor(SOFT)
    .text(
      `${course.followed} suivie(s) (dont ${course.inProgress} en cours) · ${course.notStarted} non commencée(s) · ` +
        `${course.validated} validée(s) (leçon terminée + sujet test de son chapitre validé) · ` +
        `chapitres validés : ${course.chaptersValidated}/${course.chaptersTotal}`,
      MARGIN,
      doc.y + 2,
      { width: CONTENT_W },
    )

  doc.moveDown(0.6)
  if (course.remaining.length === 0) {
    if (course.total > 0) {
      doc.font('Helvetica').fontSize(9).fillColor(GREEN).text('Aucune leçon restante.', MARGIN, doc.y)
    }
  } else {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text(`Leçons restantes (${course.remaining.length})`, MARGIN, doc.y)
    doc.moveDown(0.2)
    const byChapter = new Map()
    for (const lesson of course.remaining) {
      const key = `${lesson.chapterOrder}|${lesson.chapterName}`
      if (!byChapter.has(key)) byChapter.set(key, [])
      byChapter.get(key).push(lesson)
    }
    for (const [key, lessons] of byChapter) {
      const [, name] = key.split('|')
      const text = lessons
        .map((l) => `${l.title}${l.state === 'in_progress' ? ' (en cours)' : ''}`)
        .join(' ; ')
      doc.font('Helvetica').fontSize(8)
      const h = doc.heightOfString(`${name} : ${text}`, { width: CONTENT_W })
      ensureSpace(doc, h + 4)
      doc
        .font('Helvetica-Bold')
        .fillColor(INK)
        .text(`${name} : `, MARGIN, doc.y, { width: CONTENT_W, continued: true })
        .font('Helvetica')
        .fillColor(SOFT)
        .text(text)
      doc.moveDown(0.15)
    }
  }
  doc.fillColor(INK)
}

function drawChecks(doc, report) {
  const lines = []
  for (const m of report.missingInfo) lines.push({ kind: 'Information manquante', text: m.label })
  for (const i of report.exams.issues) lines.push({ kind: 'Incohérence', text: i.message })
  for (const i of report.course.issues) lines.push({ kind: 'À vérifier', text: i.message })
  if (report.course.orphanCompleted > 0) {
    lines.push({
      kind: 'À vérifier',
      text: `${report.course.orphanCompleted} leçon(s) terminée(s) par l’élève ne figurent plus au programme publié (non comptées).`,
    })
  }
  if (lines.length === 0) return
  sectionTitle(doc, 'Informations manquantes et points à vérifier')
  for (const line of lines) {
    ensureSpace(doc, 16)
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(RED)
      .text(`${line.kind} : `, MARGIN, doc.y, { width: CONTENT_W, continued: true })
      .font('Helvetica')
      .fillColor(INK)
      .text(line.text)
  }
}

function drawFooters(doc, report) {
  const range = doc.bufferedPageRange()
  const name = `${report.learner.firstName} ${report.learner.lastName}`.trim() || 'élève'
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i)
    // Évite qu'un texte placé dans la marge basse ne déclenche une nouvelle page.
    const prevBottom = doc.page.margins.bottom
    doc.page.margins.bottom = 0
    doc.moveTo(MARGIN, PAGE_H - 44).lineTo(MARGIN + CONTENT_W, PAGE_H - 44).lineWidth(0.5).strokeColor(LINE).stroke()
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(SOFT)
      .text(
        `Fiche de ${name} — données de cet élève uniquement — éditée le ${fmtDateTime(report.generatedAt)}`,
        MARGIN,
        PAGE_H - 36,
        { width: CONTENT_W - 60, lineBreak: false },
      )
    doc.text(`Page ${i - range.start + 1} / ${range.count}`, MARGIN, PAGE_H - 36, {
      width: CONTENT_W,
      align: 'right',
      lineBreak: false,
    })
    doc.page.margins.bottom = prevBottom
  }
}

/** Fabrique le PDF d'UN apprenant à partir de son rapport (voir buildLearnerReport). */
export function createLearnerReportPdf(report) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    bufferPages: true,
    info: {
      Title: `Fiche de résultats — ${report.learner.firstName} ${report.learner.lastName}`.trim(),
      Author: 'Monpermis.bj',
      Subject: 'Résultats et progression — Code de la route',
    },
  })

  drawHeader(doc, report)
  drawIdentity(doc, report)

  sectionTitle(doc, 'Résultats aux examens blancs')
  drawTable(doc, report.exams.rows)
  drawErrorsDetail(doc, report.exams.rows)

  sectionTitle(doc, 'Synthèse des résultats')
  drawSummary(doc, report.exams)

  sectionTitle(doc, 'Progression dans le cours du Code de la route')
  drawCourse(doc, report.course)

  drawChecks(doc, report)
  drawFooters(doc, report)
  doc.end()
  return doc
}

export function reportPdfFileName(report) {
  const base = `fiche-${report.learner.firstName}-${report.learner.lastName}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `${base || 'fiche-eleve'}.pdf`
}
