import { useRef, type ReactNode } from 'react'
import { Animated, Pressable, type StyleProp, type ViewStyle } from 'react-native'

/** Pressable avec un léger rebond ressort — rend les cartes plus tactiles/ludiques. */
export function Bouncy({
  onPress,
  disabled,
  children,
  style,
  scaleTo = 0.95,
}: {
  onPress?: () => void
  disabled?: boolean
  children: ReactNode
  style?: StyleProp<ViewStyle>
  scaleTo?: number
}) {
  const scale = useRef(new Animated.Value(1)).current

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: scaleTo,
      friction: 6,
      tension: 140,
      useNativeDriver: true,
    }).start()
  }

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start()
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={pressIn}
      onPressOut={pressOut}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  )
}
