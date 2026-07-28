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
import {
  createReservation,
  fetchMoniteurAvailability,
  fetchPublicMoniteurs,
  requestReservationSlot,
  ReservationError,
  type AvailabilityDay,
  type MoniteurPublic,
  type ReservationSlot,
} from '../../api/reservations'
import { fetchAccessMe } from '../../api/accessRequests'
import { DarkScreen } from '../../components/DarkScreen'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'
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

function formatDayChip(date: string) {
  try {
    const d = new Date(`${date}T12:00:00`)
    return {
      weekday: d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace(/\.$/, ''),
      day: String(d.getDate()),
      month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace(/\.$/, ''),
    }
  } catch {
    return { weekday: date, day: '', month: '' }
  }
}

function estimateHours(start: string, end: string) {
  const [sh, sm] = start.split(':').map((v) => parseInt(v, 10) || 0)
  const [eh, em] = end.split(':').map((v) => parseInt(v, 10) || 0)
  const raw = eh - sh + (em - sm) / 60
  return Math.max(0.5, Math.round(raw * 2) / 2)
}

export function ReservationFlowScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const [step, setStep] = useState<Step>('moniteur')
  const [moniteurId, setMoniteurId] = useState<string | undefined>(undefined)
  const [moniteurs, setMoniteurs] = useState<MoniteurPublic[]>([])
  const [availabilityDays, setAvailabilityDays] = useState<AvailabilityDay[]>([])
  const [hourlyPriceFcfa, setHourlyPriceFcfa] = useState(5000)
  const [selectedDate, setSelectedDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('09:00')
  const [selected, setSelected] = useState<ReservationSlot | null>(null)
  const [soldeHeures, setSoldeHeures] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [whatsappLink, setWhatsappLink] = useState('')
  const [calendarHint, setCalendarHint] = useState<{
    title: string
    date: string
    startTime: string
    endTime: string
  } | null>(null)

  const selectedMoniteur = useMemo(
    () => moniteurs.find((item) => item.id === moniteurId) ?? null,
    [moniteurs, moniteurId],
  )

  const selectedDay = useMemo(
    () => availabilityDays.find((day) => day.date === selectedDate) ?? null,
    [availabilityDays, selectedDate],
  )

  const vehicleType = selectedMoniteur?.vehicleTypes?.[0] || selected?.vehicleType || ''

  const previewHours = useMemo(() => {
    if (!startTime || !endTime || endTime <= startTime) return 0
    return estimateHours(startTime, endTime)
  }, [startTime, endTime])

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

  const loadAvailability = useCallback(async () => {
    if (!moniteurId) return
    setBusy(true)
    setError(null)
    try {
      const data = await fetchMoniteurAvailability({ moniteurId, days: 14 })
      setAvailabilityDays(data.days)
      setHourlyPriceFcfa(data.hourlyPriceFcfa || data.moniteur.defaultPriceFcfa || 5000)
      const first = data.days[0]
      if (first) {
        setSelectedDate(first.date)
        setStartTime(first.windows[0]?.start || '08:00')
        setEndTime(first.windows[0]?.end || '09:00')
      } else {
        setSelectedDate('')
      }
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Disponibilités indisponibles')
    } finally {
      setBusy(false)
    }
  }, [moniteurId])

  useEffect(() => {
    if (step === 'moniteur') void loadMoniteurs()
  }, [step, loadMoniteurs])

  useEffect(() => {
    if (step === 'calendar') void loadAvailability()
  }, [step, loadAvailability])

  useEffect(() => {
    fetchAccessMe()
      .then((data) => setSoldeHeures(data.user.soldeHeures))
      .catch(() => setSoldeHeures(null))
  }, [])

  useEffect(() => {
    if (!selectedDay?.windows?.length) return
    setStartTime(selectedDay.windows[0].start)
    setEndTime(selectedDay.windows[0].end)
  }, [selectedDay])

  const onRequestSlot = async () => {
    if (!moniteurId || !selectedDate || !startTime || !endTime) {
      setError('Choisissez un jour et une plage horaire')
      return
    }
    if (endTime <= startTime) {
      setError('L’heure de fin doit être après l’heure de début')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const data = await requestReservationSlot({
        moniteurId,
        date: selectedDate,
        startTime,
        endTime,
        vehicleType: vehicleType || 'voiture',
      })
      setSelected(data.creneau)
      setStep('payment')
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Plage indisponible')
      void loadAvailability()
    } finally {
      setBusy(false)
    }
  }

  const onConfirm = async () => {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      const chosenMoniteurId = moniteurId || selected.moniteur?.id
      const data = await createReservation({
        creneauId: String(selected.id),
        vehicleType: selected.vehicleType || vehicleType || 'voiture',
        moniteurId: chosenMoniteurId ? String(chosenMoniteurId) : undefined,
      })
      setWhatsappLink(data.whatsappLink)
      setCalendarHint(data.calendarHint)
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
    <DarkScreen>
        <PageNavbar
          title="Nouvelle séance"
          icon={CalendarPlus}
          onBack={() => navigation.goBack()}
          tone="drive"
        />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.stepsRow}>
            {[
              { id: 'moniteur', label: 'Moniteur' },
              { id: 'calendar', label: 'Horaires' },
              { id: 'payment', label: 'Confirmer' },
            ].map((item, index) => {
              const active =
                step === item.id ||
                (step === 'success' && item.id === 'payment') ||
                (step === 'calendar' && item.id === 'moniteur') ||
                (step === 'payment' && item.id !== 'payment')
              const current = step === item.id || (step === 'success' && item.id === 'payment')
              return (
                <View key={item.id} style={[styles.stepPill, current && styles.stepPillCurrent, active && !current && styles.stepPillDone]}>
                  <Text style={[styles.stepPillText, (current || active) && styles.stepPillTextActive]}>
                    {index + 1}. {item.label}
                  </Text>
                </View>
              )
            })}
          </View>

          {step === 'moniteur' ? (
            <View>
              <Text style={styles.introTitle}>Réserver une séance</Text>
              <Text style={styles.introText}>
                Choisissez votre moniteur, puis indiquez le jour et la plage horaire qui vous
                conviennent.
              </Text>

              <Text style={styles.section}>Choisissez un moniteur</Text>
              {busy ? <ActivityIndicator color={dark.green} /> : null}
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

              <Pressable
                style={[styles.primaryBtn, styles.calendarBtn, !moniteurId && styles.disabled]}
                disabled={!moniteurId}
                onPress={() => setStep('calendar')}
              >
                <Text style={styles.primaryBtnText}>Voir les disponibilités</Text>
              </Pressable>

              <View style={styles.tipsBox}>
                <Text style={styles.tipsTitle}>À savoir</Text>
                <Text style={styles.tipsItem}>• Présentez-vous à l’heure avec une pièce d’identité.</Text>
                <Text style={styles.tipsItem}>• Annulation possible jusqu’à 24 h avant.</Text>
                <Text style={styles.tipsItem}>• Les heures sont débitées de votre solde à la confirmation.</Text>
              </View>
            </View>
          ) : null}

          {step === 'calendar' ? (
            <View>
              <Text style={styles.introTitle}>Vos horaires</Text>
              <Text style={styles.introText}>
                Sélectionnez un jour libre, touchez une plage proposée, puis ajustez si besoin
                de telle heure à telle heure.
              </Text>

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

              {busy ? <ActivityIndicator color={dark.green} style={{ marginVertical: 12 }} /> : null}
              {availabilityDays.length === 0 && !busy ? (
                <Text style={styles.empty}>
                  Aucune disponibilité sur les 14 prochains jours. Changez de moniteur ou
                  réessayez plus tard.
                </Text>
              ) : null}

              <Text style={styles.section}>Jour</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayChipsRow}
              >
                {availabilityDays.map((day) => {
                  const active = selectedDate === day.date
                  const chip = formatDayChip(day.date)
                  return (
                    <Pressable
                      key={day.date}
                      disabled={busy}
                      onPress={() => setSelectedDate(day.date)}
                      style={[styles.dayChip, active && styles.dayChipActive]}
                    >
                      <Text style={[styles.dayChipWeekday, active && styles.dayChipTextActive]}>
                        {chip.weekday}
                      </Text>
                      <Text style={[styles.dayChipDay, active && styles.dayChipTextActive]}>
                        {chip.day}
                      </Text>
                      <Text style={[styles.dayChipMonth, active && styles.dayChipTextActive]}>
                        {chip.month}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              {selectedDay ? (
                <View style={styles.dayCard}>
                  <Text style={styles.dayTitle}>{formatDateLabel(selectedDay.date)}</Text>
                  <Text style={styles.fieldLabel}>Plages libres</Text>
                  <View style={styles.slotsRow}>
                    {selectedDay.windows.map((window) => {
                      const active = startTime === window.start && endTime === window.end
                      return (
                        <Pressable
                          key={`${window.start}-${window.end}`}
                          onPress={() => {
                            setStartTime(window.start)
                            setEndTime(window.end)
                          }}
                          style={[styles.windowChip, active && styles.windowChipActive]}
                        >
                          <Text style={[styles.windowChipText, active && styles.windowChipTextActive]}>
                            {window.start} – {window.end}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>

                  <Text style={styles.fieldLabel}>Votre horaire</Text>
                  <View style={styles.timeRow}>
                    <View style={styles.timeField}>
                      <Text style={styles.timeLabel}>De</Text>
                      <TextInput
                        value={startTime}
                        onChangeText={setStartTime}
                        placeholder="08:00"
                        placeholderTextColor={dark.textMuted}
                        style={styles.timeInput}
                        autoCapitalize="none"
                      />
                    </View>
                    <View style={styles.timeField}>
                      <Text style={styles.timeLabel}>À</Text>
                      <TextInput
                        value={endTime}
                        onChangeText={setEndTime}
                        placeholder="09:00"
                        placeholderTextColor={dark.textMuted}
                        style={styles.timeInput}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  {previewHours > 0 ? (
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationBadgeText}>
                        {previewHours} h · ~{' '}
                        {Math.round(hourlyPriceFcfa * previewHours).toLocaleString('fr-FR')} FCFA
                      </Text>
                    </View>
                  ) : null}

                  <Pressable
                    style={[styles.primaryBtn, busy && styles.disabled]}
                    disabled={busy}
                    onPress={() => void onRequestSlot()}
                  >
                    <Text style={styles.primaryBtnText}>
                      {busy ? 'Vérification…' : 'Continuer avec cet horaire'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <Pressable style={styles.secondaryBtn} onPress={() => setStep('moniteur')}>
                <Text style={styles.secondaryBtnText}>Changer de moniteur</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 'payment' && selected ? (
            <View>
              <Text style={styles.introTitle}>Confirmez votre réservation</Text>
              <Text style={styles.introText}>
                Vérifiez le récapitulatif. Les heures correspondantes seront débitées de
                votre solde prépayé dès la confirmation.
              </Text>
              <Text style={styles.section}>3. Récapitulatif</Text>
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
              </View>
              <Text style={styles.hint}>
                Solde actuel : {soldeHeures ?? '…'} h
                {soldeHeures !== null && soldeHeures <= 0
                  ? ' — insuffisant pour réserver. Achète un pack d’heures depuis Mon abonnement.'
                  : ''}
              </Text>
              <Pressable
                style={[styles.primaryBtn, (busy || soldeHeures === 0) && styles.disabled]}
                disabled={busy || soldeHeures === 0}
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
                <Check size={28} color={'#0B0F1A'} />
              </View>
              <Text style={styles.successTitle}>Séance réservée</Text>
              <Text style={styles.successText}>
                Votre séance est confirmée et apparaît dans votre espace Conduite.
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
      </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 32 },
  stepsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  stepPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: dark.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: dark.surface,
  },
  stepPillCurrent: {
    borderColor: dark.green,
    backgroundColor: dark.greenSoft,
  },
  stepPillDone: {
    borderColor: dark.border,
    opacity: 0.85,
  },
  stepPillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.textMuted,
  },
  stepPillTextActive: {
    color: dark.textPrimary,
  },
  introTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
    color: dark.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  introText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textMuted,
    marginBottom: 14,
  },
  tipsBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 14,
    backgroundColor: dark.greenSoft,
    borderWidth: 1,
    borderColor: dark.border,
    gap: 6,
  },
  tipsTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: dark.textPrimary,
    marginBottom: 4,
  },
  tipsItem: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: dark.textMuted,
  },
  section: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: dark.textPrimary,
    marginTop: 4,
    marginBottom: 12,
  },
  choice: {
    borderWidth: 1.5,
    borderColor: dark.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    backgroundColor: dark.surface,
  },
  choiceSelected: {
    backgroundColor: dark.coralSoft,
    borderColor: dark.coral,
  },
  choiceText: {
    color: dark.textPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  choiceTextSelected: { color: dark.textPrimary },
  moniteurRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  carThumb: {
    width: 68,
    height: 52,
    borderRadius: 10,
    backgroundColor: dark.surfaceRaised,
  },
  carPlaceholder: {
    width: 68,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: dark.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surfaceRaised,
  },
  carPlaceholderText: {
    fontSize: 10,
    color: dark.textMuted,
    fontFamily: fonts.bodySemiBold,
  },
  brandText: {
    marginTop: 2,
    fontSize: 12,
    color: dark.textMuted,
    fontFamily: fonts.bodySemiBold,
  },
  typeText: {
    marginTop: 2,
    fontSize: 12,
    color: dark.green,
    fontFamily: fonts.displayBold,
  },
  recapStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: dark.greenSoft,
    borderWidth: 1,
    borderColor: dark.border,
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: dark.green,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  calendarBtn: {
    marginTop: 16,
  },
  primaryBtnText: {
    color: '#0B0F1A',
    fontFamily: fonts.displayBold,
    fontSize: 15,
  },
  secondaryBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: dark.surface,
  },
  secondaryBtnText: {
    color: dark.textPrimary,
    fontFamily: fonts.bodyBold,
  },
  dayChipsRow: {
    gap: 10,
    paddingBottom: 4,
    paddingRight: 8,
  },
  dayChip: {
    width: 68,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  dayChipActive: {
    borderColor: dark.green,
    backgroundColor: dark.greenSoft,
  },
  dayChipWeekday: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: dark.textMuted,
    textTransform: 'capitalize',
  },
  dayChipDay: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 20,
    color: dark.textPrimary,
    lineHeight: 24,
  },
  dayChipMonth: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: dark.textMuted,
    textTransform: 'capitalize',
  },
  dayChipTextActive: {
    color: dark.textPrimary,
  },
  dayCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    padding: 14,
    marginTop: 14,
    marginBottom: 12,
    backgroundColor: dark.surface,
    gap: 8,
  },
  dayTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: dark.textMuted,
    marginTop: 4,
  },
  slotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  windowChip: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: dark.green,
    backgroundColor: dark.surfaceRaised,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  windowChipActive: {
    backgroundColor: dark.coralSoft,
    borderColor: dark.coral,
  },
  windowChipText: {
    fontFamily: fonts.bodyBold,
    color: dark.green,
    fontSize: 13,
  },
  windowChipTextActive: {
    color: dark.textPrimary,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  timeField: {
    flex: 1,
    gap: 6,
  },
  timeLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.textMuted,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: dark.textPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    backgroundColor: dark.bg,
  },
  durationBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 2,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: dark.greenSoft,
    borderWidth: 1,
    borderColor: dark.border,
  },
  durationBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: dark.textPrimary,
  },
  recap: {
    borderRadius: 14,
    backgroundColor: dark.greenSoft,
    borderWidth: 1,
    borderColor: dark.border,
    padding: 14,
    marginBottom: 12,
  },
  recapLine: {
    color: dark.textPrimary,
    fontFamily: fonts.bodySemiBold,
    marginBottom: 4,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
    lineHeight: 18,
    marginBottom: 10,
  },
  successBox: { alignItems: 'center', paddingTop: 12 },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: dark.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
    color: dark.textPrimary,
    marginBottom: 8,
  },
  successText: {
    textAlign: 'center',
    color: dark.textMuted,
    marginBottom: 16,
    lineHeight: 20,
    fontFamily: fonts.body,
  },
  empty: {
    color: dark.textMuted,
    marginBottom: 12,
    fontFamily: fonts.body,
  },
  error: {
    color: dark.coral,
    marginBottom: 10,
    fontFamily: fonts.bodySemiBold,
  },
  disabled: { opacity: 0.55 },
})
