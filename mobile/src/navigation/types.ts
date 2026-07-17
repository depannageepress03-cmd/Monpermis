export type RegisterProfileParams = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export type RootStackParamList = {
  Intro: undefined
  Login: { message?: string } | undefined
  ForgotPassword: undefined
  Register: undefined
  RegisterPassword: RegisterProfileParams
  TermsOfUse: undefined
  Home: undefined
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
  CourseAiChat: {
    chapterId: string
    courseId: string
    courseTitle: string
  }
  ChapterQuestions: {
    chapterId: string
    chapterName: string
    mode?: 'practice' | 'test'
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
