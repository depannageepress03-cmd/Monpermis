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
import { HomeScreen } from '../screens/HomeScreen'
import { RegisterScreen } from '../screens/RegisterScreen'
import { RegisterPasswordScreen } from '../screens/RegisterPasswordScreen'
import { TermsOfUseScreen } from '../screens/TermsOfUseScreen'
import { AbonnementScreen } from '../screens/AbonnementScreen'
import { CodeRouteScreen } from '../screens/CodeRouteScreen'
import { RevisionChapitresScreen } from '../screens/code-route/RevisionChapitresScreen'
import { ChapterCoursesScreen } from '../screens/code-route/ChapterCoursesScreen'
import { CourseDetailScreen } from '../screens/code-route/CourseDetailScreen'
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
      Register: 'inscription',
      RegisterPassword: 'inscription/mot-de-passe',
      TermsOfUse: 'conditions-utilisation',
      Home: 'accueil',
      Abonnement: 'abonnement',
      CodeRoute: 'code-de-la-route',
      RevisionChapitres: 'code-de-la-route/revision-chapitres',
      ChapterCourses: 'code-de-la-route/revision-chapitres/cours',
      CourseDetail: 'code-de-la-route/revision-chapitres/cours/detail',
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
        name="Abonnement"
        component={AbonnementScreen}
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
