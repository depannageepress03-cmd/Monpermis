import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native'
import { dark } from '../theme'

const CAR = require('../../assets/car-clean.png')
const CAR_WIDTH = 128
const CAR_WIDTH_COMPACT = 96

/** Bandeau bas : vraie voiture qui roule sur une route animée. */
export function HomeBottomAnimation({ compact = false }: { compact?: boolean }) {
  const [width, setWidth] = useState(0)
  const road = useRef(new Animated.Value(0)).current
  const drive = useRef(new Animated.Value(0)).current
  const carWidth = compact ? CAR_WIDTH_COMPACT : CAR_WIDTH

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width)
  }

  useEffect(() => {
    if (width <= 0) return

    const roadLoop = Animated.loop(
      Animated.timing(road, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    const driveLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drive, {
          toValue: 1,
          duration: 4800,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(drive, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    )
    roadLoop.start()
    driveLoop.start()
    return () => {
      roadLoop.stop()
      driveLoop.stop()
      drive.setValue(0)
    }
  }, [drive, road, width])

  const dashOffset = road.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -28],
  })
  const carX = drive.interpolate({
    inputRange: [0, 1],
    outputRange: [-carWidth, Math.max(width, carWidth)],
  })
  const carY = drive.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -2, 0],
  })

  return (
    <View
      style={[styles.wrap, compact && styles.wrapCompact]}
      onLayout={onLayout}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.scene, compact && styles.sceneCompact]}>
        {width > 0 ? (
          <Animated.View
            style={[
              styles.carWrap,
              compact && styles.carWrapCompact,
              { transform: [{ translateX: carX }, { translateY: carY }] },
            ]}
          >
            <Image
              source={CAR}
              style={[styles.car, compact && styles.carCompact]}
              resizeMode="contain"
            />
          </Animated.View>
        ) : null}

        <View style={[styles.road, compact && styles.roadCompact]}>
          <View style={styles.roadEdge} />
          <Animated.View style={[styles.dashes, { transform: [{ translateX: dashOffset }] }]}>
            {Array.from({ length: 16 }).map((_, i) => (
              <View key={i} style={styles.dash} />
            ))}
          </Animated.View>
          <View style={[styles.roadEdge, styles.roadEdgeBottom]} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 36,
    marginBottom: 12,
    alignItems: 'center',
    width: '100%',
  },
  wrapCompact: {
    marginTop: 8,
    marginBottom: 0,
  },
  scene: {
    width: '100%',
    height: 78,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  sceneCompact: {
    height: 58,
  },
  carWrap: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    zIndex: 2,
  },
  carWrapCompact: {
    bottom: 8,
  },
  car: {
    width: CAR_WIDTH,
    height: 52,
  },
  carCompact: {
    width: CAR_WIDTH_COMPACT,
    height: 40,
  },
  road: {
    width: '100%',
    height: 18,
    borderRadius: 999,
    backgroundColor: dark.surfaceRaised,
    borderWidth: 1,
    borderColor: dark.border,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  roadCompact: {
    height: 14,
  },
  roadEdge: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 3,
    height: 1.5,
    backgroundColor: dark.textMuted,
    opacity: 0.4,
  },
  roadEdgeBottom: {
    top: undefined,
    bottom: 3,
  },
  dashes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: 4,
  },
  dash: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: dark.green,
  },
})
