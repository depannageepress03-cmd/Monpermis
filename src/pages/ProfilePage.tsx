import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Trash2, User } from 'lucide-react'
import {
  changePassword,
  deleteAccount,
  updateProfile,
} from '../api/auth-password'
import { clearSession } from '../api/auth'
import { PageNavbar } from '../components/PageNavbar'
import { useAuth } from '../hooks/useAuth'
import { normalizePhone, validateName, validatePhone } from '../utils/validation'
import '../styles/auth.css'
import '../styles/learner.css'
import '../styles/login.css'

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, loading, updateUser } = useAuth()

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [profileMsg, setProfileMsg] = useState('')
  const [profileError, setProfileError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!user) return
    setFirstName(user.firstName ?? '')
    setLastName(user.lastName ?? '')
    setPhone(user.phone ?? '')
  }, [user])

  if (loading || !user) return null

  const isGoogle = user.authProvider === 'google'

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault()
    setProfileError('')
    setProfileMsg('')
    const nameErr =
      validateName(firstName, 'Le prénom') || validateName(lastName, 'Le nom') || validatePhone(phone)
    if (nameErr) {
      setProfileError(nameErr)
      return
    }
    setSavingProfile(true)
    try {
      const updated = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: normalizePhone(phone),
      })
      updateUser({ ...user, ...updated })
      setProfileMsg('Profil mis à jour')
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Mise à jour impossible')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwMsg('')
    if (newPassword.length < 8) {
      setPwError('Minimum 8 caractères')
      return
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setPwError('Majuscule, minuscule et chiffre requis')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('Les mots de passe ne correspondent pas')
      return
    }
    setSavingPw(true)
    try {
      await changePassword(currentPassword, newPassword)
      setPwMsg('Mot de passe modifié')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Modification impossible')
    } finally {
      setSavingPw(false)
    }
  }

  const handleDelete = async () => {
    setDeleteError('')
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      await deleteAccount({
        confirm: true,
        password: isGoogle ? undefined : deletePassword,
      })
      clearSession()
      navigate('/', { replace: true })
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Suppression impossible')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar title="Mon profil" icon={<User size={20} />} onBack={() => navigate('/accueil')} />

        <div className="auth-card learner-card" style={{ marginBottom: 12 }}>
          <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Adresse email</p>
          <strong>{user.email}</strong>
        </div>

        <form className="auth-card learner-card" onSubmit={handleSaveProfile} style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Mes informations</h2>
          {profileError ? <p className="signin-form-error">{profileError}</p> : null}
          {profileMsg ? <p style={{ color: '#16a34a', fontWeight: 600 }}>{profileMsg}</p> : null}
          <div className="signin-fields">
            <input
              className="auth-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Prénom"
            />
            <input
              className="auth-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Nom"
            />
            <input
              className="auth-input"
              value={phone}
              onChange={(e) => setPhone(normalizePhone(e.target.value))}
              placeholder="Téléphone"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={savingProfile} style={{ marginTop: 14 }}>
            {savingProfile ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>

        {isGoogle ? (
          <div className="auth-card learner-card" style={{ marginBottom: 12 }}>
            <p style={{ display: 'flex', gap: 8, alignItems: 'center', margin: 0, color: '#6b7280' }}>
              <Lock size={16} />
              Compte Google : le mot de passe est géré par Google.
            </p>
          </div>
        ) : (
          <form className="auth-card learner-card" onSubmit={handleChangePassword} style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Changer de mot de passe</h2>
            {pwError ? <p className="signin-form-error">{pwError}</p> : null}
            {pwMsg ? <p style={{ color: '#16a34a', fontWeight: 600 }}>{pwMsg}</p> : null}
            <div className="signin-fields">
              <input
                type="password"
                className="auth-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Mot de passe actuel"
              />
              <input
                type="password"
                className="auth-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
              />
              <input
                type="password"
                className="auth-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmer le mot de passe"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={savingPw} style={{ marginTop: 14 }}>
              {savingPw ? 'Modification…' : 'Modifier le mot de passe'}
            </button>
          </form>
        )}

        <div className="auth-card learner-card" style={{ borderColor: '#fecaca' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#b91c1c' }}>
            Zone sensible
          </h2>
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            La suppression du compte est définitive (profil, abonnements liés, notifications).
          </p>
          {deleteError ? <p className="signin-form-error">{deleteError}</p> : null}
          {confirmDelete && !isGoogle ? (
            <input
              type="password"
              className="auth-input"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Mot de passe pour confirmer"
              style={{ marginBottom: 12 }}
            />
          ) : null}
          <button
            type="button"
            className="btn-outline"
            style={{ color: '#b91c1c', borderColor: '#fecaca' }}
            disabled={deleting}
            onClick={() => void handleDelete()}
          >
            <Trash2 size={16} />
            {deleting
              ? 'Suppression…'
              : confirmDelete
                ? 'Confirmer la suppression'
                : 'Supprimer mon compte'}
          </button>
        </div>
      </div>
    </div>
  )
}
