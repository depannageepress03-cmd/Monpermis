import { useEffect, useRef } from 'react'

const BG = '#FAF9F6'
const GREEN = '#1FA857'
const YELLOW = '#F5B31B'
const NAVY = '#14263F'

export function IntroAnimation({ onDone }: { onDone: () => void }) {
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const totalLetters = 12
    const doneAt = 1600 + totalLetters * 40 + 1100
    const timer = setTimeout(() => {
      doneRef.current()
    }, doneAt)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: BG, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <style>{`
        @keyframes intro-fade-in {
          to { opacity: 1; }
        }
        @keyframes intro-drift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes intro-reveal {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes intro-dash-on {
          to { opacity: 1; }
        }
        @keyframes intro-travel {
          from { transform: translate(0, 0); }
          to { transform: translate(49px, -65px); }
        }
        @keyframes intro-shine {
          0%, 82% { transform: translateX(-120%); }
          94%, 100% { transform: translateX(120%); }
        }
        @keyframes intro-letter-in {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse 55% 45% at 50% 44%, #ffffff 0%, var(--bg, #FAF9F6) 70%)',
        opacity: 0, animation: 'intro-fade-in 1.6s ease-out forwards',
      }} />

      <div style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        alignItems: 'center', animation: 'intro-drift 11s ease-in-out 3s infinite',
      }}>
        <div style={{
          position: 'absolute', top: '56%', width: 180, height: 26,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(14,34,64,0.10), transparent 70%)',
          opacity: 0, animation: 'intro-fade-in 1.4s ease-out 0.8s forwards',
        }} />

        <svg
          viewBox="150 170 740 650"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Logo monpermis.bj"
          style={{ width: 'min(232px, 56vw)', height: 'auto', display: 'block', overflow: 'visible' }}
        >
          <defs>
            <clipPath id="intro-road">
              <path d="M819,278 L801,277 L784,287 L711,349 L655,404 L535,538 L341,768 L433,768 L501,680 L519,684 L520,689 L463,768 L555,768 L651,610 L699,541 L704,542 L704,752 L708,761 L719,768 L814,768 L825,761 L830,748 L830,298 L827,286 Z" />
            </clipPath>
          </defs>

          <path
            fill={GREEN}
            d="M211,222 L199,231 L195,242 L195,749 L206,766 L224,768 L249,749 L333,657 L333,510 L304,469 L303,462 L322,466 L375,444 L392,443 L404,447 L427,465 L496,401 L288,260 L229,224 Z"
            style={{
              opacity: 0, transform: 'translateY(10px)',
              animation: 'intro-reveal 1.6s cubic-bezier(.22, 1, .36, 1) 0.25s forwards',
            }}
          />

          <path
            fill={YELLOW}
            d="M830,218 L809,222 L770,238 L708,270 L633,316 L521,399 L429,480 L421,478 L398,458 L379,456 L328,477 L328,482 L435,599 L445,604 L632,393 L716,313 Z"
            style={{
              opacity: 0, transform: 'translateY(10px)',
              animation: 'intro-reveal 1.6s cubic-bezier(.22, 1, .36, 1) 0.45s forwards',
            }}
          />

          <g style={{
            opacity: 0, transform: 'translateY(10px)',
            animation: 'intro-reveal 1.6s cubic-bezier(.22, 1, .36, 1) 0.65s forwards',
          }}>
            <path fill={NAVY} d="M819,278 L801,277 L784,287 L711,349 L655,404 L535,538 L341,768 L433,768 L501,680 L519,684 L520,689 L463,768 L555,768 L651,610 L699,541 L704,542 L704,752 L708,761 L719,768 L814,768 L825,761 L830,748 L830,298 L827,286 Z" />

            <g clipPath="url(#intro-road)">
              <g fill="#ffffff">
                <path
                  d="M534,663 L518,658 L476,715 L494,720 Z"
                  style={{ opacity: 0, animation: 'intro-dash-on 0.7s ease-out 1.25s forwards' }}
                />
                <path
                  d="M583,598 L567,593 L525,650 L543,655 Z"
                  style={{ opacity: 0, animation: 'intro-dash-on 0.7s ease-out 1.35s forwards' }}
                />
                <path
                  d="M632,526 L622,522 L590,564 L603,569 Z"
                  style={{ opacity: 0, animation: 'intro-dash-on 0.7s ease-out 1.45s forwards' }}
                />
                <path
                  d="M675,462 L669,461 L641,496 L640,500 L647,503 L650,502 L675,466 Z"
                  style={{ opacity: 0, animation: 'intro-dash-on 0.7s ease-out 1.55s forwards' }}
                />
                <path
                  d="M712,415 L705,412 L688,435 L695,438 Z"
                  style={{ opacity: 0, animation: 'intro-dash-on 0.7s ease-out 1.65s forwards' }}
                />
              </g>
            </g>
          </g>
        </svg>

        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(115deg, transparent 42%, rgba(255,255,255,0.55) 50%, transparent 58%)',
            transform: 'translateX(-120%)', mixBlendMode: 'soft-light',
            animation: 'intro-shine 9s ease-in-out 4s infinite',
          }}
        />

        <Wordmark />
      </div>
    </div>
  )
}

function Wordmark() {
  const segments = [
    { text: 'mon', color: NAVY },
    { text: 'permis', color: NAVY },
    { text: '.bj', color: GREEN },
  ]

  const letters: { ch: string; color: string; delay: number }[] = []
  let i = 0
  for (const seg of segments) {
    for (const ch of seg.text) {
      letters.push({ ch, color: seg.color, delay: 1.6 + i * 0.04 })
      i++
    }
  }

  return (
    <div style={{
      marginTop: 'calc(min(232px, 56vw) * 0.078)',
      fontSize: 'calc(min(232px, 56vw) * 0.128)',
      fontWeight: 700, letterSpacing: '0.045em', display: 'flex',
    }}>
      {letters.map((l, idx) => (
        <span
          key={idx}
          style={{
            color: l.color,
            opacity: 0,
            transform: 'translateY(8px)',
            animation: `intro-letter-in 1s cubic-bezier(.22, 1, .36, 1) ${l.delay}s forwards`,
          }}
        >
          {l.ch}
        </span>
      ))}
    </div>
  )
}
