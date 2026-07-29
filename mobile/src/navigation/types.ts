export type RegisterProfileParams = {
  firstName: string
  lastName: string
  phone: string
}

export type RootStackParamList = {
  Intro: undefined
  Onboarding: undefined
  Login: { message?: string } | undefined
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
    mode?: 'practice' | 'test'
    subjectNumber?: number
  }
  ChapterQuestionsList: {
    chapterId: string
    chapterName: string
  }
  ChapterTestSubject: {
    chapterId: string
    chapterName: string
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
