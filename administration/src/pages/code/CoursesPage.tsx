import { FormEvent, useCallback, useEffect, useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  createStandaloneCourse,
  createStandaloneModule,
  deleteStandaloneCourse,
  deleteStandaloneModule,
  fetchStandaloneCourses,
  updateStandaloneCourse,
  updateStandaloneModule,
} from '../../api/courses'
import { uploadRevisionImage } from '../../api/revision'
import { PublishSwitch } from '../../components/PublishSwitch'
import { RichTextEditor } from '../../components/RichTextEditor'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import type { ContentModule, Course, MediaType } from '../../types/revision'
import { Button, EmptyState, SkeletonBlock } from '../../ui'

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').trim()
}

function ModuleCard({
  courseId,
  courseTitle,
  module,
  onUpdated,
}: {
  courseId: string
  courseTitle: string
  module: ContentModule
  onUpdated: () => void
}) {
  const inferredType: MediaType =
    module.mediaType || (module.videoUrl ? 'video' : module.imageUrl ? 'image' : '')
  const isEmpty = !stripHtml(module.text) && !module.videoUrl?.trim() && !module.imageUrl?.trim()

  const [text, setText] = useState(module.text)
  const [mediaType, setMediaType] = useState<MediaType>(inferredType)
  const [videoUrl, setVideoUrl] = useState(module.videoUrl)
  const [imageUrl, setImageUrl] = useState(module.imageUrl)
  const [mediaBytes, setMediaBytes] = useState(module.mediaBytes || 0)
  const [editing, setEditing] = useState(isEmpty)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setText(module.text)
    setMediaType(
      module.mediaType || (module.videoUrl ? 'video' : module.imageUrl ? 'image' : ''),
    )
    setVideoUrl(module.videoUrl)
    setImageUrl(module.imageUrl)
    setMediaBytes(module.mediaBytes || 0)
  }, [module])

  const handleSave = async () => {
    const token = getAdminToken()
    if (!token) return
    setSaving(true)
    setError(null)
    try {
      await updateStandaloneModule(token, courseId, module.id, {
        name: courseTitle,
        title: courseTitle,
        text,
        mediaType,
        videoUrl: mediaType === 'video' ? videoUrl.trim() : '',
        imageUrl: mediaType === 'image' ? imageUrl : '',
        mediaBytes: mediaType === 'image' ? mediaBytes : 0,
      })
      setEditing(false)
      onUpdated()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Supprimer ce contenu ?')) return
    const token = getAdminToken()
    if (!token) return
    try {
      await deleteStandaloneModule(token, courseId, module.id)
      onUpdated()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Suppression impossible')
    }
  }

  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return
    const token = getAdminToken()
    if (!token) return
    setUploading(true)
    setError(null)
    try {
      const uploaded = await uploadRevisionImage(token, file)
      setImageUrl(uploaded.imageUrl)
      setMediaBytes(uploaded.mediaBytes || file.size || 0)
      setMediaType('image')
      setVideoUrl('')
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Import image impossible')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={`revision-module${editing ? ' is-editing' : ' is-saved'}`}>
      <div className="revision-module-header">
        <div className="revision-module-title-wrap">
          <span className="revision-module-title">{courseTitle}</span>
          {editing ? <span className="revision-tag revision-tag-edit">Édition</span> : null}
        </div>
        <div className="revision-item-actions">
          {!editing ? (
            <button type="button" className="btn-outline-sm" onClick={() => setEditing(true)}>
              Modifier
            </button>
          ) : null}
          <button type="button" className="btn-icon-danger" onClick={() => void handleDelete()}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="revision-module-editor">
          <label>Texte</label>
          <RichTextEditor value={text} onChange={setText} />
          <div className="revision-media-type">
            <button
              type="button"
              className={mediaType === '' ? 'is-active' : ''}
              onClick={() => {
                setMediaType('')
                setVideoUrl('')
                setImageUrl('')
              }}
            >
              Texte seul
            </button>
            <button
              type="button"
              className={mediaType === 'image' ? 'is-active' : ''}
              onClick={() => setMediaType('image')}
            >
              Image
            </button>
            <button
              type="button"
              className={mediaType === 'video' ? 'is-active' : ''}
              onClick={() => setMediaType('video')}
            >
              Vidéo
            </button>
          </div>
          {mediaType === 'image' ? (
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => void handleImageUpload(e.target.files?.[0])}
            />
          ) : null}
          {mediaType === 'video' ? (
            <label className="revision-field">
              <span>Lien vidéo (YouTube / Vimeo)</span>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value)
                  setMediaBytes(0)
                  setImageUrl('')
                }}
                placeholder="https://www.youtube.com/watch?v=… ou https://vimeo.com/…"
              />
            </label>
          ) : null}
          {imageUrl && mediaType === 'image' ? (
            <img src={imageUrl} alt="" className="revision-media-preview" />
          ) : null}
          {videoUrl.trim() && mediaType === 'video' ? (
            <p className="revision-field-hint" style={{ marginTop: 8 }}>
              Lien enregistré : {videoUrl.trim()}
            </p>
          ) : null}
          <div className="revision-actions">
            <Button variant="primary" disabled={saving || uploading} onClick={() => void handleSave()}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      ) : (
        <div className="revision-module-preview">
          {stripHtml(module.text) ? (
            <div dangerouslySetInnerHTML={{ __html: module.text }} />
          ) : (
            <p className="revision-empty">Pas de texte</p>
          )}
        </div>
      )}
    </div>
  )
}

function CourseCard({ course, onUpdated }: { course: Course; onUpdated: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePublish = async (published: boolean) => {
    const token = getAdminToken()
    if (!token) return
    setBusy(true)
    try {
      await updateStandaloneCourse(token, course.id, { published })
      onUpdated()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Publication impossible')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Supprimer le cours « ${course.title} » et tous ses modules ?`)) return
    const token = getAdminToken()
    if (!token) return
    try {
      await deleteStandaloneCourse(token, course.id)
      onUpdated()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Suppression impossible')
    }
  }

  const handleAddModule = async () => {
    const token = getAdminToken()
    if (!token) return
    try {
      await createStandaloneModule(token, course.id)
      setExpanded(true)
      onUpdated()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Ajout impossible')
    }
  }

  return (
    <div className="revision-course">
      <div className="revision-course-header">
        <button
          type="button"
          className="revision-course-toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <BookOpen size={18} />
          <span>{course.title}</span>
          <span className="revision-count">
            {course.modules.length} contenu{course.modules.length !== 1 ? 's' : ''}
          </span>
        </button>
        <div className="revision-item-actions">
          <PublishSwitch checked={course.published} onChange={handlePublish} disabled={busy} />
          <button type="button" className="btn-text-danger" onClick={() => void handleDelete()}>
            <Trash2 size={16} />
            Supprimer
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="revision-course-body">
          {course.modules.length === 0 ? (
            <p className="revision-empty">Aucun contenu. Ajoutez une vidéo, une image ou du texte.</p>
          ) : (
            <div className="revision-modules-list">
              {course.modules.map((module) => (
                <ModuleCard
                  key={module.id}
                  courseId={course.id}
                  courseTitle={course.title}
                  module={module}
                  onUpdated={onUpdated}
                />
              ))}
            </div>
          )}
          <div className="revision-actions revision-actions-footer">
            <button type="button" className="btn-outline-sm" onClick={() => void handleAddModule()}>
              <Plus size={16} />
              Ajouter un contenu
            </button>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

export function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { courses: data } = await fetchStandaloneCourses(token)
      setCourses(data)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    const token = getAdminToken()
    if (!token) return
    const value = title.trim()
    if (value.length < 2) return
    setAdding(true)
    setError(null)
    try {
      await createStandaloneCourse(token, value)
      setTitle('')
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Création impossible')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-module-header">
        <p className="admin-module-kicker">Code de la route</p>
        <h1 className="admin-module-title">Cours</h1>
        <p className="subtitle" style={{ marginTop: 6 }}>
          Créez des cours et leurs modules (texte, image, vidéo). Les cours ne sont plus liés aux
          chapitres.
        </p>
      </header>

      <section className="revision-workspace" style={{ marginTop: 18 }}>
        <form onSubmit={handleCreate} className="revision-inline-form revision-add-course">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du nouveau cours"
            required
            minLength={2}
          />
          <button type="submit" className="btn-primary btn-primary-inline" disabled={adding}>
            <Plus size={16} />
            {adding ? 'Création…' : 'Créer un cours'}
          </button>
        </form>

        {error ? (
          <p className="form-error" role="alert" style={{ marginTop: 12 }}>
            {error}
          </p>
        ) : null}

        {loading ? (
          <div style={{ marginTop: 16 }}>
            <SkeletonBlock rows={5} />
          </div>
        ) : courses.length === 0 ? (
          <EmptyState
            title="Aucun cours"
            description="Créez un premier cours, puis ajoutez ses contenus (modules)."
          />
        ) : (
          <div className="revision-courses-stack" style={{ marginTop: 16 }}>
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} onUpdated={() => void load()} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
