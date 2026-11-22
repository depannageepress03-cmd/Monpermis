import { useEffect, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import {
  compareVersions,
  fetchAppVersionInfo,
  getInstalledAppVersion,
} from '../api/appVersion'
import { dark, fonts } from '../theme'

/**
 * Bandeau soft-update : visible si le serveur publie une version plus récente.
 * Force-update (minSupported) bloque toute l’UI derrière un CTA unique.
 */
export function UpdateBanner() {
  const [latest, setLatest] = useState<string | null>(null)
  const [apkUrl, setApkUrl] = useState<string | null>(null)
  const [notes, setNotes] = useState<string | null>(null)
  const [forced, setForced] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const info = await fetchAppVersionInfo()
      if (!info || cancelled) return
      const installed = getInstalledAppVersion()
      const needsSoft =
        Boolean(info.latest) && compareVersions(installed, info.latest!) < 0
      const needsForce =
        Boolean(info.minSupported) &&
        compareVersions(installed, info.minSupported!) < 0
      if (!needsSoft && !needsForce) return
      setLatest(info.latest)
      setApkUrl(info.apkUrl)
      setNotes(info.releaseNotes)
      setForced(needsForce)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!latest || (dismissed && !forced)) return null

  return (
    <View style={[styles.wrap, forced && styles.wrapForced]} accessibilityRole="alert">
      <Text style={styles.title}>
        {forced ? 'Mise à jour obligatoire' : 'Nouvelle version disponible'}
      </Text>
      <Text style={styles.body}>
        {notes?.trim() ||
          `Version ${latest} prête. Mets à jour pour continuer dans les meilleures conditions.`}
      </Text>
      <View style={styles.row}>
        {apkUrl ? (
          <Pressable
            style={styles.primary}
            onPress={() => void Linking.openURL(apkUrl)}
            accessibilityRole="button"
            accessibilityLabel="Télécharger la mise à jour"
          >
            <Text style={styles.primaryText}>Mettre à jour</Text>
          </Pressable>
        ) : null}
        {!forced ? (
          <Pressable
            style={styles.secondary}
            onPress={() => setDismissed(true)}
            accessibilityRole="button"
            accessibilityLabel="Plus tard"
          >
            <Text style={styles.secondaryText}>Plus tard</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 14,
    backgroundColor: dark.greenSoft,
    borderWidth: 1,
    borderColor: 'rgba(0,176,80,0.25)',
    gap: 8,
  },
  wrapForced: {
    backgroundColor: dark.coralSoft,
    borderColor: 'rgba(232,93,59,0.35)',
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: dark.textMuted,
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primary: {
    backgroundColor: dark.green,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 13 },
  secondary: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: dark.border,
  },
  secondaryText: { color: dark.textPrimary, fontFamily: fonts.bodyBold, fontSize: 13 },
})
