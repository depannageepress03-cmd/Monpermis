import { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native'
import Svg, { ClipPath, Defs, G, Path } from 'react-native-svg'
import { fonts } from '../theme'

const BG = '#FAF9F6'
const GREEN = '#1FA857'
const YELLOW = '#F5B31B'
const NAVY = '#14263F'
const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1)

const ROAD_D =
  'M819,278 L801,277 L784,287 L711,349 L655,404 L535,538 L341,768 L433,768 L501,680 L519,684 L520,689 L463,768 L555,768 L651,610 L699,541 L704,542 L704,752 L708,761 L719,768 L814,768 L825,761 L830,748 L830,298 L827,286 Z'
const GREEN_D =
  'M211,222 L199,231 L195,242 L195,749 L206,766 L224,768 L249,749 L333,657 L333,510 L304,469 L303,462 L322,466 L375,444 L392,443 L404,447 L427,465 L496,401 L288,260 L229,224 Z'
const YELLOW_D =
  'M830,218 L809,222 L770,238 L708,270 L633,316 L521,399 L429,480 L421,478 L398,458 L379,456 L328,477 L328,482 L435,599 L445,604 L632,393 L716,313 Z'
const DASHES = [
  'M534,663 L518,658 L476,715 L494,720 Z',
  'M583,598 L567,593 L525,650 L543,655 Z',
  'M632,526 L622,522 L590,564 L603,569 Z',
  'M675,462 L669,461 L641,496 L640,500 L647,503 L650,502 L675,466 Z',
  'M712,415 L705,412 L688,435 L695,438 Z',
] as const

const WORD = [
  { ch: 'm', color: NAVY },
  { ch: 'o', color: NAVY },
  { ch: 'n', color: NAVY },
  { ch: 'p', color: NAVY },
  { ch: 'e', color: NAVY },
  { ch: 'r', color: NAVY },
  { ch: 'm', color: NAVY },
  { ch: 'i', color: NAVY },
  { ch: 's', color: NAVY },
  { ch: '.', color: GREEN },
  { ch: 'b', color: GREEN },
  { ch: 'j', color: GREEN },
] as const

type Props = {
  onRevealComplete?: () => void
}

/**
 * Intro vectorielle — animations uniquement sur Animated.View (pas sur SVG),
 * pour éviter les bugs native-driver / react-native-svg.
 */
export function IntroLogoMark({ onRevealComplete }: Props) {
  const { width } = useWindowDimensions()
  const logoW = Math.min(232, Math.max(160, width * 0.56))
  const svgH = (logoW * 650) / 740

  const onDoneRef = useRef(onRevealComplete)
  onDoneRef.current = onRevealComplete

  const ambient = useRef(new Animated.Value(0)).current
  const green = useRef(new Animated.Value(0)).current
  const yellow = useRef(new Animated.Value(0)).current
  const navy = useRef(new Animated.Value(0)).current
  const dashes = useRef(new Animated.Value(0)).current
  const word = useRef(new Animated.Value(0)).current
  const drift = useRef(new Animated.Value(0)).current
  const letterOps = useRef(WORD.map(() => new Animated.Value(0))).current

  useEffect(() => {
    let cancelled = false

    const fadeUp = (value: Animated.Value, delay: number, duration = 900) =>
      Animated.timing(value, {
        toValue: 1,
        duration,
        delay,
        easing: EASE_OUT,
        useNativeDriver: true,
      })

    // Timeline alignée sur l’HTML premium
    Animated.parallel([
      fadeUp(ambient, 0, 1200),
      fadeUp(green, 250, 1100),
      fadeUp(yellow, 450, 1100),
      fadeUp(navy, 650, 1100),
      fadeUp(dashes, 1300, 700),
      fadeUp(word, 1600, 200),
      ...letterOps.map((op, i) => fadeUp(op, 1600 + i * 45, 850)),
    ]).start(({ finished }) => {
      if (finished && !cancelled) {
        // Petite respiration avant de quitter
        setTimeout(() => {
          if (!cancelled) onDoneRef.current?.()
        }, 500)
      }
    })

    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 5000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 5000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    )
    const driftTimer = setTimeout(() => {
      if (!cancelled) driftLoop.start()
    }, 2800)

    return () => {
      cancelled = true
      clearTimeout(driftTimer)
      driftLoop.stop()
    }
    // Démarre une seule fois au montage — callback via ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sceneY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -4],
  })

  const shapeStyle = (progress: Animated.Value) => ({
    opacity: progress,
    transform: [
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
      {
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
        }),
      },
    ],
  })

  return (
    <View style={styles.root} accessibilityLabel="Chargement Monpermis.bj">
      <Animated.View pointerEvents="none" style={[styles.ambient, { opacity: ambient }]} />

      <Animated.View style={[styles.scene, { transform: [{ translateY: sceneY }] }]}>
        <View style={{ width: logoW, height: svgH }}>
          {/* Vert */}
          <Animated.View style={[StyleSheet.absoluteFill, shapeStyle(green)]}>
            <Svg width={logoW} height={svgH} viewBox="150 170 740 650">
              <Path d={GREEN_D} fill={GREEN} />
            </Svg>
          </Animated.View>

          {/* Jaune */}
          <Animated.View style={[StyleSheet.absoluteFill, shapeStyle(yellow)]}>
            <Svg width={logoW} height={svgH} viewBox="150 170 740 650">
              <Path d={YELLOW_D} fill={YELLOW} />
            </Svg>
          </Animated.View>

          {/* Navy + pointillés (apparaissent avec navy, puis dashes boost) */}
          <Animated.View style={[StyleSheet.absoluteFill, shapeStyle(navy)]}>
            <Svg width={logoW} height={svgH} viewBox="150 170 740 650">
              <Defs>
                <ClipPath id="road">
                  <Path d={ROAD_D} />
                </ClipPath>
              </Defs>
              <Path d={ROAD_D} fill={NAVY} />
              <G clipPath="url(#road)">
                {DASHES.map((d) => (
                  <Path key={d} d={d} fill="#FFFFFF" opacity={0.35} />
                ))}
              </G>
            </Svg>
          </Animated.View>

          {/* Pointillés nets (2ᵉ couche) */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: dashes }]}>
            <Svg width={logoW} height={svgH} viewBox="150 170 740 650">
              <Defs>
                <ClipPath id="roadDashes">
                  <Path d={ROAD_D} />
                </ClipPath>
              </Defs>
              <G clipPath="url(#roadDashes)">
                {DASHES.map((d) => (
                  <Path key={d} d={d} fill="#FFFFFF" />
                ))}
              </G>
            </Svg>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.wordmark,
            {
              marginTop: logoW * 0.078,
              opacity: word,
            },
          ]}
        >
          {WORD.map((letter, i) => (
            <Animated.Text
              key={`${letter.ch}-${i}`}
              style={[
                styles.letter,
                {
                  color: letter.color,
                  fontSize: Math.round(logoW * 0.128),
                  opacity: letterOps[i],
                  transform: [
                    {
                      translateY: letterOps[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {letter.ch}
            </Animated.Text>
          ))}
        </Animated.View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  scene: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  letter: {
    fontFamily: fonts.displayExtraBold,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
})
