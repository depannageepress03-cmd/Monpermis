import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { BookOpen, Car, CreditCard } from 'lucide-react-native'
import { useRef, useState } from 'react'
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BrandName } from '../components/BrandName'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'
import { hapticSelect } from '../utils/haptics'
import { markOnboardingDone } from '../utils/onboarding'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>

const { width } = Dimensions.get('window')

const SLIDES = [
  {
    key: 'code',
    title: 'Code de la route',
    body: 'Révise les chapitres, entraîne-toi aux QCM et passe des examens blancs à ton rythme.',
    icon: BookOpen,
    accent: dark.green,
  },
  {
    key: 'conduite',
    title: 'Conduite',
    body: 'Cours vidéo gratuits, puis réserve tes heures avec un moniteur près de chez toi.',
    icon: Car,
    accent: dark.coral,
  },
  {
    key: 'abo',
    title: 'Abonnement simple',
    body: 'Paie en Mobile Money (MTN, Moov, Celtiis) et suis l’historique de tes accès.',
    icon: CreditCard,
    accent: '#F0B429',
  },
] as const

export function OnboardingScreen() {
  const navigation = useNavigation<Nav>()
  const listRef = useRef<FlatList<(typeof SLIDES)[number]>>(null)
  const [index, setIndex] = useState(0)

  const finish = async () => {
    await markOnboardingDone()
    navigation.replace('Login')
  }

  const next = () => {
    void hapticSelect()
    if (index >= SLIDES.length - 1) {
      void finish()
      return
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true })
    setIndex((value) => value + 1)
  }

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0]
    if (first?.index != null) setIndex(first.index)
  }).current

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <BrandName size={18} mainColor={dark.textPrimary} />
        <Pressable onPress={() => void finish()} hitSlop={12}>
          <Text style={styles.skip}>Passer</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={[...SLIDES]}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 60 }}
        onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width)
          setIndex(nextIndex)
        }}
        renderItem={({ item }) => {
          const Icon = item.icon
          return (
            <View style={[styles.slide, { width }]}>
              <View style={[styles.iconWell, { backgroundColor: `${item.accent}22` }]}>
                <Icon size={36} color={item.accent} />
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          )
        }}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, slideIndex) => (
            <View
              key={slide.key}
              style={[styles.dot, slideIndex === index && styles.dotActive]}
            />
          ))}
        </View>
        <Pressable style={styles.cta} onPress={next}>
          <Text style={styles.ctaText}>
            {index >= SLIDES.length - 1 ? 'Commencer' : 'Continuer'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.bg },
  top: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skip: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: dark.textMuted },
  slide: {
    paddingHorizontal: 28,
    paddingTop: 48,
    alignItems: 'flex-start',
  },
  iconWell: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    lineHeight: 34,
    color: dark.textPrimary,
    marginBottom: 12,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 25,
    color: dark.textMuted,
    maxWidth: 340,
  },
  footer: {
    paddingHorizontal: 22,
    paddingBottom: 18,
    gap: 16,
  },
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: dark.surfaceRaised,
  },
  dotActive: {
    width: 22,
    backgroundColor: dark.green,
  },
  cta: {
    borderRadius: 16,
    backgroundColor: dark.green,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: '#0B0F1A',
  },
})
