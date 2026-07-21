import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Shield } from 'lucide-react-native'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { BrandName } from '../components/BrandName'
import { DarkScreen } from '../components/DarkScreen'
import { PageNavbar } from '../components/PageNavbar'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'PrivacyPolicy'>

function ParagraphWithBrand({ text, style }: { text: string; style: object }) {
  const parts = text.split('Monpermis.bj')
  if (parts.length === 1) {
    return <Text style={style}>{text}</Text>
  }

  return (
    <Text style={style}>
      {parts.map((part, index) => (
        <Text key={`${index}-${part.slice(0, 12)}`}>
          {part}
          {index < parts.length - 1 ? <BrandName size={15} inline mainColor={dark.textPrimary} /> : null}
        </Text>
      ))}
    </Text>
  )
}

const SECTIONS = [
  {
    title: '1. Responsable du traitement',
    paragraphs: [
      "Monpermis.bj traite vos données personnelles pour fournir le service d'accompagnement à la préparation du permis de conduire.",
      'Pour toute question : contactez le support via l’adresse indiquée dans l’application ou sur le site.',
    ],
  },
  {
    title: '2. Données collectées',
    paragraphs: [
      'Nous collectons les données nécessaires au compte : identité, e-mail, téléphone, identifiants de connexion (ou compte Google), progression pédagogique, abonnements et réservations.',
      'Les paiements sont traités via FedaPay ; nous ne stockons pas les données complètes de carte bancaire.',
    ],
  },
  {
    title: '3. Finalités',
    paragraphs: ['Vos données sont utilisées pour :'],
    bullets: [
      'créer et sécuriser votre compte ;',
      'fournir les contenus, examens et réservations ;',
      'gérer les abonnements et la facturation ;',
      'envoyer des e-mails transactionnels (sécurité, confirmations) ;',
      'améliorer le service et assurer le support.',
    ],
  },
  {
    title: '4. Base légale et durée',
    paragraphs: [
      'Le traitement repose sur l’exécution du contrat (compte / abonnement) et, le cas échéant, sur votre consentement (ex. connexion Google).',
      'Les données sont conservées pendant la durée du compte, puis archivées ou supprimées selon les obligations légales applicables.',
    ],
  },
  {
    title: '5. Partage',
    paragraphs: [
      'Nous ne vendons pas vos données. Elles peuvent être partagées avec des prestataires techniques (hébergement, e-mail, paiement) uniquement pour opérer le service.',
    ],
  },
  {
    title: '6. Vos droits',
    paragraphs: [
      'Vous pouvez accéder à vos données, les rectifier depuis votre profil, et demander la suppression de votre compte directement dans l’application (Profil → Supprimer mon compte) ou auprès du support.',
    ],
  },
  {
    title: '7. Sécurité',
    paragraphs: [
      'Nous mettons en œuvre des mesures raisonnables (mots de passe hachés, accès authentifié, limitation des API) pour protéger vos informations.',
    ],
  },
] as const

export function PrivacyPolicyScreen() {
  const navigation = useNavigation<Nav>()

  return (
    <DarkScreen hideFooter>
      <PageNavbar
        title="Politique de confidentialité"
        icon={Shield}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.updatedRow}>
          <Shield size={16} color={dark.green} />
          <Text style={styles.updated}>Dernière mise à jour : juillet 2026</Text>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.paragraphs.map((paragraph) => (
              <ParagraphWithBrand key={paragraph} text={paragraph} style={styles.paragraph} />
            ))}
            {'bullets' in section && section.bullets
              ? section.bullets.map((bullet) => (
                  <Text key={bullet} style={styles.bullet}>
                    • {bullet}
                  </Text>
                ))
              : null}
          </View>
        ))}
      </ScrollView>
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
  },
  updatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  updated: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
  },
  card: {
    backgroundColor: dark.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
    marginBottom: 2,
  },
  paragraph: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textMuted,
  },
  bullet: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textMuted,
    paddingLeft: 4,
  },
})
