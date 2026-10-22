import { resolveMediaUrl } from '../api/client'
import type { ExamAttemptQuestion } from '../api/tracking'

export const QUESTION_STATE_LABELS: Record<ExamAttemptQuestion['state'], string> = {
  correct: 'Bonne réponse',
  wrong: 'Mauvaise réponse',
  skipped: 'Zappée (temps écoulé)',
  unanswered: 'Non répondue',
}

function formatSeconds(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m <= 0 ? `${s}s` : `${m} min ${s}s`
}

/** Une question d'un examen : énoncé, réponses proposées, réponse choisie et bonne réponse. */
export function QuestionReview({ question: q }: { question: ExamAttemptQuestion }) {
  const image = q.prompt.imageUrls[0]
  const chip =
    q.state === 'correct' ? 'cx-green' : q.state === 'wrong' ? 'cx-red' : q.state === 'skipped' ? 'cx-amber' : 'cx-slate'
  const origin =
    q.chapterOrder !== null
      ? `Chapitre ${q.chapterOrder}${q.questionNumber !== null ? ` · question ${q.questionNumber}` : ''}`
      : ''
  return (
    <li className={`cx-xr-q cx-${q.state}`}>
      <div className="cx-xr-qhead">
        <div>
          <strong>Question {q.index + 1}</strong>
          {origin ? <small> · {origin}</small> : null}
          {typeof q.elapsedMs === 'number' && q.elapsedMs >= 0 ? (
            <small> · {formatSeconds(q.elapsedMs / 1000)} de réflexion</small>
          ) : null}
        </div>
        <span className={`cx-chip ${chip}`}>{QUESTION_STATE_LABELS[q.state]}</span>
      </div>
      {!q.found ? (
        <p className="cx-note">Question introuvable dans la banque actuelle (id {q.questionId}) : correction à confirmer.</p>
      ) : (
        <div className={`cx-xr-qbody${image ? '' : ' cx-noimg'}`}>
          {image ? (
            <img src={resolveMediaUrl(image)} alt={`Illustration de la question ${q.index + 1}`} loading="lazy" />
          ) : null}
          <div>
            {q.prompt.text ? <p className="cx-xr-qtext">{q.prompt.text}</p> : null}
            {q.prompt.audioUrl ? <audio controls preload="none" src={resolveMediaUrl(q.prompt.audioUrl)} /> : null}
            {!q.correctionAvailable ? (
              <p className="cx-note cx-note-err">Aucune bonne réponse enregistrée pour cette question : correction à confirmer.</p>
            ) : null}
            <ul className="cx-xr-answers">
              {q.answers.map((a) => {
                const cls = a.isCorrect ? ' cx-is-correct' : a.selected ? ' cx-is-picked-bad' : ''
                return (
                  <li key={a.id} className={`cx-xr-ans${cls}`}>
                    <span className="cx-xr-letter">{a.label}</span>
                    <span className="cx-xr-atext">
                      {a.text ||
                        (a.audioUrl ? (
                          <audio controls preload="none" src={resolveMediaUrl(a.audioUrl)} />
                        ) : (
                          `Réponse ${a.label}`
                        ))}
                    </span>
                    <span className="cx-xr-tags">
                      {a.selected ? (
                        <span className={`cx-chip ${a.isCorrect ? 'cx-green' : 'cx-red'}`}>Choisie</span>
                      ) : null}
                      {a.isCorrect ? <span className="cx-chip cx-green">Bonne réponse</span> : null}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </li>
  )
}
