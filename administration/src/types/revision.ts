export type MediaType = '' | 'video' | 'image'

export interface ContentModule {
  id: string
  name: string
  title: string
  text: string
  mediaType: MediaType
  videoUrl: string
  imageUrl: string
  mediaBytes: number
  order: number
}

export interface Course {
  id: string
  title: string
  order: number
  published: boolean
  modules: ContentModule[]
}

export interface Chapter {
  id: string
  name: string
  order: number
  published: boolean
  courses: Course[]
  createdAt?: string
  updatedAt?: string
}

export interface ModulePayload {
  name?: string
  title?: string
  text?: string
  mediaType?: MediaType
  videoUrl?: string
  imageUrl?: string
  mediaBytes?: number
}
