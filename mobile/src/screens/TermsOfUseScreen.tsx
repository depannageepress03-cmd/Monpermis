import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { FileText } from 'lucide-react-native'
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native'
import { BrandName } from '../components/BrandName'
import { DarkScreen } from '../components/DarkScreen'
import { PageNavbar } from '../components/PageNavbar'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'TermsOfUse'>

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
    title: '1. Objet',
    paragraphs: [
      "Les présentes conditions régissent l'accès et l'utilisation de Monpermis.bj, application d'accompagnement à la préparation du permis de conduire (code de la route et conduite).",
      "En créant un compte ou en utilisant l'application, vous acceptez ces conditions dans leur intégralité.",
    ],
  },
  {
    title: '2. Description du service',
    paragraphs: [
      "Monpermis.bj propose des contenus pédagogiques, des exercices, des examens blancs et un suivi de progression pour préparer le code de la route et la conduite.",
      "Les informations fournies sont à titre pédagogique. Elles ne se substituent pas aux textes officiels ni aux consignes de votre auto-école ou de l'autorité compétente. Vérifiez toujours les règles en vigueur auprès des sources officielles.",
    ],
  },
  {
    title: '3. Inscription et compte utilisateur',
    paragraphs: [
      "L'inscription nécessite des informations exactes (identité, e-mail, téléphone le cas échéant) et un mot de passe respectant les critères de sécurité affichés.",
      "Vous êtes responsable de la confidentialité de vos identifiants et de toute activité réalisée depuis votre compte. Un compte est personnel et ne doit pas être partagé.",
    ],
  },
  {
    title: '4. Communications',
    paragraphs: [
      "En vous inscrivant, vous pouvez recevoir des e-mails transactionnels (bienvenue, sécurité du compte) et des messages liés à votre progression ou à votre formation.",
      "Vous pouvez exercer vos droits et supprimer votre compte depuis Profil → Supprimer mon compte, ou en contactant le support.",
    ],
  },
  {
    title: '5. Utilisation acceptable',
    paragraphs: ['L’utilisateur s’engage à ne pas :'],
    bullets: [
      'utiliser le service à des fins illégales ou frauduleuses ;',
      'tenter d’accéder de manière non autorisée aux systèmes ou données ;',
      'copier, redistribuer ou vendre les contenus sans autorisation ;',
      'publier ou transmettre des contenus nuisibles, diffamatoires ou contraires à la loi ;',
      'usurper l’identité d’un tiers ou créer de faux comptes.',
    ],
  },
  {
    title: '6. Propriété intellectuelle',
    paragraphs: [
      "La marque Monpermis.bj, l'interface, les contenus pédagogiques, le code et les éléments graphiques sont protégés.",
      "Toute reproduction non autorisée est interdite, sauf usage personnel et privé dans le cadre de votre formation.",
    ],
  },
  {
    title: '7. Disponibilité et responsabilité',
    paragraphs: [
      "Le service est fourni « en l'état ». Monpermis.bj ne garantit pas une disponibilité ininterrompue.",
      "L'application ne peut être tenue responsable des décisions prises sur la base des contenus affichés, ni du résultat d'un examen officiel (code ou conduite).",
    ],
  },
  {
    title: '8. Suspension et résiliation',
    paragraphs: [
      "Nous nous réservons le droit de suspendre ou supprimer un compte en cas de violation des présentes conditions.",
      "Vous pouvez supprimer votre compte à tout moment depuis Profil → Supprimer mon compte, ou en contactant le support.",
    ],
  },
  {
    title: '9. Données personnelles',
    paragraphs: [
      "Vos données sont traitées pour créer et gérer votre compte, assurer le suivi pédagogique et améliorer le service.",
      "Pour toute question relative à vos données, contactez l'éditeur de Monpermis.bj.",
    ],
  },
  {
    title: '10. Droit applicable',
    paragraphs: [
      "Les présentes conditions sont régies par le droit applicable dans le pays d'exploitation du service.",
      "En cas de litige, les parties s'efforceront de trouver une solution amiable avant toute action judiciaire.",
    ],
  },
] as const

export function TermsOfUseScreen() {
  const navigation = useNavigation<Nav>()

  return (
    <DarkScreen hideFooter>
      <PageNavbar
        title="Conditions d'utilisation"
        icon={FileText}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.updatedRow}>
          <FileText size={16} color={dark.green} />
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

        <Pressable style={styles.backLink} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.backLinkText}>← Retour à l'inscription</Text>
        </Pressable>
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
  backLink: {
    marginTop: 12,
    paddingVertical: 12,
  },
  backLinkText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.green,
  },
})
