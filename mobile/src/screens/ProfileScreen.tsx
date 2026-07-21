import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Lock, Mail, Trash2, User } from 'lucide-react-native'
import { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  changePassword,
  deleteAccount,
  getAuthErrorDetails,
  updateProfile,
} from '../api/auth'
import { AuthInput } from '../components/AuthInput'
import { Bouncy } from '../components/Bouncy'
import { DarkHeader, DarkScreen } from '../components/DarkScreen'
import { useAuth } from '../context/AuthContext'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'
import { normalizePhone, validateName, validatePhone } from '../utils/validation'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Profile'>

export function ProfileScreen() {
  const navigation = useNavigation<Nav>()
  const { user, updateUser, signOut } = useAuth()

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [profileErrors, setProfileErrors] = useState<{
    firstName?: string
    lastName?: string
    phone?: string
  }>({})
  const [profileMsg, setProfileMsg] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwErrors, setPwErrors] = useState<{
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
  }>({})
  const [pwMsg, setPwMsg] = useState<string | null>(null)
  const [savingPw, setSavingPw] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  const isGoogle = user?.authProvider === 'google'

  const handleSaveProfile = async () => {
    const errs = {
      firstName: validateName(firstName, 'Le prénom'),
      lastName: validateName(lastName, 'Le nom'),
      phone: validatePhone(phone),
    }
    if (Object.values(errs).some(Boolean)) {
      setProfileErrors(errs)
      return
    }
    setProfileErrors({})
    setProfileMsg(null)
    setSavingProfile(true)
    try {
      const { user: updated } = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: normalizePhone(phone),
      })
      await updateUser(updated)
      setProfileMsg('Profil mis à jour ✓')
    } catch (error) {
      setProfileErrors({ firstName: getAuthErrorDetails(error).message })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est définitive. Profil, abonnements liés et notifications seront effacés.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            if (!isGoogle && !deletePassword) {
              Alert.alert('Mot de passe requis', 'Saisis ton mot de passe pour confirmer.')
              return
            }
            setDeleting(true)
            void deleteAccount({
              confirm: true,
              password: isGoogle ? undefined : deletePassword,
            })
              .then(async () => {
                await signOut()
                navigation.reset({ index: 0, routes: [{ name: 'Intro' }] })
              })
              .catch((error) => {
                Alert.alert('Erreur', getAuthErrorDetails(error).message)
              })
              .finally(() => setDeleting(false))
          },
        },
      ],
    )
  }

  const handleChangePassword = async () => {
    const errs: typeof pwErrors = {}
    if (!currentPassword) errs.currentPassword = 'Mot de passe actuel requis'
    if (newPassword.length < 8) errs.newPassword = 'Minimum 8 caractères'
    else if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword))
      errs.newPassword = 'Majuscule, minuscule et chiffre requis'
    if (confirmPassword !== newPassword) errs.confirmPassword = 'Les mots de passe ne correspondent pas'
    if (Object.values(errs).some(Boolean)) {
      setPwErrors(errs)
      return
    }
    setPwErrors({})
    setPwMsg(null)
    setSavingPw(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setPwMsg('Mot de passe modifié ✓')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setPwErrors({ currentPassword: getAuthErrorDetails(error).message })
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <DarkScreen>
      <DarkHeader title="Mon profil" onBack={() => navigation.goBack()} icon={User} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.emailCard}>
            <Mail size={18} color={dark.textMuted} />
            <View style={styles.flexShrink}>
              <Text style={styles.emailLabel}>Adresse email</Text>
              <Text style={styles.emailValue} numberOfLines={1}>
                {user?.email}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Mes informations</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.half}>
                <AuthInput
                  label="Prénom"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  error={profileErrors.firstName}
                />
              </View>
              <View style={styles.half}>
                <AuthInput
                  label="Nom"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  error={profileErrors.lastName}
                />
              </View>
            </View>
            <AuthInput
              label="Téléphone"
              value={phone}
              onChangeText={(v) => setPhone(normalizePhone(v))}
              keyboardType="phone-pad"
              error={profileErrors.phone}
            />
            {profileMsg ? <Text style={styles.successMsg}>{profileMsg}</Text> : null}
            <Bouncy onPress={handleSaveProfile} disabled={savingProfile} scaleTo={0.97}>
              <View style={[styles.primaryBtn, savingProfile && styles.disabled]}>
                <Text style={styles.primaryBtnText}>
                  {savingProfile ? 'Enregistrement…' : 'Enregistrer'}
                </Text>
              </View>
            </Bouncy>
          </View>

          {isGoogle ? (
            <View style={styles.card}>
              <View style={styles.googleRow}>
                <Lock size={16} color={dark.textMuted} />
                <Text style={styles.googleText}>
                  Ton compte est connecté via Google. Le mot de passe est géré par Google.
                </Text>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Changer de mot de passe</Text>
              <View style={styles.card}>
                <AuthInput
                  label="Mot de passe actuel"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  error={pwErrors.currentPassword}
                />
                <AuthInput
                  label="Nouveau mot de passe"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  error={pwErrors.newPassword}
                />
                <AuthInput
                  label="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  error={pwErrors.confirmPassword}
                />
                {pwMsg ? <Text style={styles.successMsg}>{pwMsg}</Text> : null}
                <Bouncy onPress={handleChangePassword} disabled={savingPw} scaleTo={0.97}>
                  <View style={[styles.primaryBtn, savingPw && styles.disabled]}>
                    <Text style={styles.primaryBtnText}>
                      {savingPw ? 'Modification…' : 'Modifier le mot de passe'}
                    </Text>
                  </View>
                </Bouncy>
              </View>
            </>
          )}

          <Text style={styles.sectionTitle}>Zone sensible</Text>
          <View style={[styles.card, styles.dangerCard]}>
            <Text style={styles.dangerText}>
              La suppression du compte est définitive (profil, abonnements liés, notifications).
            </Text>
            {!isGoogle ? (
              <AuthInput
                label="Mot de passe pour confirmer"
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
              />
            ) : null}
            <Bouncy onPress={handleDeleteAccount} disabled={deleting} scaleTo={0.97}>
              <View style={[styles.dangerBtn, deleting && styles.disabled]}>
                <Trash2 size={16} color="#fff" />
                <Text style={styles.dangerBtnText}>
                  {deleting ? 'Suppression…' : 'Supprimer mon compte'}
                </Text>
              </View>
            </Bouncy>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flex: 1 },
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 8,
  },
  emailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  emailLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.textMuted,
  },
  emailValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: dark.textPrimary,
    marginTop: 12,
    marginBottom: 4,
    marginLeft: 2,
  },
  card: {
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 20,
    padding: 16,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: { flex: 1 },
  primaryBtn: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: dark.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  primaryBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#0B0F1A',
  },
  disabled: { opacity: 0.6 },
  successMsg: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: dark.green,
    textAlign: 'center',
  },
  googleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googleText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: dark.textMuted,
  },
  dangerCard: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  dangerText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: dark.textMuted,
  },
  dangerBtn: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#b91c1c',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    flexDirection: 'row',
    gap: 8,
  },
  dangerBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#fff',
  },
})
