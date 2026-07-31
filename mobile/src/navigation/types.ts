export type RegisterProfileParams = {
  firstName: string
  lastName: string
  phone: string
}

export type RootStackParamList = {
  Intro: undefined
  Onboarding: undefined
  Login: { message?: string } | undefined
  ForgotPassword: undefined
  ResetPassword: { token?: string }
  VerifyEmail: { token?: string }
  Register: undefined
  RegisterPassword: RegisterProfileParams
  TermsOfUse: undefined
  PrivacyPolicy: undefined
  MentionsLegales: undefined
  Home: undefined
  Profile: undefined
  Notifications: undefined
  Actualites: undefined
  ActualiteDetail: { id: string }
  Abonnement: undefined
  HistoriquePaiements: undefined
  CodeRoute: undefined
  RevisionChapitres: undefined
  /** Liste des chapitres pour accéder aux cours (remplace E-Codepermis dans le hub). */
  CodeCours: undefined
  ChapterCourses: {
    chapterId: string
    chapterName: string
    courses: {
      id: string
      title: string
      modules: {
        id: string
        name: string
        title: string
        text: string
        mediaType: '' | 'video' | 'image'
        videoUrl: string
        imageUrl: string
        mediaBytes: number
        order: number
      }[]
    }[]
  }
  CourseDetail: {
    chapterId: string
    chapterName: string
    course: {
      id: string
      title: string
      modules: {
        id: string
        name: string
        title: string
        text: string
        mediaType: '' | 'video' | 'image'
        videoUrl: string
        imageUrl: string
        mediaBytes: number
        order: number
      }[]
    }
    courses: {
      id: string
      title: string
      modules: {
        id: string
        name: string
        title: string
        text: string
        mediaType: '' | 'video' | 'image'
        videoUrl: string
        imageUrl: string
        mediaBytes: number
        order: number
      }[]
    }[]
  }
  ChapterQuestions: {
    chapterId: string
    chapterName: string
    chapterOrder?: number
    mode?: 'practice' | 'test'
    subjectNumber?: number
  }
  ChapterQuestionsList: {
    chapterId: string
    chapterName: string
    chapterOrder?: number
  }
  ChapterTestSubject: {
    chapterId: string
    chapterName: string
    chapterOrder?: number
  }
  ExamensTest: undefined
  ExamensTestTake: { examNumber: number }
  MesNotes: undefined
  ECodePermis: undefined
  ECodePermisTake: { examNumber: number }
  Conduite: undefined
  ReservationFlow: undefined
  MesReservations: undefined
  ReservationConfirm: {
    reservationId: string
    moniteurName: string
    vehicleBrand?: string
    date: string
    startTime: string
    endTime: string
    hours: number
    priceFcfa: number
    paymentMethod: 'solde' | 'mobile_money' | 'promo'
    whatsappLink?: string
    fromList?: boolean
  }
  LeconsChapitres: undefined
  LeconsCourses: {
    chapterId: string
    chapterName: string
    courses: {
      id: string
      title: string
      modules: {
        id: string
        name: string
        title: string
        text: string
        mediaType: '' | 'video' | 'image'
        videoUrl: string
        imageUrl: string
        mediaBytes: number
        order: number
      }[]
    }[]
  }
  LeconDetail: {
    chapterId: string
    chapterName: string
    course: {
      id: string
      title: string
      modules: {
        id: string
        name: string
        title: string
        text: string
        mediaType: '' | 'video' | 'image'
        videoUrl: string
        imageUrl: string
        mediaBytes: number
        order: number
      }[]
    }
    courses: {
      id: string
      title: string
      modules: {
        id: string
        name: string
        title: string
        text: string
        mediaType: '' | 'video' | 'image'
        videoUrl: string
        imageUrl: string
        mediaBytes: number
        order: number
      }[]
    }[]
  }
}
