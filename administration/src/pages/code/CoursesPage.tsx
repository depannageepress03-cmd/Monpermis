import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Copy,
  Film,
  GripVertical,
  Image,
  Pencil,
  Plus,
  Trash2,
  Type,
} from 'lucide-react'
import {
  createStandaloneCourse,
  createStandaloneModule,
  deleteStandaloneCourse,
  deleteStandaloneModule,
  duplicateStandaloneModule,
  fetchStandaloneCourses,
  reorderStandaloneCourses,
  reorderStandaloneModules,
  updateStandaloneCourse,
  updateStandaloneModule,
} from '../../api/courses'
import { uploadRevisionImage } from '../../api/revision'
import { AdminSectionHeader } from '../../components/AdminSectionHeader'
import { CmsWorkspace } from '../../ui'
import { MediaPreview } from '../../components/MediaPreview'
import { PublishSwitch } from '../../components/PublishSwitch'
import { RichTextEditor } from '../../components/RichTextEditor'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import { EmptyState, SkeletonBlock } from '../../ui'
import type { ChapterRef, ContentModule, Course, MediaType } from '../../types/revision'
import { describeModuleSize } from '../../utils/moduleSize'
import { stripHtml } from '../../utils/richText'

function useAdminSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
}

interface DragHandleProps {
  attributes: ReturnType<typeof useSortable>['attributes']
  listeners: ReturnType<typeof useSortable>['listeners']
}

function DragHandle({ attributes, listeners }: DragHandleProps) {
  return (
    <button
      type="button"
      className="drag-handle"
      aria-label="Réordonner"
      {...attributes}
      {...listeners}
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical size={16} />
    </button>
  )
}

interface ModuleEditorProps {
  courseId: string
  courseTitle: string
  module: ContentModule
  onUpdated: () => void
}

function ModuleEditor({
  courseId,
  courseTitle,
  module,
  onUpdated,
}: ModuleEditorProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id,
  })

  const inferredType: MediaType =
    module.mediaType ||
    (module.videoUrl ? 'video' : module.imageUrl ? 'image' : '')

  const isEmpty = !stripHtml(module.text) && !module.videoUrl?.trim() && !module.imageUrl?.trim()

  const [text, setText] = useState(module.text)
  const [mediaType, setMediaType] = useState<MediaType>(inferredType)
  const [videoUrl, setVideoUrl] = useState(module.videoUrl)
  const [imageUrl, setImageUrl] = useState(module.imageUrl)
  const [mediaBytes, setMediaBytes] = useState(module.mediaBytes || 0)
  const [editing, setEditing] = useState(isEmpty)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState(false)

  useEffect(() => {
    const type =
      module.mediaType ||
      (module.videoUrl ? 'video' : module.imageUrl ? 'image' : '')
    setText(module.text)
    setMediaType(type)
    setVideoUrl(module.videoUrl)
    setImageUrl(module.imageUrl)
    setMediaBytes(module.mediaBytes || 0)
    if (!stripHtml(module.text) && !module.videoUrl?.trim() && !module.imageUrl?.trim()) {
      setEditing(true)
    }
  }, [module])

  useEffect(() => {
    if (!savedNotice) return
    const timer = window.setTimeout(() => setSavedNotice(false), 3000)
    return () => window.clearTimeout(timer)
  }, [savedNotice])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }

  const sizeInfo = describeModuleSize({
    text,
    mediaType,
    videoUrl,
    imageUrl,
    mediaBytes,
  })

  const previewTitle = courseTitle
  const previewVideo = mediaType === 'video' ? videoUrl : ''
  const previewImage = mediaType === 'image' ? imageUrl : ''

  const handleMediaTypeChange = (next: MediaType) => {
    setMediaType(next)
    if (next === 'video') {
      setImageUrl('')
      setMediaBytes(0)
    } else if (next === 'image') {
      setVideoUrl('')
    } else {
      setVideoUrl('')
      setImageUrl('')
      setMediaBytes(0)
    }
  }

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
      setSavedNotice(true)
      onUpdated()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
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

  const handleDuplicate = async () => {
    const token = getAdminToken()
    if (!token) return

    setBusy(true)
    setError(null)
    try {
      await duplicateStandaloneModule(token, courseId, module.id)
      onUpdated()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Duplication impossible')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Supprimer ce contenu ?')) return
    const token = getAdminToken()
    if (!token) return

    setBusy(true)
    try {
      await deleteStandaloneModule(token, courseId, module.id)
      onUpdated()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Suppression impossible')
      setBusy(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`revision-module${isDragging ? ' is-dragging' : ''}${editing ? ' is-editing' : ' is-saved'}`}
    >
      <div className="revision-module-header">
        <DragHandle attributes={attributes} listeners={listeners} />
        <div className="revision-module-title-wrap">
          <span className="revision-module-title">{courseTitle}</span>
          {editing ? <span className="revision-tag revision-tag-edit">Édition</span> : null}
          {!editing && savedNotice ? <span className="revision-tag revision-tag-ok">Enregistré</span> : null}
        </div>
        <div className="revision-item-actions">
          {!editing ? (
            <button
              type="button"
              className="btn-outline-sm"
              onClick={() => setEditing(true)}
              title="Modifier"
            >
              <Pencil size={16} />
              Modifier
            </button>
          ) : null}
          <button
            type="button"
            className="btn-icon-muted"
            onClick={handleDuplicate}
            disabled={busy}
            aria-label="Dupliquer le contenu"
            title="Dupliquer"
          >
            <Copy size={16} />
          </button>
          <button
            type="button"
            className="btn-icon-danger"
            onClick={handleDelete}
            disabled={busy}
            aria-label="Supprimer le contenu"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="revision-module-workspace">
          <div className="revision-module-form">
            <section className="revision-form-section">
              <h4 className="revision-form-section-title">Taille du contenu</h4>
              <div className={`revision-size-meter${sizeInfo.warning ? ' is-warning' : ''}`}>
                <strong>{sizeInfo.label}</strong>
                <span>{sizeInfo.detail}</span>
              </div>
            </section>

            <section className="revision-form-section">
              <h4 className="revision-form-section-title">Configuration des éléments</h4>

              <div className="revision-field">
                <span>Support média</span>
                <div className="revision-media-switch" role="group" aria-label="Type de média">
                  <button
                    type="button"
                    className={`revision-media-option${mediaType === 'video' ? ' active' : ''}`}
                    onClick={() => handleMediaTypeChange(mediaType === 'video' ? '' : 'video')}
                  >
                    <Film size={16} />
                    Vidéo
                  </button>
                  <button
                    type="button"
                    className={`revision-media-option${mediaType === 'image' ? ' active' : ''}`}
                    onClick={() => handleMediaTypeChange(mediaType === 'image' ? '' : 'image')}
                  >
                    <Image size={16} />
                    Image
                  </button>
                </div>
              </div>

              {mediaType === 'video' ? (
                <label className="revision-field">
                  <span>
                    <Film size={16} /> Lien vidéo (YouTube / Vimeo)
                  </span>
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
                  {videoUrl.trim() ? (
                    <button
                      type="button"
                      className="btn-text-danger"
                      onClick={() => {
                        setVideoUrl('')
                        setMediaBytes(0)
                      }}
                    >
                      Retirer la vidéo
                    </button>
                  ) : null}
                </label>
              ) : null}

              {mediaType === 'image' ? (
                <label className="revision-field">
                  <span>
                    <Image size={16} /> Image
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => handleImageUpload(e.target.files?.[0])}
                    disabled={uploading}
                  />
                  {imageUrl ? (
                    <button
                      type="button"
                      className="btn-text-danger"
                      onClick={() => {
                        setImageUrl('')
                        setMediaBytes(0)
                      }}
                    >
                      Retirer l'image
                    </button>
                  ) : null}
                </label>
              ) : null}

              <div className="revision-field">
                <span>
                  <Type size={16} /> Bloc texte
                </span>
                <RichTextEditor
                  value={text}
                  onChange={setText}
                  placeholder="Explications ou cours théorique — gras, titres, listes, liens…"
                />
              </div>
            </section>

            {error ? <p className="form-error">{error}</p> : null}

            <div className="revision-actions">
              <button
                type="button"
                className="btn-primary btn-primary-inline"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              {!isEmpty ? (
                <button type="button" className="btn-outline-sm" onClick={() => setEditing(false)}>
                  Annuler
                </button>
              ) : null}
            </div>
          </div>

          <aside className="revision-module-preview" aria-label="Aperçu téléphone">
            <div className="revision-preview-banner">
              <p className="revision-preview-kicker">Aperçu téléphone</p>
              <p className="revision-preview-note">Rendu élève en temps réel</p>
            </div>
            <div className="phone-shell">
              <span className="phone-btn phone-btn-silent" aria-hidden="true" />
              <span className="phone-btn phone-btn-volume-up" aria-hidden="true" />
              <span className="phone-btn phone-btn-volume-down" aria-hidden="true" />
              <span className="phone-btn phone-btn-power" aria-hidden="true" />
              <div className="phone-frame">
                <div className="phone-island" aria-hidden="true">
                  <span className="phone-island-camera" />
                </div>
                <div className="phone-screen">
                  <div className="phone-status" aria-hidden="true">
                    <span>9:41</span>
                    <span className="phone-status-icons">▮▮▮</span>
                  </div>
                  <div className="phone-content">
                    <MediaPreview
                      title={previewTitle}
                      hideTitle
                      layout="stack"
                      videoUrl={previewVideo}
                      imageUrl={previewImage}
                      text={text}
                    />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <div className="revision-module-saved">
          <MediaPreview
            title={courseTitle}
            hideTitle
            layout="stack"
            videoUrl={module.mediaType === 'image' ? '' : module.videoUrl}
            imageUrl={module.mediaType === 'video' ? '' : module.imageUrl}
            text={module.text}
          />
        </div>
      )}
    </div>
  )
}

interface CoursePanelProps {
  course: Course
  chapters: ChapterRef[]
  onUpdated: () => void
}

function CoursePanel({ course, chapters, onUpdated }: CoursePanelProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: course.id,
  })
  const sensors = useAdminSensors()
  const [expanded, setExpanded] = useState(false)
  const [modules, setModules] = useState(course.modules)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setModules(course.modules)
  }, [course.modules])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }

  const handleAddModule = async () => {
    const token = getAdminToken()
    if (!token) return

    setError(null)
    try {
      await createStandaloneModule(token, course.id)
      onUpdated()
      setExpanded(true)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Ajout impossible')
    }
  }

  const handlePublishToggle = async (published: boolean) => {
    const token = getAdminToken()
    if (!token) return

    setBusy(true)
    setError(null)
    try {
      await updateStandaloneCourse(token, course.id, { published })
      onUpdated()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Publication impossible')
    } finally {
      setBusy(false)
    }
  }

  const handleMoveToChapter = async (chapterId: string) => {
    if (!chapterId || chapterId === course.chapterId) return
    const token = getAdminToken()
    if (!token) return

    setBusy(true)
    setError(null)
    try {
      await updateStandaloneCourse(token, course.id, { chapterId })
      onUpdated()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Déplacement impossible')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteCourse = async () => {
    if (!window.confirm(`Supprimer la notion « ${course.title} » et tous ses contenus ?`)) return
    const token = getAdminToken()
    if (!token) return

    try {
      await deleteStandaloneCourse(token, course.id)
      onUpdated()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Suppression impossible')
    }
  }

  const handleModuleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = modules.findIndex((item) => item.id === active.id)
    const newIndex = modules.findIndex((item) => item.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const next = arrayMove(modules, oldIndex, newIndex)
    setModules(next)

    const token = getAdminToken()
    if (!token) return

    try {
      await reorderStandaloneModules(
        token,
        course.id,
        next.map((item) => item.id),
      )
      onUpdated()
    } catch (err) {
      setModules(course.modules)
      setError(isAuthError(err) ? err.message : 'Réordonnancement impossible')
    }
  }

  return (
    <div ref={setNodeRef} style={style} className={`revision-course${isDragging ? ' is-dragging' : ''}`}>
      <div className="revision-course-header">
        <DragHandle attributes={attributes} listeners={listeners} />
        <button
          type="button"
          className="revision-course-toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <BookOpen size={18} />
          <span>{course.title}</span>
            <span className="revision-count">
              {modules.length} contenu{modules.length !== 1 ? 's' : ''}
            </span>
        </button>
        <div className="revision-item-actions">
          <PublishSwitch checked={course.published} onChange={handlePublishToggle} disabled={busy} />
          <button
            type="button"
            className="btn-text-danger"
            onClick={handleDeleteCourse}
            aria-label={`Supprimer la notion ${course.title}`}
            title="Supprimer la notion"
          >
            <Trash2 size={16} />
            Supprimer
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="revision-course-body">
          {chapters.length > 1 ? (
            <label className="revision-move-chapter">
              <span>Chapitre</span>
              <select
                value={course.chapterId}
                disabled={busy}
                onChange={(e) => void handleMoveToChapter(e.target.value)}
              >
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {modules.length === 0 ? (
            <p className="revision-empty">Aucun contenu. Ajoutez une vidéo, une image ou du texte.</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleModuleDragEnd}
            >
              <SortableContext items={modules.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                <div className="revision-modules-list">
                  {modules.map((module) => (
                    <ModuleEditor
                      key={module.id}
                      courseId={course.id}
                      courseTitle={course.title}
                      module={module}
                      onUpdated={onUpdated}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <div className="revision-actions revision-actions-footer">
            <button type="button" className="btn-outline-sm" onClick={handleAddModule}>
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


function ChapterRailItem({
  chapter,
  count,
  active,
  onSelect,
}: {
  chapter: ChapterRef
  count: number
  active: boolean
  onSelect: () => void
}) {
  return (
    <div className={`revision-rail-item${active ? ' active' : ''}`}>
      <button type="button" className="revision-rail-button" onClick={onSelect}>
        <span className="revision-rail-name">{chapter.name}</span>
        <span className="revision-rail-meta">
          {count} notion{count !== 1 ? 's' : ''}
        </span>
      </button>
    </div>
  )
}

export function CoursesPage() {
  const sensors = useAdminSensors()
  const [courses, setCourses] = useState<Course[]>([])
  const [chapters, setChapters] = useState<ChapterRef[]>([])
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [courseTitle, setCourseTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [addingCourse, setAddingCourse] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadCourses = useCallback(async (silent = false) => {
    const token = getAdminToken()
    if (!token) return
    if (!silent) setLoading(true)
    setError(null)
    try {
      const { courses: data, chapters: chapterList } = await fetchStandaloneCourses(token)
      setCourses(data)
      setChapters(chapterList)
      setSelectedChapterId((current) => {
        if (current && chapterList.some((chapter) => chapter.id === current)) return current
        // Par défaut : premier chapitre qui contient déjà des notions, sinon le premier.
        const firstFilled = chapterList.find((chapter) =>
          data.some((course) => course.chapterId === chapter.id),
        )
        return firstFilled?.id ?? chapterList[0]?.id ?? null
      })
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCourses()
  }, [loadCourses])

  useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => setSuccess(null), 4000)
    return () => window.clearTimeout(timer)
  }, [success])

  const refresh = useCallback(() => loadCourses(true), [loadCourses])

  const countByChapter = useMemo(() => {
    const counts = new Map<string, number>()
    for (const course of courses) {
      counts.set(course.chapterId, (counts.get(course.chapterId) ?? 0) + 1)
    }
    return counts
  }, [courses])

  const selectedChapter = chapters.find((chapter) => chapter.id === selectedChapterId) ?? null

  const chapterCourses = useMemo(
    () => courses.filter((course) => course.chapterId === selectedChapterId),
    [courses, selectedChapterId],
  )

  const handleAddCourse = async (e: FormEvent) => {
    e.preventDefault()
    const title = courseTitle.trim()
    if (!title || !selectedChapterId) return
    const token = getAdminToken()
    if (!token) return
    setAddingCourse(true)
    setError(null)
    setSuccess(null)
    try {
      const { course } = await createStandaloneCourse(token, title, selectedChapterId)
      setCourseTitle('')
      setSuccess(`Création finie — la notion « ${course.title} » a été ajoutée.`)
      await loadCourses(true)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Ajout impossible')
    } finally {
      setAddingCourse(false)
    }
  }

  const handleCourseDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !selectedChapterId) return
    const oldIndex = chapterCourses.findIndex((item) => item.id === active.id)
    const newIndex = chapterCourses.findIndex((item) => item.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(chapterCourses, oldIndex, newIndex)
    // Optimiste : on réordonne uniquement le chapitre courant.
    setCourses((current) => [
      ...current.filter((course) => course.chapterId !== selectedChapterId),
      ...next,
    ])
    const token = getAdminToken()
    if (!token) return
    try {
      await reorderStandaloneCourses(
        token,
        next.map((item) => item.id),
        selectedChapterId,
      )
      await refresh()
    } catch (err) {
      await loadCourses(true)
      setError(isAuthError(err) ? err.message : 'Réordonnancement impossible')
    }
  }

  return (
    <div className="revision-shell">
      <header className="revision-page-header">
        <AdminSectionHeader
          backTo="/code"
          backLabel="Code de la route"
          kicker="Formation"
          title="Cours"
          subtitle="Les cours sont classés par chapitre : choisissez un chapitre, puis créez ses notions. Vidéos via lien YouTube / Vimeo."
        />
      </header>

      {loading ? (
        <div style={{ padding: 8 }}>
          <SkeletonBlock rows={5} />
        </div>
      ) : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {success ? (
        <p className="form-success" role="status">
          {success}
        </p>
      ) : null}

      {!loading && chapters.length === 0 ? (
        <EmptyState
          title="Chapitres en cours de synchronisation"
          description="Les 20 chapitres standards seront créés automatiquement au prochain chargement."
        />
      ) : null}

      {!loading && chapters.length > 0 ? (
        <CmsWorkspace
          tree={
            <>
              <div className="revision-rail-header">
                <h3>Chapitres</h3>
                <span>{chapters.length}</span>
              </div>
              <div className="revision-rail-list">
                {chapters.map((chapter) => (
                  <ChapterRailItem
                    key={chapter.id}
                    chapter={chapter}
                    count={countByChapter.get(chapter.id) ?? 0}
                    active={chapter.id === selectedChapterId}
                    onSelect={() => setSelectedChapterId(chapter.id)}
                  />
                ))}
              </div>
            </>
          }
          editor={
            selectedChapter ? (
              <div className="revision-chapter selected revision-chapter-workspace">
                <div className="revision-chapter-header">
                  <div className="revision-chapter-heading">
                    <p className="revision-chapter-kicker">Chapitre sélectionné</p>
                    <div className="revision-chapter-title">{selectedChapter.name}</div>
                  </div>
                </div>

                <div className="revision-chapter-body">
                  <form
                    onSubmit={handleAddCourse}
                    className="revision-inline-form revision-add-course"
                  >
                    <input
                      type="text"
                      value={courseTitle}
                      onChange={(e) => setCourseTitle(e.target.value)}
                      placeholder={`Titre de la notion à ajouter dans ${selectedChapter.name}`}
                      required
                      minLength={2}
                    />
                    <button
                      type="submit"
                      className="btn-primary btn-primary-inline"
                      disabled={addingCourse}
                    >
                      <Plus size={16} />
                      {addingCourse ? 'Ajout…' : 'Ajouter une notion'}
                    </button>
                  </form>

                  {chapterCourses.length === 0 ? (
                    <EmptyState
                      title="Aucune notion dans ce chapitre"
                      description="Ajoutez une première notion, puis ses contenus (texte, image, vidéo)."
                    />
                  ) : (
                    <div className="revision-courses-stack">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleCourseDragEnd}
                      >
                        <SortableContext
                          items={chapterCourses.map((item) => item.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {chapterCourses.map((course) => (
                            <CoursePanel
                              key={course.id}
                              course={course}
                              chapters={chapters}
                              onUpdated={refresh}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState
                title="Aucun chapitre sélectionné"
                description="Sélectionnez un chapitre pour gérer ses notions."
              />
            )
          }
        />
      ) : null}
    </div>
  )
}
