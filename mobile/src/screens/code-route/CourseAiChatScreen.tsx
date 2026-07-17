import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { MessageCircle, Send } from 'lucide-react-native'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { AiTutorError, sendCourseTutorMessage, type AiChatMessage } from '../../api/aiTutor'
import { fetchSubscriptionMe } from '../../api/subscriptions'
import { DarkScreen } from '../../components/DarkScreen'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'CourseAiChat'>
type Route = RouteProp<RootStackParamList, 'CourseAiChat'>

const WELCOME: AiChatMessage = {
  role: 'assistant',
  content:
    'Bonjour ! Pose-moi une question sur ce cours : je m’appuie uniquement sur son contenu pour t’expliquer.',
}

export function CourseAiChatScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { user, loading: authLoading } = useRequireAuth(navigation)
  const { chapterId, courseId, courseTitle } = route.params

  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<AiChatMessage[]>([WELCOME])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<FlatList<AiChatMessage>>(null)

  useEffect(() => {
    if (!user) return
    void fetchSubscriptionMe()
      .then((access) => setAllowed(Boolean(access.accessAiChat)))
      .catch(() => setAllowed(false))
  }, [user])

  const send = useCallback(async () => {
    const content = draft.trim()
    if (!content || sending) return

    const nextMessages: AiChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setDraft('')
    setSending(true)
    setError(null)

    try {
      const history = nextMessages.filter((item, index) => !(index === 0 && item.role === 'assistant'))
      const data = await sendCourseTutorMessage({
        chapterId,
        courseId,
        messages: history,
      })
      setMessages([...nextMessages, data.message])
    } catch (err) {
      setError(err instanceof AiTutorError ? err.message : 'Envoi impossible')
    } finally {
      setSending(false)
    }
  }, [chapterId, courseId, draft, messages, sending])

  if (authLoading || !user || allowed === null) return <ScreenLoader />

  if (!allowed) {
    return (
      <DarkScreen>
        <PageNavbar title="Chat IA" icon={MessageCircle} onBack={() => navigation.goBack()} />
        <View style={styles.locked}>
          <Text style={styles.lockedTitle}>Chat IA réservé</Text>
          <Text style={styles.lockedCopy}>
            Cette fonctionnalité est incluse dans certaines formules (ex. Pack complet). Souscris une
            offre qui inclut le chat IA tuteur.
          </Text>
          <Pressable style={styles.upgradeBtn} onPress={() => navigation.navigate('Abonnement')}>
            <Text style={styles.upgradeBtnText}>Voir les offres</Text>
          </Pressable>
        </View>
      </DarkScreen>
    )
  }

  return (
    <DarkScreen>
      <PageNavbar
        title="Chat IA"
        icon={MessageCircle}
        onBack={() => navigation.goBack()}
      />
      <Text style={styles.courseHint} numberOfLines={2}>
        Cours : {courseTitle}
      </Text>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  item.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant,
                ]}
              >
                {item.content}
              </Text>
            </View>
          )}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Pose ta question sur le cours…"
            placeholderTextColor={dark.textMuted}
            multiline
            maxLength={1500}
            editable={!sending}
          />
          <Pressable
            style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => void send()}
            disabled={!draft.trim() || sending}
            accessibilityLabel="Envoyer"
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Send size={18} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  courseHint: {
    marginHorizontal: 16,
    marginBottom: 8,
    color: dark.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: dark.green,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
  },
  bubbleText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextUser: { color: '#FFFFFF' },
  bubbleTextAssistant: { color: dark.textPrimary },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: dark.border,
    backgroundColor: dark.bg,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: dark.textPrimary,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.green,
  },
  sendBtnDisabled: { opacity: 0.45 },
  error: {
    marginHorizontal: 16,
    marginBottom: 6,
    color: dark.coral,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  locked: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 12,
  },
  lockedTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: dark.textPrimary,
  },
  lockedCopy: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: dark.textMuted,
  },
  upgradeBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: dark.green,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  upgradeBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
  },
})
