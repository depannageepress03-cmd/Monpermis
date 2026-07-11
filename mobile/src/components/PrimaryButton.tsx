import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type ViewStyle } from 'react-native'
import { brand, colors, radii } from '../theme'

interface PrimaryButtonProps extends PressableProps {
  title: string
  loading?: boolean
  variant?: 'primary' | 'signin'
}

export function PrimaryButton({
  title,
  loading,
  variant = 'primary',
  disabled,
  style,
  ...props
}: PrimaryButtonProps) {
  const isSignin = variant === 'signin'

  return (
    <Pressable
      style={(state) => {
        const base: ViewStyle[] = [
          styles.button,
          isSignin ? styles.signinButton : styles.primaryButton,
        ]
        if (disabled || loading) base.push(styles.disabled)
        if (state.pressed) base.push(styles.pressed)
        if (typeof style === 'function') {
          const extra = style(state)
          if (extra) base.push(extra as ViewStyle)
        } else if (style) {
          base.push(style as ViewStyle)
        }
        return base
      }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.sm,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: brand.navy,
  },
  signinButton: {
    backgroundColor: brand.green,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.9,
  },
  text: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
})
