import { useEffect, useRef, useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { CheckCircle2, ClipboardList, Flag, RotateCcw, Target, XCircle } from 'lucide-react-native'
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, G, Line } from 'react-native-svg'
import { fonts } from '../theme'

const PASS = { from: '#065F46', to: '#16A34A', soft: 'rgba(22,163,74,0.10)', ink: '#0B7A3E', label: 'RÉUSSI' }
const FAIL = { from: '#7F1D1D', to: '#DC2626', soft: 'rgba(220,38,38,0.08)', ink: '#B91C1C', label: 'NON RÉUSSI' }

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

const RING = 176
const STROKE = 14
const RADIUS = (RING - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

type Props = {
  examNumber: number
  correct: number
  total: number
  passScore: number
  passed: boolean
  onSeeNotes: () => void
  onRetry: () => void
}

/** Page de fin d'examen : verte si réussi, rouge si raté, avec anneau de score animé et détail de la note. */
export function ExamResultCard({ examNumber, correct, total, passScore, passed, onSeeNotes, onRetry }: Props) {
  const tone = passed ? PASS : FAIL
  const wrong = Math.max(0, total - correct)
  const missing = Math.max(0, passScore - correct)
  const ratio = total > 0 ? Math.min(1, correct / total) : 0
  const thresholdRatio = total > 0 ? Math.min(1, passScore / total) : 0
  const percentLabel = Math.round(ratio * 100)

  const progress = useRef(new Animated.Value(0)).current
  const enter = useRef(new Animated.Value(0)).current
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const id = progress.addListener(({ value }) => setShown(Math.round(value * correct)))
    Animated.parallel([
      Animated.timing(enter, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: 1100, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start()
    return () => progress.removeListener(id)
  }, [correct, enter, progress])

  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, CIRCUMFERENCE * (1 - ratio)],
  })

  // Repère du seuil sur l'anneau (départ en haut, sens horaire).
  const angle = thresholdRatio * 2 * Math.PI - Math.PI / 2
  const c = RING / 2
  const tick = {
    x1: c + (RADIUS - 11) * Math.cos(angle),
    y1: c + (RADIUS - 11) * Math.sin(angle),
    x2: c + (RADIUS + 11) * Math.cos(angle),
    y2: c + (RADIUS + 11) * Math.sin(angle),
  }

  return (
    <Animated.View
      style={[
        styles.wrap,
        { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] },
      ]}
    >
      <LinearGradient
        colors={[tone.from, tone.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
        accessibilityRole="summary"
        accessibilityLabel={`Examen ${examNumber} ${passed ? 'réussi' : 'non réussi'}, note ${correct} sur ${total}`}
      >
        <View style={styles.decoA} />
        <View style={styles.decoB} />

        <View style={styles.pill}>
          {passed ? <CheckCircle2 size={14} color="#fff" /> : <XCircle size={14} color="#fff" />}
          <Text style={styles.pillText}>{tone.label}</Text>
        </View>
        <Text style={styles.examLabel}>Examen {examNumber}</Text>

        <View style={styles.ringBox}>
          <Svg width={RING} height={RING}>
            <G rotation="-90" origin={`${c}, ${c}`}>
              <Circle cx={c} cy={c} r={RADIUS} stroke="rgba(255,255,255,0.22)" strokeWidth={STROKE} fill="none" />
              <AnimatedCircle
                cx={c}
                cy={c}
                r={RADIUS}
                stroke="#fff"
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeDashoffset={dashOffset}
              />
            </G>
            <Line {...tick} stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.95} />
          </Svg>
          <View style={styles.ringCenter} pointerEvents="none">
            <View style={styles.scoreRow}>
              <Text style={styles.score}>{shown}</Text>
              <Text style={styles.scoreMax}>/{total}</Text>
            </View>
            <Text style={styles.percent}>{percentLabel} %</Text>
          </View>
        </View>

        <Text style={styles.threshold}>
          Le trait blanc marque le seuil : {passScore}/{total}
        </Text>
      </LinearGradient>

      <View style={styles.card}>
        <Text style={[styles.message, { color: tone.ink }]}>
          {passed
            ? 'Félicitations, vous avez atteint le niveau requis. Continuez ainsi pour rester prêt le jour de l’examen.'
            : `Il vous manquait ${missing} bonne${missing > 1 ? 's' : ''} réponse${missing > 1 ? 's' : ''} pour réussir. Consultez la correction puis réessayez : chaque essai vous rapproche du permis.`}
        </Text>

        <View style={styles.stats}>
          <View style={[styles.stat, { backgroundColor: PASS.soft }]}>
            <CheckCircle2 size={18} color={PASS.ink} />
            <Text style={[styles.statValue, { color: PASS.ink }]}>{correct}</Text>
            <Text style={styles.statLabel}>Bonnes</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: FAIL.soft }]}>
            <XCircle size={18} color={FAIL.ink} />
            <Text style={[styles.statValue, { color: FAIL.ink }]}>{wrong}</Text>
            <Text style={styles.statLabel}>Erreurs</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: '#EEF2F8' }]}>
            <Target size={18} color="#001030" />
            <Text style={[styles.statValue, { color: '#001030' }]}>{passScore}</Text>
            <Text style={styles.statLabel}>Seuil</Text>
          </View>
        </View>

        <Pressable
          onPress={passed ? onSeeNotes : onRetry}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, { backgroundColor: tone.to }, pressed && styles.pressed]}
        >
          {passed ? <ClipboardList size={18} color="#fff" /> : <RotateCcw size={18} color="#fff" />}
          <Text style={styles.primaryText}>{passed ? 'Voir mes résultats' : 'Réessayer un examen'}</Text>
        </Pressable>
        <Pressable
          onPress={passed ? onRetry : onSeeNotes}
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondary, { borderColor: tone.to }, pressed && styles.pressed]}
        >
          <Flag size={16} color={tone.ink} />
          <Text style={[styles.secondaryText, { color: tone.ink }]}>
            {passed ? 'Passer un autre examen' : 'Voir la correction'}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 14, marginTop: 4 },
  hero: { borderRadius: 28, paddingTop: 20, paddingBottom: 22, paddingHorizontal: 20, alignItems: 'center', overflow: 'hidden' },
  decoA: { position: 'absolute', top: -60, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.08)' },
  decoB: { position: 'absolute', bottom: -70, left: -60, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.06)' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: '#fff' },
  examLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 10, marginBottom: 14 },
  ringBox: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline' },
  score: { fontFamily: fonts.displayExtraBold, fontSize: 56, color: '#fff', lineHeight: 62 },
  scoreMax: { fontFamily: fonts.displayBold, fontSize: 22, color: 'rgba(255,255,255,0.8)' },
  percent: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: -2 },
  threshold: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.08)',
    gap: 14,
  },
  message: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 21 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12, gap: 3 },
  statValue: { fontFamily: fonts.displayBold, fontSize: 24 },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: '#3d5a73' },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
  },
  primaryText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#fff' },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
  },
  secondaryText: { fontFamily: fonts.bodyBold, fontSize: 14 },
  pressed: { opacity: 0.85 },
})
