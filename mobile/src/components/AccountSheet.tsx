import {
  ChevronRight,
  Crown,
  History,
  Lock,
  LogOut,
  MessageCircle,
  Pencil,
  Phone,
  Settings,
  Shield,
  ShieldCheck,
  User,
  X,
} from 'lucide-react-native'
import { useEffect, useRef, type ReactNode } from 'react'
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { AuthUser } from '../api/session'
import { brand, colors, dark, fonts, shadows } from '../theme'

type Props = {
  visible: boolean
  user: AuthUser
  greeting: string
  onClose: () => void
  onLogout: () => void
  onOpenAbonnement: () => void
  onOpenPayments: () => void
  onOpenSupport: () => void
  onOpenProfile: () => void
}

function memberSinceLabel(createdAt: string): string | null {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return null
  const raw = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  if (!raw) return null
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function accountTypeLabel(authProvider?: AuthUser['authProvider']): string | null {
  if (authProvider === 'google') return 'Google'
  if (authProvider === 'local' || authProvider == null) return 'Téléphone / mot de passe'
  return null
}

/** Account Sheet premium — UI uniquement, actions déléguées au parent. */
export function AccountSheet({
  visible,
  user,
  greeting,
  onClose,
  onLogout,
  onOpenAbonnement,
  onOpenPayments,
  onOpenSupport,
  onOpenProfile,
}: Props) {
  const insets = useSafeAreaInsets()
  const fade = useRef(new Animated.Value(0)).current
  const slide = useRef(new Animated.Value(28)).current

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
  const phone = (user.phone || '').trim()
  const email = (user.email || '').trim()
  const since = memberSinceLabel(user.createdAt)
  const accountType = accountTypeLabel(user.authProvider)
  const showVerified = Boolean(user.isEmailVerified)

  useEffect(() => {
    if (!visible) {
      fade.setValue(0)
      slide.setValue(28)
      return
    }
    fade.setValue(0)
    slide.setValue(28)
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [visible, fade, slide])

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer" />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetWrap,
            {
              paddingTop: Math.max(insets.top, 12),
              paddingBottom: Math.max(insets.bottom, 16),
              opacity: fade,
              transform: [{ translateY: slide }],
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.sheet}>
            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              onPress={onClose}
              accessibilityLabel="Fermer"
              hitSlop={8}
            >
              <X size={22} color={dark.textPrimary} />
            </Pressable>

            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.sheetScroll}
            >
              <View style={styles.hero}>
                <View style={styles.avatar}>
                  <User size={40} color={dark.green} strokeWidth={2} />
                </View>
                <View style={styles.heroCopy}>
                  <Text style={styles.greeting}>{greeting} 👋</Text>
                  {fullName ? (
                    <Text style={styles.name} numberOfLines={2}>
                      {fullName}
                    </Text>
                  ) : null}
                  {since || showVerified ? (
                    <View style={styles.badgeRow}>
                      {since ? (
                        <View style={styles.badge}>
                          <ShieldCheck size={13} color={dark.green} strokeWidth={2.5} />
                          <Text style={styles.badgeText}>Membre depuis {since}</Text>
                        </View>
                      ) : null}
                      {showVerified ? (
                        <View style={styles.badge}>
                          <ShieldCheck size={13} color={dark.green} strokeWidth={2.5} />
                          <Text style={styles.badgeText}>E-mail vérifié</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </View>

              {phone || accountType || email ? (
                <View style={styles.infoCard}>
                  {phone ? (
                    <InfoRow
                      icon={<Phone size={18} color={dark.green} />}
                      label="Téléphone"
                      value={phone}
                      onEdit={onOpenProfile}
                    />
                  ) : null}
                  {phone && (accountType || email) ? <View style={styles.divider} /> : null}
                  {accountType ? (
                    <InfoRow
                      icon={<Lock size={18} color={dark.green} />}
                      label="Compte"
                      value={accountType}
                      onEdit={onOpenProfile}
                    />
                  ) : null}
                  {accountType && email ? <View style={styles.divider} /> : null}
                  {email ? (
                    <InfoRow
                      icon={<User size={18} color={dark.green} />}
                      label="E-mail"
                      value={email}
                      onEdit={onOpenProfile}
                    />
                  ) : null}
                </View>
              ) : null}

              <View style={styles.actions}>
                <ActionRow
                  icon={<Crown size={18} color={dark.green} />}
                  title="Abonnement / Mes accès"
                  subtitle="Gère ton abonnement et tes accès"
                  onPress={onOpenAbonnement}
                />
                <ActionRow
                  icon={<History size={18} color={dark.green} />}
                  title="Historique des paiements"
                  subtitle="Consulte tous tes paiements"
                  onPress={onOpenPayments}
                />
                <ActionRow
                  icon={<MessageCircle size={18} color={dark.green} />}
                  title="Support WhatsApp"
                  subtitle="Obtiens de l’aide rapidement"
                  onPress={onOpenSupport}
                />
                <ActionRow
                  icon={<Settings size={18} color={dark.green} />}
                  title="Modifier mon profil"
                  subtitle="Met à jour tes informations personnelles"
                  onPress={onOpenProfile}
                  last
                />
              </View>

              <Pressable
                style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}
                onPress={onLogout}
                accessibilityRole="button"
                accessibilityLabel="Se déconnecter"
              >
                <LogOut size={18} color={colors.white} />
                <Text style={styles.logoutText}>Se déconnecter</Text>
              </Pressable>

              <View style={styles.securityCard}>
                <Shield size={18} color={dark.green} />
                <View style={styles.securityCopy}>
                  <Text style={styles.securityTitle}>Sécurité du compte</Text>
                  <Text style={styles.securityText}>
                    Vos informations personnelles sont protégées.
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

function InfoRow({
  icon,
  label,
  value,
  onEdit,
}: {
  icon: ReactNode
  label: string
  value: string
  onEdit: () => void
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
        onPress={onEdit}
        accessibilityLabel={`Modifier ${label}`}
        hitSlop={8}
      >
        <Pencil size={15} color={dark.green} />
      </Pressable>
    </View>
  )
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  last,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  onPress: () => void
  last?: boolean
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionRow, !last && styles.actionRowBorder, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.actionIcon}>{icon}</View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={18} color={dark.textMuted} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 16, 48, 0.45)',
  },
  sheetWrap: {
    width: '92%',
    maxWidth: 440,
    maxHeight: '92%',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    overflow: 'hidden',
    ...shadows.md,
  },
  sheetScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    paddingRight: 40,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.greenPale,
    borderWidth: 2,
    borderColor: 'rgba(0,176,80,0.35)',
    ...shadows.sm,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  greeting: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: dark.textMuted,
  },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: dark.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,176,80,0.35)',
    backgroundColor: brand.greenPale,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.green,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.08)',
    padding: 20,
    marginBottom: 14,
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.greenPale,
  },
  infoCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  infoLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: dark.textMuted,
  },
  infoValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.greenPale,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,16,48,0.08)',
    marginVertical: 14,
  },
  actions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.08)',
    marginBottom: 16,
    overflow: 'hidden',
    ...shadows.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,16,48,0.08)',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.greenPale,
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  actionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  actionSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: dark.textMuted,
  },
  logoutBtn: {
    minHeight: 56,
    borderRadius: 20,
    backgroundColor: dark.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  logoutPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  logoutText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.white,
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 18,
    backgroundColor: brand.greenPale,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  securityCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  securityTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: dark.textPrimary,
  },
  securityText: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: dark.textMuted,
  },
  pressed: {
    opacity: 0.88,
  },
})
