import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Scale } from 'lucide-react-native'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { BrandName } from '../components/BrandName'
import { DarkScreen } from '../components/DarkScreen'
import { PageNavbar } from '../components/PageNavbar'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'MentionsLegales'>

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
    title: '1. Éditeur du service',
    paragraphs: [
      'Le service Monpermis.bj est édité et exploité dans le cadre de l’activité de formation à la conduite automobile au Bénin.',
      'Application mobile et site web : Monpermis.bj (marque commerciale).',
      'Contact : noreply@monpermis.bj (demandes générales via le support indiqué dans l’application).',
    ],
  },
  {
    title: '2. Directeur de la publication',
    paragraphs: [
      'Le directeur de la publication est le responsable de l’édition de Monpermis.bj.',
    ],
  },
  {
    title: '3. Hébergement',
    paragraphs: [
      'Le site et l’API sont hébergés par Render Services, Inc. (render.com).',
      'L’application mobile est distribuée via les stores Android / iOS selon les plateformes disponibles.',
    ],
  },
  {
    title: '4. Propriété intellectuelle',
    paragraphs: [
      'L’ensemble des éléments de Monpermis.bj (textes, graphismes, logo, interfaces, contenus pédagogiques) est protégé. Toute reproduction non autorisée est interdite.',
    ],
  },
  {
    title: '5. Données personnelles',
    paragraphs: [
      'Le traitement des données personnelles est décrit dans la Politique de confidentialité accessible depuis l’application et le site.',
    ],
  },
  {
    title: '6. Responsabilité',
    paragraphs: [
      'Monpermis.bj fournit un accompagnement pédagogique à la préparation du permis. L’éditeur ne peut être tenu responsable d’une utilisation non conforme du service ni des décisions administratives liées à l’examen du permis.',
    ],
  },
] as const

export function MentionsLegalesScreen() {
  const navigation = useNavigation<Nav>()

  return (
    <DarkScreen hideFooter>
      <PageNavbar
        title="Mentions légales"
        icon={Scale}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.updatedRow}>
          <Scale size={16} color={dark.green} />
          <Text style={styles.updated}>Dernière mise à jour : juillet 2026</Text>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.paragraphs.map((paragraph) => (
              <ParagraphWithBrand key={paragraph} text={paragraph} style={styles.paragraph} />
            ))}
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
    marginBottom: 16,
  },
  updated: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
  },
  card: {
    backgroundColor: dark.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: dark.border,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: dark.textPrimary,
    marginBottom: 8,
  },
  paragraph: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: dark.textMuted,
    marginBottom: 8,
  },
})
