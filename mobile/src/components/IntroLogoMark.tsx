import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, Easing, StyleSheet, Text, View } from 'react-native'
import Svg, { ClipPath, Defs, G, Path } from 'react-native-svg'

const BLACK = '#000000'
const GREEN = '#00B050'
const YELLOW = '#F5B31B'
const NAVY = '#14263F'
const LOGO_W = 200

function FadeShape({
  delay,
  children,
}: {
  delay: number
  children: ReactNode
}) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(10)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 900,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 900,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [delay, opacity, translateY])

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>
  )
}

function WordLetter({
  char,
  color,
  delay,
}: {
  char: string
  color: string
  delay: number
}) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(8)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 700,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 700,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [delay, opacity, translateY])

  return (
    <Animated.Text style={[styles.letter, { color, opacity, transform: [{ translateY }] }]}>
      {char}
    </Animated.Text>
  )
}

export function IntroLogoMark() {
  const drift = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: -3,
          duration: 5500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 5500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    )
    const timer = setTimeout(() => loop.start(), 2800)
    return () => {
      clearTimeout(timer)
      loop.stop()
    }
  }, [drift])

  const word = [
    ...[...'Monpermis'].map((ch) => ({ ch, color: BLACK })),
    ...['.', 'b', 'j'].map((ch) => ({ ch, color: GREEN })),
  ]

  return (
    <Animated.View style={[styles.scene, { transform: [{ translateY: drift }] }]}>
      <View style={styles.logoWrap}>
        <FadeShape delay={250}>
          <Svg width={LOGO_W} height={LOGO_W * 0.88} viewBox="150 170 740 650">
            <Path
              fill={GREEN}
              d="M211,222 L199,231 L195,242 L195,749 L206,766 L224,768 L249,749 L333,657 L333,510 L304,469 L303,462 L322,466 L375,444 L392,443 L404,447 L427,465 L496,401 L288,260 L229,224 Z"
            />
          </Svg>
        </FadeShape>

        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <FadeShape delay={450}>
            <Svg width={LOGO_W} height={LOGO_W * 0.88} viewBox="150 170 740 650">
              <Path
                fill={YELLOW}
                d="M830,218 L809,222 L770,238 L708,270 L633,316 L521,399 L429,480 L421,478 L398,458 L379,456 L328,477 L328,482 L435,599 L445,604 L632,393 L716,313 Z"
              />
            </Svg>
          </FadeShape>
        </View>

        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <FadeShape delay={650}>
            <Svg width={LOGO_W} height={LOGO_W * 0.88} viewBox="150 170 740 650">
              <Defs>
                <ClipPath id="road">
                  <Path d="M819,278 L801,277 L784,287 L711,349 L655,404 L535,538 L341,768 L433,768 L501,680 L519,684 L520,689 L463,768 L555,768 L651,610 L699,541 L704,542 L704,752 L708,761 L719,768 L814,768 L825,761 L830,748 L830,298 L827,286 Z" />
                </ClipPath>
              </Defs>
              <Path
                fill={NAVY}
                d="M819,278 L801,277 L784,287 L711,349 L655,404 L535,538 L341,768 L433,768 L501,680 L519,684 L520,689 L463,768 L555,768 L651,610 L699,541 L704,542 L704,752 L708,761 L719,768 L814,768 L825,761 L830,748 L830,298 L827,286 Z"
              />
              <G clipPath="url(#road)">
                <Path fill="#ffffff" d="M534,663 L518,658 L476,715 L494,720 Z" opacity={0.95} />
                <Path fill="#ffffff" d="M583,598 L567,593 L525,650 L543,655 Z" opacity={0.95} />
                <Path fill="#ffffff" d="M632,526 L622,522 L590,564 L603,569 Z" opacity={0.95} />
                <Path
                  fill="#ffffff"
                  d="M675,462 L669,461 L641,496 L640,500 L647,503 L650,502 L675,466 Z"
                  opacity={0.95}
                />
                <Path fill="#ffffff" d="M712,415 L705,412 L688,435 L695,438 Z" opacity={0.95} />
              </G>
            </Svg>
          </FadeShape>
        </View>
      </View>

      <View style={styles.wordmark}>
        {word.map((item, index) => (
          <WordLetter
            key={`${item.ch}-${index}`}
            char={item.ch}
            color={item.color}
            delay={1600 + index * 40}
          />
        ))}
      </View>

      <Text style={styles.srOnly} accessibilityLabel="monpermis.bj">
        monpermis.bj
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  scene: {
    alignItems: 'center',
  },
  logoWrap: {
    width: LOGO_W,
    height: LOGO_W * 0.88,
  },
  wordmark: {
    marginTop: 16,
    flexDirection: 'row',
  },
  letter: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
})
