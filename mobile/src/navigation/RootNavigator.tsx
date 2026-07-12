import { NavigationContainer, type LinkingOptions } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import * as Linking from 'expo-linking'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AppErrorBoundary } from '../components/AppErrorBoundary'
import { AuthProvider } from '../context/AuthContext'
import type { RootStackParamList } from './types'
import { IntroScreen } from '../screens/IntroScreen'

const Stack = createNativeStackNavigator<RootStackParamList>()

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'monpermis://'],
  config: {
    screens: {
      Intro: '',
      Login: 'connexion',
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
        getComponent={() => require('../screens/LoginScreen').LoginScreen}
        options={{ animation: 'fade', animationDuration: 480 }}
      />
      <Stack.Screen
        name="Home"
        getComponent={() => require('../screens/HomeScreen').HomeScreen}
        options={{ animation: 'fade', animationDuration: 480 }}
      />
      <Stack.Screen
        name="Register"
        getComponent={() => require('../screens/RegisterScreen').RegisterScreen}
      />
      <Stack.Screen
        name="RegisterPassword"
        getComponent={() => require('../screens/RegisterPasswordScreen').RegisterPasswordScreen}
      />
      <Stack.Screen
        name="TermsOfUse"
        getComponent={() => require('../screens/TermsOfUseScreen').TermsOfUseScreen}
      />
      <Stack.Screen
        name="Abonnement"
        getComponent={() => require('../screens/AbonnementScreen').AbonnementScreen}
      />
      <Stack.Screen
        name="CodeRoute"
        getComponent={() => require('../screens/CodeRouteScreen').CodeRouteScreen}
      />
      <Stack.Screen
        name="RevisionChapitres"
        getComponent={() => require('../screens/code-route/RevisionChapitresScreen').RevisionChapitresScreen}
      />
      <Stack.Screen
        name="ChapterCourses"
        getComponent={() => require('../screens/code-route/ChapterCoursesScreen').ChapterCoursesScreen}
      />
      <Stack.Screen
        name="CourseDetail"
        getComponent={() => require('../screens/code-route/CourseDetailScreen').CourseDetailScreen}
      />
      <Stack.Screen
        name="ChapterQuestionsList"
        getComponent={() => require('../screens/code-route/ChapterSectionScreens').ChapterQuestionsListScreen}
      />
      <Stack.Screen
        name="ChapterTestSubject"
        getComponent={() => require('../screens/code-route/ChapterSectionScreens').ChapterTestSubjectScreen}
      />
      <Stack.Screen
        name="ChapterQuestions"
        getComponent={() => require('../screens/code-route/ChapterQuestionsScreen').ChapterQuestionsScreen}
      />
      <Stack.Screen
        name="ExamensTest"
        getComponent={() => require('../screens/code-route/ExamensTestScreen').ExamensTestScreen}
      />
      <Stack.Screen
        name="ExamensTestTake"
        getComponent={() => require('../screens/code-route/ExamensTestScreen').ExamensTestTakeScreen}
      />
      <Stack.Screen
        name="MesNotes"
        getComponent={() => require('../screens/code-route/MesNotesScreen').MesNotesScreen}
      />
      <Stack.Screen
        name="ECodePermis"
        getComponent={() => require('../screens/code-route/ECodePermisScreen').ECodePermisScreen}
      />
      <Stack.Screen
        name="Conduite"
        getComponent={() => require('../screens/ConduiteScreen').ConduiteScreen}
      />
      <Stack.Screen
        name="ReservationFlow"
        getComponent={() => require('../screens/conduite/ReservationFlowScreen').ReservationFlowScreen}
      />
      <Stack.Screen
        name="LeconsChapitres"
        getComponent={() => require('../screens/conduite/LeconsChapitresScreen').LeconsChapitresScreen}
      />
      <Stack.Screen
        name="LeconsCourses"
        getComponent={() => require('../screens/conduite/LeconsCoursesScreen').LeconsCoursesScreen}
      />
      <Stack.Screen
        name="LeconDetail"
        getComponent={() => require('../screens/conduite/LeconDetailScreen').LeconDetailScreen}
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
