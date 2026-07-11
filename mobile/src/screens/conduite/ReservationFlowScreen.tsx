import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Check, CalendarPlus } from 'lucide-react-native'
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  createReservation,
  fetchAvailableCreneaux,
  fetchPublicMoniteurs,
  lockCreneau,
  ReservationError,
  submitPaymentRef,
  type MoniteurPublic,
  type ReservationSlot,
} from '../../api/reservations'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { brand, colors } from '../../theme'
import { resolveMediaUrl } from '../../utils/mediaUrl'

type Nav = NativeStackNavigationProp<RootStackParamList, 'ReservationFlow'>
type Step = 'moniteur' | 'calendar' | 'payment' | 'success'

function formatDateLabel(date: string) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return date
  }
}

export function ReservationFlowScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const [step, setStep] = useState<Step>('moniteur')
  const [moniteurId, setMoniteurId] = useState<string | undefined>(undefined)
  const [moniteurs, setMoniteurs] = useState<MoniteurPublic[]>([])
  const [days, setDays] = useState<{ date: string; creneaux: ReservationSlot[] }[]>([])
  const [selected, setSelected] = useState<ReservationSlot | null>(null)
  const [paymentRef, setPaymentRef] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [whatsappLink, setWhatsappLink] = useState('')
  const [calendarHint, setCalendarHint] = useState<{
    title: string
    date: string
    startTime: string
    endTime: string
  } | null>(null)
  const [reservationId, setReservationId] = useState<string | null>(null)

  const selectedMoniteur = useMemo(
    () => moniteurs.find((item) => item.id === moniteurId) ?? null,
    [moniteurs, moniteurId],
  )

  const vehicleType = selectedMoniteur?.vehicleTypes?.[0] || selected?.vehicleType || ''

  const loadMoniteurs = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await fetchPublicMoniteurs()
      setMoniteurs(data.moniteurs)
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Moniteurs indisponibles')
    } finally {
      setBusy(false)
    }
  }, [])

  const loadCreneaux = useCallback(async () => {
    if (!moniteurId) return
    setBusy(true)
    setError(null)
    try {
      const data = await fetchAvailableCreneaux({
        ...(vehicleType ? { vehicleType } : {}),
        moniteurId,
        days: 14,
      })
      setDays(data.days)
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Créneaux indisponibles')
    } finally {
      setBusy(false)
    }
  }, [vehicleType, moniteurId])

  useEffect(() => {
    if (step === 'moniteur') void loadMoniteurs()
  }, [step, loadMoniteurs])

  useEffect(() => {
    if (step === 'calendar') void loadCreneaux()
  }, [step, loadCreneaux])

  const selectedPrice = selected?.priceFcfa ?? 0

  const onSelectSlot = async (slot: ReservationSlot) => {
    if (!slot.available) return
    setBusy(true)
    setError(null)
    try {
      await lockCreneau(String(slot.id))
      setSelected(slot)
      setStep('payment')
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Créneau indisponible')
      void loadCreneaux()
    } finally {
      setBusy(false)
    }
  }

  const onConfirm = async () => {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      await lockCreneau(String(selected.id))
      const chosenMoniteurId = moniteurId || selected.moniteur?.id
      const data = await createReservation({
        creneauId: String(selected.id),
        vehicleType: selected.vehicleType || vehicleType || 'voiture',
        moniteurId: chosenMoniteurId ? String(chosenMoniteurId) : undefined,
        paymentRef: paymentRef.trim() || undefined,
      })
      setReservationId(String(data.reservation.id))
      setWhatsappLink(data.whatsappLink)
      setCalendarHint(data.calendarHint)
      if (paymentRef.trim() && data.reservation.id) {
        await submitPaymentRef(String(data.reservation.id), paymentRef.trim())
      }
      setStep('success')
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Réservation impossible')
    } finally {
      setBusy(false)
    }
  }

  const calendarUrl = useMemo(() => {
    if (!calendarHint) return ''
    const start = `${calendarHint.date.replace(/-/g, '')}T${calendarHint.startTime.replace(':', '')}00`
    const end = `${calendarHint.date.replace(/-/g, '')}T${calendarHint.endTime.replace(':', '')}00`
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      calendarHint.title,
    )}&dates=${start}/${end}`
  }, [calendarHint])

  if (loading || !user) return <ScreenLoader />

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <PageNavbar
          title="Nouvelle séance"
          icon={CalendarPlus}
          onBack={() => navigation.goBack()}
          tone="drive"
        />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {step === 'moniteur' ? (
            <View>
              <Text style={styles.introTitle}>Réserver votre prochaine séance</Text>
              <Text style={styles.introText}>
                Choisissez d’abord le moniteur avec lequel vous souhaitez conduire. Chaque
                profil affiche la photo du véhicule, la marque et le type pour vous aider à
                décider.
              </Text>
              <Text style={styles.introText}>
                Ensuite, consultez les créneaux libres sur 14 jours, confirmez la séance et
                transmettez votre référence Mobile Money pour validation.
              </Text>

              <Text style={styles.section}>1. Choisissez un moniteur</Text>
              <Text style={styles.hint}>
                Touchez une carte pour la sélectionner. Elle apparaîtra en surbrillance avant
                d’ouvrir le calendrier.
              </Text>
              {busy ? <ActivityIndicator color={brand.green} /> : null}
              {!busy && moniteurs.length === 0 ? (
                <Text style={styles.empty}>
                  Aucun moniteur disponible pour le moment. Revenez plus tard ou contactez
                  l’auto-école.
                </Text>
              ) : null}
              {moniteurs.map((moniteur) => {
                const active = moniteurId === moniteur.id
                return (
                  <Pressable
                    key={moniteur.id}
                    style={[styles.choice, active && styles.choiceSelected]}
                    onPress={() => setMoniteurId(moniteur.id)}
                  >
                    <View style={styles.moniteurRow}>
                      {moniteur.vehiclePhotoUrl ? (
                        <Image
                          source={{ uri: resolveMediaUrl(moniteur.vehiclePhotoUrl) }}
                          style={styles.carThumb}
                        />
                      ) : (
                        <View style={styles.carPlaceholder}>
                          <Text style={styles.carPlaceholderText}>Véhicule</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.choiceText, active && styles.choiceTextSelected]}>
                          {moniteur.fullName}
                        </Text>
                        <Text style={styles.brandText}>
                          {moniteur.vehicleBrand || 'Marque non renseignée'}
                        </Text>
                        <Text style={styles.typeText}>
                          {moniteur.vehicleTypes?.[0] || 'Véhicule'}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                )
              })}

              <Text style={styles.selectedHint}>
                {selectedMoniteur
                  ? `Moniteur sélectionné : ${selectedMoniteur.fullName}${
                      selectedMoniteur.vehicleBrand
                        ? ` · ${selectedMoniteur.vehicleBrand}`
                        : ''
                    }. Vous pouvez ouvrir le calendrier.`
                  : 'Sélectionnez un moniteur pour activer le bouton ci-dessous.'}
              </Text>

              <Pressable
                style={[styles.primaryBtn, styles.calendarBtn, !moniteurId && styles.disabled]}
                disabled={!moniteurId}
                onPress={() => setStep('calendar')}
              >
                <Text style={styles.primaryBtnText}>Voir le calendrier</Text>
              </Pressable>

              <View style={styles.tipsBox}>
                <Text style={styles.tipsTitle}>À savoir avant de réserver</Text>
                <Text style={styles.tipsItem}>
                  • Présentez-vous à l’heure avec vos documents d’identité.
                </Text>
                <Text style={styles.tipsItem}>
                  • Annulation possible jusqu’à 24 h avant, avec une justification.
                </Text>
                <Text style={styles.tipsItem}>
                  • La réservation apparaît ensuite dans Conduite et chez l’administration.
                </Text>
              </View>
            </View>
          ) : null}

          {step === 'calendar' ? (
            <View>
              <Text style={styles.introTitle}>Choisissez un créneau libre</Text>
              <Text style={styles.introText}>
                Les horaires verts sont disponibles. Les créneaux grisés sont déjà pris ou
                temporairement verrouillés. Sélectionnez l’horaire qui vous convient.
              </Text>
              <Text style={styles.section}>2. Créneaux disponibles</Text>
              {selectedMoniteur ? (
                <View style={styles.recapStrip}>
                  {selectedMoniteur.vehiclePhotoUrl ? (
                    <Image
                      source={{ uri: resolveMediaUrl(selectedMoniteur.vehiclePhotoUrl) }}
                      style={styles.carThumb}
                    />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.choiceText}>{selectedMoniteur.fullName}</Text>
                    <Text style={styles.brandText}>
                      {selectedMoniteur.vehicleBrand || 'Véhicule'} · {vehicleType}
                    </Text>
                  </View>
                </View>
              ) : null}
              <Text style={styles.hint}>
                Affichage sur les 14 prochains jours
                {selectedMoniteur ? ` pour ${selectedMoniteur.fullName}` : ''}.
              </Text>
              {busy ? <ActivityIndicator color={brand.green} /> : null}
              {days.length === 0 && !busy ? (
                <Text style={styles.empty}>
                  Aucun créneau libre sur cette période. Changez de moniteur ou réessayez
                  plus tard.
                </Text>
              ) : null}
              {days.map((day) => (
                <View key={day.date} style={styles.dayCard}>
                  <Text style={styles.dayTitle}>{formatDateLabel(day.date)}</Text>
                  <View style={styles.slotsRow}>
                    {day.creneaux.map((slot) => {
                      const selectedSlot = selected?.id === slot.id
                      const unavailable = !slot.available
                      return (
                        <Pressable
                          key={slot.id}
                          disabled={unavailable || busy}
                          onPress={() => void onSelectSlot(slot)}
                          style={[
                            styles.slot,
                            unavailable && styles.slotUnavailable,
                            selectedSlot && styles.slotSelected,
                            !unavailable && !selectedSlot && styles.slotAvailable,
                          ]}
                        >
                          <Text
                            style={[
                              styles.slotText,
                              unavailable && styles.slotTextUnavailable,
                              selectedSlot && styles.slotTextSelected,
                            ]}
                          >
                            {slot.startTime}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
              ))}
              <Pressable style={styles.secondaryBtn} onPress={() => setStep('moniteur')}>
                <Text style={styles.secondaryBtnText}>Changer de moniteur</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 'payment' && selected ? (
            <View>
              <Text style={styles.introTitle}>Confirmez et payez</Text>
              <Text style={styles.introText}>
                Vérifiez le récapitulatif. Indiquez la référence Mobile Money (Moov / MTN)
                pour validation. Sans référence, la demande reste en attente.
              </Text>
              <Text style={styles.section}>3. Récapitulatif & paiement</Text>
              <View style={styles.recap}>
                {selectedMoniteur?.vehiclePhotoUrl ? (
                  <Image
                    source={{ uri: resolveMediaUrl(selectedMoniteur.vehiclePhotoUrl) }}
                    style={[styles.carThumb, { marginBottom: 10 }]}
                  />
                ) : null}
                <Text style={styles.recapLine}>
                  {selected.date} · {selected.startTime} – {selected.endTime}
                </Text>
                <Text style={styles.recapLine}>
                  {selectedMoniteur?.fullName || selected.moniteur?.fullName || 'Moniteur'} ·{' '}
                  {selectedMoniteur?.vehicleBrand || 'Véhicule'} ·{' '}
                  {selected.vehicleType || vehicleType}
                </Text>
                <Text style={styles.price}>{selectedPrice.toLocaleString('fr-FR')} FCFA</Text>
              </View>
              <Text style={styles.hint}>
                Exemple : MTN-123456 ou le numéro de transaction reçu par SMS.
              </Text>
              <TextInput
                style={styles.input}
                value={paymentRef}
                onChangeText={setPaymentRef}
                placeholder="Réf. Mobile Money"
                placeholderTextColor={brand.navyMuted}
              />
              <Pressable
                style={[styles.primaryBtn, busy && styles.disabled]}
                disabled={busy}
                onPress={() => void onConfirm()}
              >
                <Text style={styles.primaryBtnText}>
                  {busy ? 'Confirmation…' : 'Confirmer la réservation'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {step === 'success' ? (
            <View style={styles.successBox}>
              <View style={styles.successIcon}>
                <Check size={28} color={colors.white} />
              </View>
              <Text style={styles.successTitle}>Séance réservée</Text>
              <Text style={styles.successText}>
                Votre demande est enregistrée
                {reservationId ? ' et en attente de validation du paiement' : ''}. Elle
                apparaît dans votre espace Conduite.
              </Text>
              <Text style={styles.successText}>
                Ajoutez la séance à votre agenda ou notifiez votre moniteur via WhatsApp.
              </Text>
              {calendarUrl ? (
                <Pressable style={styles.secondaryBtn} onPress={() => void Linking.openURL(calendarUrl)}>
                  <Text style={styles.secondaryBtnText}>Ajouter à mon agenda</Text>
                </Pressable>
              ) : null}
              {whatsappLink ? (
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => void Linking.openURL(whatsappLink)}
                >
                  <Text style={styles.secondaryBtnText}>Notifier par WhatsApp</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('Conduite')}>
                <Text style={styles.primaryBtnText}>Retour au tableau de bord</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 14, paddingBottom: 32 },
  introTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: brand.navy,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    lineHeight: 21,
    color: brand.navyMuted,
    marginBottom: 10,
  },
  selectedHint: {
    marginTop: 8,
    marginBottom: 4,
    fontSize: 13,
    lineHeight: 19,
    color: brand.navyMuted,
  },
  tipsBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    backgroundColor: brand.greenLight,
    borderWidth: 1,
    borderColor: `${brand.green}35`,
    gap: 6,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: brand.navy,
    marginBottom: 4,
  },
  tipsItem: {
    fontSize: 13,
    lineHeight: 19,
    color: brand.navyMuted,
  },
  section: {
    fontSize: 15,
    fontWeight: '800',
    color: brand.navy,
    marginTop: 8,
    marginBottom: 12,
  },
  choice: {
    borderWidth: 1.5,
    borderColor: brand.green,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.white,
  },
  choiceSelected: {
    backgroundColor: brand.gold,
    borderColor: brand.gold,
  },
  choiceText: { color: brand.navy, fontWeight: '700', fontSize: 15 },
  choiceTextSelected: { color: brand.navy },
  moniteurRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  carThumb: { width: 64, height: 48, borderRadius: 8, backgroundColor: '#EEF1F4' },
  carPlaceholder: {
    width: 64,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${brand.navy}18`,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  carPlaceholderText: { fontSize: 10, color: brand.navyMuted, fontWeight: '600' },
  brandText: { marginTop: 2, fontSize: 12, color: brand.navyMuted, fontWeight: '600' },
  typeText: { marginTop: 2, fontSize: 12, color: brand.green, fontWeight: '800' },
  recapStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    padding: 10,
    borderRadius: 12,
    backgroundColor: brand.greenLight,
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: brand.green,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  calendarBtn: {
    marginTop: 16,
  },
  primaryBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  secondaryBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: `${brand.navy}22`,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  secondaryBtnText: { color: brand.navy, fontWeight: '700' },
  dayCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${brand.navy}12`,
    padding: 12,
    marginBottom: 12,
    backgroundColor: colors.white,
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: brand.navy,
    marginBottom: 10,
    textTransform: 'capitalize',
  },
  slotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    minWidth: 72,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  slotAvailable: {
    borderColor: brand.green,
    backgroundColor: colors.white,
  },
  slotSelected: {
    borderColor: brand.gold,
    backgroundColor: brand.gold,
  },
  slotUnavailable: {
    borderColor: `${brand.navy}18`,
    backgroundColor: '#EEF1F4',
    opacity: 0.55,
  },
  slotText: { fontWeight: '700', color: brand.green },
  slotTextSelected: { color: brand.navy },
  slotTextUnavailable: { color: brand.navyMuted },
  recap: {
    borderRadius: 14,
    backgroundColor: brand.greenLight,
    borderWidth: 1,
    borderColor: `${brand.green}35`,
    padding: 14,
    marginBottom: 12,
  },
  recapLine: { color: brand.navy, fontWeight: '600', marginBottom: 4 },
  price: { marginTop: 8, fontSize: 22, fontWeight: '800', color: brand.navy },
  hint: { fontSize: 13, color: brand.navyMuted, lineHeight: 18, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: `${brand.navy}18`,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: brand.navy,
    marginBottom: 8,
  },
  successBox: { alignItems: 'center', paddingTop: 12 },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: brand.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: brand.navy, marginBottom: 8 },
  successText: {
    textAlign: 'center',
    color: brand.navyMuted,
    marginBottom: 16,
    lineHeight: 20,
  },
  empty: { color: brand.navyMuted, marginBottom: 12 },
  error: { color: '#B91C1C', marginBottom: 10, fontWeight: '600' },
  disabled: { opacity: 0.7 },
})
