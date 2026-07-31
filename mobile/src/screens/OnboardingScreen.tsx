import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import { useRef, useState } from 'react'
import {
  Dimensions,
  FlatList,
  ImageBackground,
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

const { width, height } = Dimensions.get('window')

const SLIDES = [
  {
    key: 'code',
    title: 'Code de la route',
    body: 'Révise les chapitres, entraîne-toi aux QCM, puis passe des sujets test et examens blancs.',
    image: require('../../assets/onboarding/slide-code.jpg'),
  },
  {
    key: 'conduite',
    title: 'Conduite',
    body: 'Cours vidéo gratuits, puis réserve tes heures avec un moniteur près de chez toi.',
    image: require('../../assets/onboarding/slide-conduite.jpg'),
  },
  {
    key: 'abo',
    title: 'Accès & paiement',
    body: 'Active ton accès en quelques secondes. Progresse à ton rythme, puis réserve ta conduite depuis l’app.',
    image: require('../../assets/onboarding/slide-abo.jpg'),
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
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        style={styles.list}
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
        renderItem={({ item }) => (
          <ImageBackground
            source={item.image}
            style={[styles.slide, { width, height }]}
            imageStyle={styles.slideImage}
          >
            <LinearGradient
              colors={['rgba(0,16,48,0.35)', 'rgba(0,16,48,0.55)', 'rgba(0,16,48,0.92)']}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={styles.slideSafe} edges={['top', 'bottom']}>
              <View style={styles.slideTop}>
                <BrandName size={18} mainColor="#ffffff" />
                <Pressable onPress={() => void finish()} hitSlop={12}>
                  <Text style={styles.skip}>Passer</Text>
                </Pressable>
              </View>
              <View style={styles.slideCopy}>
                <Text style={styles.kicker}>Monpermis.bj</Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
              </View>
            </SafeAreaView>
          </ImageBackground>
        )}
      />

      <SafeAreaView style={styles.footerSafe} edges={['bottom']} pointerEvents="box-none">
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
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#001030',
  },
  list: {
    ...StyleSheet.absoluteFillObject,
  },
  slide: {
    flex: 1,
  },
  slideImage: {
    resizeMode: 'cover',
  },
  slideSafe: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  slideTop: {
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skip: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  slideCopy: {
    paddingBottom: 140,
  },
  kicker: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: dark.green,
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 32,
    lineHeight: 38,
    color: '#ffffff',
    marginBottom: 12,
    letterSpacing: -0.4,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15.5,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.88)',
    maxWidth: 360,
  },
  footerSafe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  footer: {
    paddingHorizontal: 22,
    paddingBottom: 10,
    gap: 14,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    width: 22,
    backgroundColor: dark.green,
  },
  cta: {
    borderRadius: 999,
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
