import { ClipboardCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageNavbar } from '../../components/PageNavbar'
import { useAuth } from '../../hooks/useAuth'
import '../../styles/auth.css'
import '../../styles/learner.css'

interface CategoryDetailPageProps {
  title: string
  description: string
}

export function CategoryDetailPage({ title, description }: CategoryDetailPageProps) {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  if (loading || !user) return null

  return (
    <div className="auth-page">
      <div className="auth-container">
        <PageNavbar
          title={title}
          icon={<ClipboardCheck size={22} />}
          onBack={() => navigate('/code-de-la-route')}
        />

        <div className="auth-card">
          <h2>Bientôt disponible</h2>
          <p className="subtitle">{description}</p>
        </div>
      </div>
    </div>
  )
}
