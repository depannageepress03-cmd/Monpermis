import { useMemo } from 'react'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { CalendarPlus, Check } from 'lucide-react-native'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { DarkScreen } from '../../components/DarkScreen'
import { PageNavbar } from '../../components/PageNavbar'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'
import { safeOpenUrl } from '../../utils/safeOpenUrl'

type Nav = NativeStackNavigationProp<RootStackParamList, 'ReservationConfirm'>
type Route = RouteProp<RootStackParamList, 'ReservationConfirm'>

function formatDateLabel(date: string) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return date
  }
}

export function ReservationConfirmScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const {
    moniteurName,
    vehicleBrand,
    date,
    startTime,
    endTime,
    hours,
    priceFcfa,
    paymentMethod,
    whatsappLink,
    fromList,
  } = route.params

  const calendarUrl = useMemo(() => {
    if (!date || !startTime || !endTime) return ''
    const start = `${date.replace(/-/g, '')}T${startTime.replace(':', '')}00`
    const end = `${date.replace(/-/g, '')}T${endTime.replace(':', '')}00`
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      'Séance de conduite — Monpermis.bj',
    )}&dates=${start}/${end}`
  }, [date, startTime, endTime])

  return (
    <DarkScreen>
      <PageNavbar
        title={fromList ? 'Détail de la séance' : 'Réservation confirmée'}
        icon={CalendarPlus}
        onBack={() => {
          if (fromList) navigation.goBack()
          else navigation.navigate('MesReservations')
        }}
        tone="drive"
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!fromList ? (
          <View style={styles.successIcon}>
            <Check size={32} color="#0B0F1A" />
          </View>
        ) : null}
        <Text style={styles.title}>
          {fromList ? 'Séance confirmée' : 'Votre réservation est confirmée'}
        </Text>
        <Text style={styles.subtitle}>
          {fromList
            ? 'Voici les détails de votre séance de conduite.'
            : 'La séance a bien été prise en compte. Conservez ces informations.'}
        </Text>

        <View style={styles.card}>
          <Text style={styles.rowLabel}>Moniteur</Text>
          <Text style={styles.rowValue}>{moniteurName}</Text>
          {vehicleBrand ? (
            <>
              <Text style={styles.rowLabel}>Véhicule</Text>
              <Text style={styles.rowValue}>{vehicleBrand}</Text>
            </>
          ) : null}
          <Text style={styles.rowLabel}>Date</Text>
          <Text style={styles.rowValue}>{formatDateLabel(date)}</Text>
          <Text style={styles.rowLabel}>Horaire</Text>
          <Text style={styles.rowValue}>
            {startTime} – {endTime}
          </Text>
          <Text style={styles.rowLabel}>Durée</Text>
          <Text style={styles.rowValue}>{hours} heure{hours > 1 ? 's' : ''}</Text>
          {priceFcfa > 0 ? (
            <>
              <Text style={styles.rowLabel}>Montant</Text>
              <Text style={styles.rowValue}>{priceFcfa.toLocaleString('fr-FR')} FCFA</Text>
            </>
          ) : null}
          <Text style={styles.rowLabel}>Paiement</Text>
          <Text style={styles.rowValue}>
            {paymentMethod === 'solde' || paymentMethod === 'promo'
              ? 'Solde / code promo'
              : 'Mobile Money'}
          </Text>
        </View>

        {calendarUrl ? (
          <Pressable style={styles.secondaryBtn} onPress={() => void safeOpenUrl(calendarUrl)}>
            <Text style={styles.secondaryBtnText}>Ajouter à mon agenda</Text>
          </Pressable>
        ) : null}
        {whatsappLink ? (
          <Pressable style={styles.secondaryBtn} onPress={() => void safeOpenUrl(whatsappLink)}>
            <Text style={styles.secondaryBtnText}>Notifier par WhatsApp</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('MesReservations')}
        >
          <Text style={styles.primaryBtnText}>Voir mes réservations</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate('Conduite')}>
          <Text style={styles.secondaryBtnText}>Retour à la conduite</Text>
        </Pressable>
      </ScrollView>
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 32, alignItems: 'stretch' },
  successIcon: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: dark.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 24,
    color: dark.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textMuted,
    textAlign: 'center',
    marginBottom: 18,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 16,
    gap: 4,
    marginBottom: 12,
  },
  rowLabel: {
    marginTop: 8,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rowValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: dark.green,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
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
})
