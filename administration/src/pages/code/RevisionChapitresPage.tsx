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
import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChapterTestSubjectPanel } from './ChapterTestSubjectPanel'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  Film,
  GripVertical,
  HelpCircle,
  Image,
  Pencil,
  Plus,
  Trash2,
  Type,
} from 'lucide-react'
import {
  createChapter,
  createCourse,
  createModule,
  deleteChapter,
  deleteCourse,
  deleteModule,
  duplicateChapter,
  duplicateModule,
  fetchChapters,
  reorderChapters,
  reorderCourses,
  reorderModules,
  updateChapter,
  updateCourse,
  updateModule,
  uploadRevisionImage,
} from '../../api/revision'
import { AdminSectionHeader } from '../../components/AdminSectionHeader'
import { MediaPreview } from '../../components/MediaPreview'
import { PublishSwitch } from '../../components/PublishSwitch'
import { RichTextEditor } from '../../components/RichTextEditor'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import type { Chapter, ContentModule, Course, MediaType } from '../../types/revision'
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
  chapterId: string
  courseId: string
  courseTitle: string
  module: ContentModule
  onUpdated: () => void
}

function ModuleEditor({
  chapterId,
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
      await updateModule(token, chapterId, courseId, module.id, {
        name: courseTitle,
        title: courseTitle,
        text,
        mediaType,
        videoUrl: mediaType === 'video' ? videoUrl : '',
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
      await duplicateModule(token, chapterId, courseId, module.id)
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
      await deleteModule(token, chapterId, courseId, module.id)
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
                    <Film size={16} /> Lien vidéo
                  </span>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://…"
                  />
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

              <label className="revision-field">
                <span>
                  <Type size={16} /> Bloc texte
                </span>
                <RichTextEditor
                  value={text}
                  onChange={setText}
                  placeholder="Explications ou cours théorique — gras, souligné, listes, paragraphes…"
                />
              </label>
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
  chapterId: string
  course: Course
  onUpdated: () => void
}

function CoursePanel({ chapterId, course, onUpdated }: CoursePanelProps) {
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
      await createModule(token, chapterId, course.id)
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
      await updateCourse(token, chapterId, course.id, { published })
      onUpdated()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Publication impossible')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteCourse = async () => {
    if (!window.confirm(`Supprimer le cours « ${course.title} » et tous ses modules ?`)) return
    const token = getAdminToken()
    if (!token) return

    try {
      await deleteCourse(token, chapterId, course.id)
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
      await reorderModules(
        token,
        chapterId,
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
            aria-label={`Supprimer le cours ${course.title}`}
            title="Supprimer le cours"
          >
            <Trash2 size={16} />
            Supprimer
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="revision-course-body">
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
                      chapterId={chapterId}
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

type ChapterWorkspaceTab = 'cours' | 'sujet-test'

interface ChapterPanelProps {
  chapter: Chapter
  onUpdated: () => void
  onDuplicated: (chapterId: string) => void
  activeTab: ChapterWorkspaceTab
  onTabChange: (tab: ChapterWorkspaceTab) => void
}

function ChapterPanel({
  chapter,
  onUpdated,
  onDuplicated,
  activeTab,
  onTabChange,
}: ChapterPanelProps) {
  const navigate = useNavigate()
  const sensors = useAdminSensors()
  const [courses, setCourses] = useState(chapter.courses)
  const [courseTitle, setCourseTitle] = useState('')
  const [addingCourse, setAddingCourse] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setCourses(chapter.courses)
  }, [chapter.courses])

  useEffect(() => {
    if (!success) return
    const timer = window.setTimeout(() => setSuccess(null), 4000)
    return () => window.clearTimeout(timer)
  }, [success])

  const handleAddCourse = async (e: FormEvent) => {
    e.preventDefault()
    const title = courseTitle.trim()
    if (!title) return

    const token = getAdminToken()
    if (!token) return

    setAddingCourse(true)
    setError(null)
    setSuccess(null)
    try {
      const { course } = await createCourse(token, chapter.id, title)
      setCourseTitle('')
      setSuccess(`Création finie — le cours « ${course.title} » a été ajouté.`)
      onUpdated()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Ajout impossible')
    } finally {
      setAddingCourse(false)
    }
  }

  const handlePublishToggle = async (published: boolean) => {
    const token = getAdminToken()
    if (!token) return

    setBusy(true)
    setError(null)
    try {
      await updateChapter(token, chapter.id, { published })
      onUpdated()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Publication impossible')
    } finally {
      setBusy(false)
    }
  }

  const handleDuplicate = async () => {
    const token = getAdminToken()
    if (!token) return

    setBusy(true)
    setError(null)
    try {
      const { chapter: copy } = await duplicateChapter(token, chapter.id)
      onDuplicated(copy.id)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Duplication impossible')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteChapter = async () => {
    if (!window.confirm(`Supprimer le chapitre « ${chapter.name} » et tout son contenu ?`)) return
    const token = getAdminToken()
    if (!token) return

    try {
      await deleteChapter(token, chapter.id)
      onUpdated()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Suppression impossible')
    }
  }

  const handleCourseDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = courses.findIndex((item) => item.id === active.id)
    const newIndex = courses.findIndex((item) => item.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const next = arrayMove(courses, oldIndex, newIndex)
    setCourses(next)

    const token = getAdminToken()
    if (!token) return

    try {
      await reorderCourses(
        token,
        chapter.id,
        next.map((item) => item.id),
      )
      onUpdated()
    } catch (err) {
      setCourses(chapter.courses)
      setError(isAuthError(err) ? err.message : 'Réordonnancement impossible')
    }
  }

  return (
    <div className="revision-chapter selected revision-chapter-workspace">
      <div className="revision-chapter-header">
        <div className="revision-chapter-heading">
          <p className="revision-chapter-kicker">Chapitre sélectionné</p>
          <div className="revision-chapter-title">
            {chapter.name}
            <span className="revision-count">{courses.length} cours</span>
            {!chapter.published ? <span className="revision-tag">Brouillon</span> : null}
          </div>
        </div>
        <div className="revision-item-actions">
          <PublishSwitch checked={chapter.published} onChange={handlePublishToggle} disabled={busy} />
          <button
            type="button"
            className="btn-icon-muted"
            onClick={handleDuplicate}
            disabled={busy}
            aria-label="Dupliquer le chapitre"
            title="Dupliquer"
          >
            <Copy size={16} />
          </button>
          <button
            type="button"
            className="btn-icon-danger"
            onClick={handleDeleteChapter}
            aria-label="Supprimer le chapitre"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="revision-chapter-body">
        <div className="revision-chapter-tabs" role="tablist" aria-label="Contenu du chapitre">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cours'}
            className={`revision-chapter-tab${activeTab === 'cours' ? ' active' : ''}`}
            onClick={() => onTabChange('cours')}
          >
            <BookOpen size={15} />
            Cours
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className="revision-chapter-tab"
            onClick={() => navigate(`/code/revision-chapitres/${chapter.id}/questions`)}
          >
            <HelpCircle size={15} />
            Questions
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sujet-test'}
            className={`revision-chapter-tab${activeTab === 'sujet-test' ? ' active' : ''}`}
            onClick={() => onTabChange('sujet-test')}
          >
            <ClipboardList size={15} />
            Sujet Test
          </button>
        </div>

        {activeTab === 'cours' ? (
          <>
            {success ? (
              <p className="form-success" role="status">
                {success}
              </p>
            ) : null}

            <div className="revision-courses-stack">
              {courses.length === 0 ? (
                <p className="revision-empty">Aucun cours dans ce chapitre.</p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleCourseDragEnd}
                >
                  <SortableContext
                    items={courses.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {courses.map((course) => (
                      <CoursePanel
                        key={course.id}
                        chapterId={chapter.id}
                        course={course}
                        onUpdated={onUpdated}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>

            <form onSubmit={handleAddCourse} className="revision-inline-form revision-add-course">
              <input
                type="text"
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="Titre du nouveau cours"
                required
                minLength={2}
              />
              <button
                type="submit"
                className="btn-primary btn-primary-inline"
                disabled={addingCourse}
              >
                <Plus size={16} />
                {addingCourse ? 'Ajout…' : 'Ajouter un cours'}
              </button>
            </form>

            {error ? <p className="form-error">{error}</p> : null}
          </>
        ) : (
          <ChapterTestSubjectPanel chapterId={chapter.id} />
        )}
      </div>
    </div>
  )
}

function ChapterRailItem({
  chapter,
  active,
  onSelect,
}: {
  chapter: Chapter
  active: boolean
  onSelect: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chapter.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`revision-rail-item${active ? ' active' : ''}${isDragging ? ' is-dragging' : ''}`}
    >
      <DragHandle attributes={attributes} listeners={listeners} />
      <button type="button" className="revision-rail-button" onClick={onSelect}>
        <span className="revision-rail-name">{chapter.name}</span>
        <span className="revision-rail-meta">
          {chapter.courses.length} cours
          {!chapter.published ? ' · Brouillon' : ''}
        </span>
      </button>
    </div>
  )
}

export function RevisionChapitresPage() {
  const sensors = useAdminSensors()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ChapterWorkspaceTab>('cours')
  const [chapterName, setChapterName] = useState('')
  const [loading, setLoading] = useState(true)
  const [addingChapter, setAddingChapter] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadChapters = useCallback(async (preferSelectedId?: string | null, silent = false) => {
    const token = getAdminToken()
    if (!token) return

    if (!silent) setLoading(true)
    setError(null)
    try {
      const { chapters: data } = await fetchChapters(token)
      setChapters(data)
      setSelectedChapterId((current) => {
        const preferred = preferSelectedId ?? current
        if (preferred && data.some((chapter) => chapter.id === preferred)) return preferred
        return data[0]?.id ?? null
      })
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadChapters()
  }, [loadChapters])

  useEffect(() => {
    const chapterFromUrl = searchParams.get('chapter')
    const tabFromUrl = searchParams.get('tab')
    if (tabFromUrl === 'questions' && chapterFromUrl) {
      navigate(`/code/revision-chapitres/${chapterFromUrl}/questions`, { replace: true })
      return
    }
    if (chapterFromUrl) {
      setSelectedChapterId(chapterFromUrl)
    }
    if (tabFromUrl === 'cours' || tabFromUrl === 'sujet-test') {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams, navigate])

  const refresh = useCallback(
    (preferSelectedId?: string | null) => loadChapters(preferSelectedId, true),
    [loadChapters],
  )

  const selectedChapter = chapters.find((chapter) => chapter.id === selectedChapterId) ?? null

  const handleSelectChapter = (chapterId: string) => {
    setSelectedChapterId(chapterId)
    setActiveTab('cours')
    setSearchParams({}, { replace: true })
  }

  const handleTabChange = (tab: ChapterWorkspaceTab) => {
    setActiveTab(tab)
    if (selectedChapterId) {
      setSearchParams(
        tab === 'cours' ? {} : { chapter: selectedChapterId, tab },
        { replace: true },
      )
    }
  }

  const handleAddChapter = async (e: FormEvent) => {
    e.preventDefault()
    const name = chapterName.trim()
    if (!name) return

    const token = getAdminToken()
    if (!token) return

    setAddingChapter(true)
    setError(null)
    try {
      const { chapter } = await createChapter(token, name)
      setChapterName('')
      await loadChapters(chapter.id, true)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Création impossible')
    } finally {
      setAddingChapter(false)
    }
  }

  const handleChapterDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = chapters.findIndex((item) => item.id === active.id)
    const newIndex = chapters.findIndex((item) => item.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const next = arrayMove(chapters, oldIndex, newIndex)
    setChapters(next)

    const token = getAdminToken()
    if (!token) return

    try {
      const { chapters: updated } = await reorderChapters(
        token,
        next.map((item) => item.id),
      )
      setChapters(updated)
    } catch (err) {
      await loadChapters(undefined, true)
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
          title="Révision par chapitres"
          subtitle="Chapitre à gauche, cours et aperçu élève à droite."
        />
      </header>

      <form onSubmit={handleAddChapter} className="revision-inline-form revision-add-chapter">
        <input
          type="text"
          value={chapterName}
          onChange={(e) => setChapterName(e.target.value)}
          placeholder="Nom du nouveau chapitre"
          required
          minLength={2}
        />
        <button type="submit" className="btn-primary btn-primary-inline" disabled={addingChapter}>
          <Plus size={16} />
          {addingChapter ? 'Création…' : 'Ajouter un chapitre'}
        </button>
      </form>

      {loading ? <p className="revision-empty">Chargement…</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}

      {!loading && chapters.length === 0 ? (
        <div className="admin-panel revision-empty-panel">
          <p className="revision-empty">Commencez par ajouter votre premier chapitre.</p>
        </div>
      ) : null}

      {!loading && chapters.length > 0 ? (
        <div className="revision-layout">
          <aside className="revision-rail admin-panel">
            <div className="revision-rail-header">
              <h3>Chapitres</h3>
              <span>{chapters.length}</span>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleChapterDragEnd}
            >
              <SortableContext
                items={chapters.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="revision-rail-list">
                  {chapters.map((chapter) => (
                    <ChapterRailItem
                      key={chapter.id}
                      chapter={chapter}
                      active={chapter.id === selectedChapterId}
                      onSelect={() => handleSelectChapter(chapter.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </aside>

          <section className="revision-workspace">
            {selectedChapter ? (
              <ChapterPanel
                key={selectedChapter.id}
                chapter={selectedChapter}
                onUpdated={() => refresh(selectedChapterId)}
                onDuplicated={(chapterId) => refresh(chapterId)}
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
            ) : (
              <div className="admin-panel">
                <p className="revision-empty">Sélectionnez un chapitre pour éditer son contenu.</p>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  )
}
