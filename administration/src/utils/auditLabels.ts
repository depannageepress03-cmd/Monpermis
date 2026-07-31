const ACTION_LABELS: Record<string, string> = {
  login: 'Connexion',
  register: 'Inscription',
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  grant: 'Attribution',
  validate: 'Validation',
  publish: 'Publication',
  notify: 'Notification',
  cancel: 'Annulation',
  generate: 'Génération',
  ensure: 'Synchronisation',
  reorder: 'Réorganisation',
  duplicate: 'Duplication',
  resolve_refund: 'Remboursement traité',
  'payment.approved': 'Paiement validé',
  'payment.pending': 'Paiement en attente',
  'payment.failed': 'Paiement échoué',
  'payment.updated': 'Paiement mis à jour',
  'access.actif': 'Abonnement actif',
  'access.pending': 'Abonnement en attente',
  'access.expired': 'Abonnement expiré',
  'access.updated': 'Abonnement mis à jour',
}

const RESOURCE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  user: 'Utilisateur',
  access: 'Abonnement',
  access_request: 'Demande d’accès',
  payment: 'Paiement',
  pricing: 'Tarif',
  promo_code: 'Code promo',
  announcement: 'Annonce',
  reservation: 'Réservation',
  moniteur: 'Moniteur',
  creneau: 'Créneau',
  solde_heures: 'Solde d’heures',
  chapter: 'Chapitre',
  course: 'Cours',
  module: 'Module',
  question: 'Question',
  test_subject: 'Sujet de test',
  practice_exam: 'Examen blanc',
  ecodepermis_exam: 'E-Codepermis',
}

export function actionLabel(action: string) {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action]
  if (action.startsWith('payment.')) return `Paiement (${action.slice(8)})`
  if (action.startsWith('access.')) return `Abonnement (${action.slice(7)})`
  return action
}

export function resourceLabel(resource: string) {
  return RESOURCE_LABELS[resource] || resource
}

export function formatAuditDate(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function summarizeMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata || typeof metadata !== 'object') return '—'
  const body = metadata.requestBody
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const keys = Object.keys(body as object).filter((k) => (body as Record<string, unknown>)[k] !== '[redacted]')
    if (keys.length) return keys.slice(0, 5).join(', ')
  }
  if (metadata.before || metadata.after) return 'avant / après'
  if (Array.isArray(metadata.keys)) return (metadata.keys as string[]).slice(0, 4).join(', ')
  return '—'
}
