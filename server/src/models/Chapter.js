import mongoose from 'mongoose'

const contentModuleSchema = new mongoose.Schema(
  {
    name: { type: String, default: '', trim: true },
    title: { type: String, default: '', trim: true },
    text: { type: String, default: '' },
    mediaType: { type: String, enum: ['', 'video', 'image'], default: '' },
    videoUrl: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    mediaBytes: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
  },
  { _id: true, timestamps: true },
)

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: false },
    modules: [contentModuleSchema],
  },
  { _id: true, timestamps: true },
)

const chapterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: false },
    courses: [courseSchema],
  },
  { timestamps: true },
)

export function serializeModule(module) {
  const mediaType =
    module.mediaType ||
    (module.videoUrl ? 'video' : module.imageUrl ? 'image' : '')

  return {
    id: module._id,
    name: module.name || '',
    title: module.title || '',
    text: module.text || '',
    mediaType,
    videoUrl: mediaType === 'video' ? module.videoUrl || '' : '',
    imageUrl: mediaType === 'image' ? module.imageUrl || '' : '',
    mediaBytes: module.mediaBytes || 0,
    order: module.order,
  }
}

function serializeCourse(course) {
  return {
    id: course._id,
    title: course.title,
    order: course.order,
    published: Boolean(course.published),
    modules: [...course.modules]
      .sort((a, b) => a.order - b.order)
      .map(serializeModule),
  }
}

chapterSchema.methods.toAdminJSON = function toAdminJSON() {
  return {
    id: this._id,
    name: this.name,
    order: this.order,
    published: Boolean(this.published),
    courses: [...this.courses]
      .sort((a, b) => a.order - b.order)
      .map(serializeCourse),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

chapterSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    order: this.order,
    courses: [...this.courses]
      .filter((course) => course.published)
      .sort((a, b) => a.order - b.order)
      .map((course) => ({
        id: course._id,
        title: course.title,
        order: course.order,
        modules: [...course.modules]
          .sort((a, b) => a.order - b.order)
          .map(serializeModule),
      })),
  }
}

export const Chapter = mongoose.model('Chapter', chapterSchema)
