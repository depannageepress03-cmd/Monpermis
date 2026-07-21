import { NavigationContainer, type LinkingOptions } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import * as Linking from 'expo-linking'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AppErrorBoundary } from '../components/AppErrorBoundary'
import { AuthProvider } from '../context/AuthContext'
import type { RootStackParamList } from './types'
import { IntroScreen } from '../screens/IntroScreen'
import { LoginScreen } from '../screens/LoginScreen'
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen'
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen'
import { VerifyEmailScreen } from '../screens/VerifyEmailScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { RegisterScreen } from '../screens/RegisterScreen'
import { RegisterPasswordScreen } from '../screens/RegisterPasswordScreen'
import { TermsOfUseScreen } from '../screens/TermsOfUseScreen'
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen'
import { MentionsLegalesScreen } from '../screens/MentionsLegalesScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { NotificationsScreen } from '../screens/NotificationsScreen'
import { AbonnementScreen } from '../screens/AbonnementScreen'
import { PaymentHistoryScreen } from '../screens/PaymentHistoryScreen'
import { CodeRouteScreen } from '../screens/CodeRouteScreen'
import { RevisionChapitresScreen } from '../screens/code-route/RevisionChapitresScreen'
import { ChapterCoursesScreen } from '../screens/code-route/ChapterCoursesScreen'
import { CourseDetailScreen } from '../screens/code-route/CourseDetailScreen'
import { CourseAiChatScreen } from '../screens/code-route/CourseAiChatScreen'
import { ChapterQuestionsListScreen, ChapterTestSubjectScreen } from '../screens/code-route/ChapterSectionScreens'
import { ChapterQuestionsScreen } from '../screens/code-route/ChapterQuestionsScreen'
import { ExamensTestScreen, ExamensTestTakeScreen } from '../screens/code-route/ExamensTestScreen'
import { MesNotesScreen } from '../screens/code-route/MesNotesScreen'
import { ECodePermisScreen, ECodePermisTakeScreen } from '../screens/code-route/ECodePermisScreen'
import { ConduiteScreen } from '../screens/ConduiteScreen'
import { ReservationFlowScreen } from '../screens/conduite/ReservationFlowScreen'
import { LeconsChapitresScreen } from '../screens/conduite/LeconsChapitresScreen'
import { LeconsCoursesScreen } from '../screens/conduite/LeconsCoursesScreen'
import { LeconDetailScreen } from '../screens/conduite/LeconDetailScreen'

const Stack = createNativeStackNavigator<RootStackParamList>()

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'monpermis://'],
  config: {
    screens: {
      Intro: '',
      Login: 'connexion',
      ForgotPassword: 'connexion/mot-de-passe-oublie',
      ResetPassword: 'reinitialiser-mot-de-passe',
      VerifyEmail: 'verifier-email',
      Register: 'inscription',
      RegisterPassword: 'inscription/mot-de-passe',
      TermsOfUse: 'conditions-utilisation',
      PrivacyPolicy: 'politique-de-confidentialite',
      MentionsLegales: 'mentions-legales',
      Home: 'accueil',
      Profile: 'profil',
      Notifications: 'notifications',
      Abonnement: 'abonnement',
      HistoriquePaiements: 'abonnement/historique',
      CodeRoute: 'code-de-la-route',
      RevisionChapitres: 'code-de-la-route/revision-chapitres',
      ChapterCourses: 'code-de-la-route/revision-chapitres/cours',
      CourseDetail: 'code-de-la-route/revision-chapitres/cours/detail',
      CourseAiChat: 'code-de-la-route/revision-chapitres/cours/chat',
      ChapterQuestionsList: 'code-de-la-route/revision-chapitres/questions-liste',
      ChapterTestSubject: 'code-de-la-route/revision-chapitres/sujet-test',
      ChapterQuestions: 'code-de-la-route/revision-chapitres/questions',
      ExamensTest: 'code-de-la-route/examens-test',
      ExamensTestTake: 'code-de-la-route/examens-test/passer',
      MesNotes: 'code-de-la-route/mes-notes',
      ECodePermis: 'code-de-la-route/e-codepermis',
      ECodePermisTake: 'code-de-la-route/e-codepermis/passer',
      Conduite: 'conduite',
      ReservationFlow: 'conduite/reservation',
      LeconsChapitres: 'conduite/lecons',
      LeconsCourses: 'conduite/lecons/cours',
      LeconDetail: 'conduite/lecons/cours/detail',
    },
  },
}

function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Intro"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Intro" component={IntroScreen} options={{ animation: 'none' }} />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ animation: 'fade', animationDuration: 480 }}
      />
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ animation: 'fade', animationDuration: 480 }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
      />
      <Stack.Screen
        name="VerifyEmail"
        component={VerifyEmailScreen}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
      />
      <Stack.Screen
        name="RegisterPassword"
        component={RegisterPasswordScreen}
      />
      <Stack.Screen
        name="TermsOfUse"
        component={TermsOfUseScreen}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
      />
      <Stack.Screen
        name="MentionsLegales"
        component={MentionsLegalesScreen}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
      />
      <Stack.Screen
        name="Abonnement"
        component={AbonnementScreen}
      />
      <Stack.Screen
        name="HistoriquePaiements"
        component={PaymentHistoryScreen}
      />
      <Stack.Screen
        name="CodeRoute"
        component={CodeRouteScreen}
      />
      <Stack.Screen
        name="RevisionChapitres"
        component={RevisionChapitresScreen}
      />
      <Stack.Screen
        name="ChapterCourses"
        component={ChapterCoursesScreen}
      />
      <Stack.Screen
        name="CourseDetail"
        component={CourseDetailScreen}
      />
      <Stack.Screen
        name="CourseAiChat"
        component={CourseAiChatScreen}
      />
      <Stack.Screen
        name="ChapterQuestionsList"
        component={ChapterQuestionsListScreen}
      />
      <Stack.Screen
        name="ChapterTestSubject"
        component={ChapterTestSubjectScreen}
      />
      <Stack.Screen
        name="ChapterQuestions"
        component={ChapterQuestionsScreen}
      />
      <Stack.Screen
        name="ExamensTest"
        component={ExamensTestScreen}
      />
      <Stack.Screen
        name="ExamensTestTake"
        component={ExamensTestTakeScreen}
      />
      <Stack.Screen
        name="MesNotes"
        component={MesNotesScreen}
      />
      <Stack.Screen
        name="ECodePermis"
        component={ECodePermisScreen}
      />
      <Stack.Screen
        name="ECodePermisTake"
        component={ECodePermisTakeScreen}
      />
      <Stack.Screen
        name="Conduite"
        component={ConduiteScreen}
      />
      <Stack.Screen
        name="ReservationFlow"
        component={ReservationFlowScreen}
      />
      <Stack.Screen
        name="LeconsChapitres"
        component={LeconsChapitresScreen}
      />
      <Stack.Screen
        name="LeconsCourses"
        component={LeconsCoursesScreen}
      />
      <Stack.Screen
        name="LeconDetail"
        component={LeconDetailScreen}
      />
    </Stack.Navigator>
  )
}

export function RootNavigator() {
  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <AuthProvider>
          <NavigationContainer linking={linking}>
            <StatusBar style="dark" />
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  )
}
