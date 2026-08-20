import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandName } from '../components/BrandName'
import { markOnboardingDone } from '../utils/onboarding'
import '../styles/login.css'

const SLIDES = [
  {
    key: 'code',
    title: 'Code de la route',
    body: 'Révise les chapitres, entraîne-toi aux QCM, puis passe des sujets test et examens blancs.',
    image: '/onboarding/slide-code.jpg',
  },
  {
    key: 'conduite',
    title: 'Conduite',
    body: 'Cours vidéo gratuits, puis réserve tes heures avec un moniteur près de chez toi.',
    image: '/onboarding/slide-conduite.jpg',
  },
  {
    key: 'abo',
    title: 'Accès & paiement',
    body: 'Active ton accès en quelques secondes. Progresse à ton rythme, puis réserve ta conduite depuis l’app.',
    image: '/onboarding/slide-abo.jpg',
  },
] as const

export function OnboardingPage() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]
  const last = index >= SLIDES.length - 1

  const finish = () => {
    markOnboardingDone()
    navigate('/', { replace: true })
  }

  const next = () => {
    if (last) {
      finish()
      return
    }
    setIndex((value) => value + 1)
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-bg-stack" aria-hidden="true">
        {SLIDES.map((item, i) => (
          <img
            key={item.key}
            src={item.image}
            alt=""
            className={`onboarding-bg${i === index ? ' is-active' : ''}`}
          />
        ))}
      </div>
      <div className="onboarding-veil" aria-hidden="true" />
      <header className="onboarding-top">
        <BrandName onDark className="onboarding-brand" />
        <button type="button" className="onboarding-skip" onClick={finish}>
          Passer
        </button>
      </header>
      <div className="onboarding-copy" key={slide.key}>
        <p className="onboarding-kicker">Monpermis.bj</p>
        <h1>{slide.title}</h1>
        <p>{slide.body}</p>
      </div>
      <footer className="onboarding-footer">
        <div className="onboarding-dots" aria-hidden="true">
          {SLIDES.map((item, i) => (
            <span key={item.key} className={i === index ? 'is-active' : ''} />
          ))}
        </div>
        <button type="button" className="signin-btn-continue signin-btn-continue--app" onClick={next}>
          {last ? 'Commencer' : 'Suivant'}
        </button>
      </footer>
    </div>
  )
}
