import { Eye, EyeOff } from 'lucide-react-native'
import { useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native'
import { dark, fonts } from '../theme'

interface AuthInputProps extends TextInputProps {
  label: string
  error?: string
}

export function AuthInput({ label, error, secureTextEntry, style, ...props }: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = Boolean(secureTextEntry)

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.wrap, error ? styles.wrapError : null]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={dark.textMuted}
          secureTextEntry={isPassword && !showPassword}
          autoCapitalize="none"
          {...props}
        />
        {isPassword && (
          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.toggle}
            accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? (
              <EyeOff size={18} color={dark.textMuted} />
            ) : (
              <Eye size={18} color={dark.textMuted} />
            )}
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  group: {
    gap: 6,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.textMuted,
    marginLeft: 2,
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 14,
    backgroundColor: dark.surface,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  wrapError: {
    borderColor: dark.coral,
    backgroundColor: dark.coralSoft,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: dark.textPrimary,
    paddingVertical: 12,
  },
  toggle: {
    padding: 4,
    marginLeft: 4,
  },
  error: {
    color: dark.coral,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginLeft: 2,
  },
})
