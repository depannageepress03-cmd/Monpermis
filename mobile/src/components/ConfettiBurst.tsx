import { useEffect, useMemo, useRef } from 'react'
import { Animated, Dimensions, StyleSheet, View } from 'react-native'
import { dark } from '../theme'

const { width, height } = Dimensions.get('window')
const COLORS = [dark.green, dark.coral, '#F0B429', '#60C6FF', '#B98BFF', '#FF7A1A']

type Piece = {
  left: number
  delay: number
  duration: number
  size: number
  color: string
  rotate: number
}

/** Confettis légers sans dépendance externe — fête un examen / quiz réussi. */
export function ConfettiBurst({ active, count = 42 }: { active: boolean; count?: number }) {
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }).map((_, index) => ({
        left: Math.random() * width,
        delay: Math.floor(Math.random() * 350),
        duration: 1600 + Math.floor(Math.random() * 900),
        size: 6 + Math.floor(Math.random() * 8),
        color: COLORS[index % COLORS.length],
        rotate: Math.random() * 360,
      })),
    [count],
  )

  if (!active) return null

  return (
    <View pointerEvents="none" style={styles.layer}>
      {pieces.map((piece, index) => (
        <ConfettiPiece key={index} piece={piece} />
      ))}
    </View>
  )
}

function ConfettiPiece({ piece }: { piece: Piece }) {
  const y = useRef(new Animated.Value(-20)).current
  const opacity = useRef(new Animated.Value(1)).current
  const rotate = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, {
        toValue: height + 40,
        duration: piece.duration,
        delay: piece.delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: piece.duration,
        delay: piece.delay + piece.duration * 0.55,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: 1,
        duration: piece.duration,
        delay: piece.delay,
        useNativeDriver: true,
      }),
    ]).start()
  }, [opacity, piece.delay, piece.duration, rotate, y])

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: [`${piece.rotate}deg`, `${piece.rotate + 540}deg`],
  })

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: piece.left,
        width: piece.size,
        height: piece.size * 0.55,
        borderRadius: 2,
        backgroundColor: piece.color,
        opacity,
        transform: [{ translateY: y }, { rotate: spin }],
      }}
    />
  )
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    overflow: 'hidden',
  },
})
