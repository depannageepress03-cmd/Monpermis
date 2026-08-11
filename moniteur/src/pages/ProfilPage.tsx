import { FormEvent, useCallback, useEffect, useState } from 'react'
import { fetchProfile, updateProfile, type MoniteurProfile } from '../api/portal'
import { getMoniteurToken, isAuthError, useMoniteurAuth } from '../context/MoniteurAuthContext'
import { fetchMoniteurMe } from '../api/auth'

export function ProfilPage() {
  const { moniteur } = useMoniteurAuth()
  const [profile, setProfile] = useState<MoniteurProfile | null>(null)
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProfile(token)
      setProfile(data.profile)
      setPhone(data.profile.phone || '')
      setCity(data.profile.city || '')
      setBio(data.profile.bio || '')
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const token = getMoniteurToken()
    if (!token) return
    if (newPassword && newPassword.length < 8) {
      setError('Nouveau mot de passe : minimum 8 caractères')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const payload: Parameters<typeof updateProfile>[1] = {
        phone: phone.trim(),
        city: city.trim(),
        bio: bio.trim(),
      }
      if (newPassword) {
        payload.currentPassword = currentPassword
        payload.newPassword = newPassword
      }
      const data = await updateProfile(token, payload)
      setProfile(data.profile)
      setCurrentPassword('')
      setNewPassword('')
      setSuccess('Profil mis à jour.')
      await fetchMoniteurMe(token).catch(() => null)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Mise à jour impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">Compte</p>
          <h1>Mon profil</h1>
          <p className="admin-muted">
            Informations visibles et mot de passe du portail. L’email de connexion est géré par
            l’administration.
          </p>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}
      {loading ? <p className="admin-muted">Chargement…</p> : null}

      {!loading && profile ? (
        <form className="admin-card" onSubmit={handleSubmit}>
          <div className="reserv-create-grid">
            <label>
              Nom
              <input value={profile.fullName || moniteur?.fullName || ''} disabled readOnly />
            </label>
            <label>
              Email
              <input value={profile.email} disabled readOnly />
            </label>
            <label>
              Téléphone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              Ville
              <input value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
          </div>
          <label style={{ display: 'block', marginTop: 12 }}>
            Présentation
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={2000}
              style={{ width: '100%' }}
            />
          </label>

          <h3 style={{ marginTop: 24 }}>Changer le mot de passe</h3>
          <div className="reserv-create-grid">
            <label>
              Mot de passe actuel
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <label>
              Nouveau mot de passe
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </label>
          </div>

          <div className="admin-actions-row" style={{ marginTop: 16 }}>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
