import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { brand, colors } from '../theme'

interface GoogleSignInButtonProps {
  onPress: () => void
  loading?: boolean
  disabled?: boolean
}

export function GoogleSignInButton({
  onPress,
  loading,
  disabled,
}: GoogleSignInButtonProps) {
  return (
    <Pressable
      style={(state) => [
        styles.button,
        (disabled || loading) && styles.disabled,
        state.pressed && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel="Continuer avec Google"
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Text style={styles.gBlue}>G</Text>
          </View>
          <Text style={styles.label}>Continuer avec Google</Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.navy,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.9,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gBlue: {
    color: '#4285F4',
    fontSize: 13,
    fontWeight: '800',
  },
  label: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
})
