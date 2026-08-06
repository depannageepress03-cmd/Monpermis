import mongoose from 'mongoose'
import { serializeModule } from './BaseChapter.js'

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

const revisionCourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    // Chapitre de rattachement : les notions sont toujours classées par chapitre.
    chapter: { type: mongoose.Schema.Types.ObjectId, ref: 'Chapter', default: null, index: true },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: false },
    modules: [contentModuleSchema],
  },
  { timestamps: true, collection: 'revisioncourses' },
)

revisionCourseSchema.methods.toAdminJSON = function toAdminJSON() {
  return {
    id: String(this._id),
    title: this.title,
    chapterId: this.chapter ? String(this.chapter) : '',
    order: this.order,
    published: Boolean(this.published),
    modules: [...this.modules]
      .sort((a, b) => a.order - b.order)
      .map(serializeModule),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

revisionCourseSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: String(this._id),
    title: this.title,
    chapterId: this.chapter ? String(this.chapter) : '',
    order: this.order,
    modules: [...this.modules]
      .sort((a, b) => a.order - b.order)
      .map(serializeModule),
  }
}

export const RevisionCourse = mongoose.model('RevisionCourse', revisionCourseSchema)
