/** Messages FedaPay / Mobile Money plus actionnables pour l’utilisateur. */
export function friendlyPaymentError(raw: string | null | undefined, fallback: string): string {
  const msg = String(raw || '').trim()
  if (!msg) return fallback
  const lower = msg.toLowerCase()
  if (lower.includes('insufficient') || lower.includes('solde') || lower.includes('insuffisant')) {
    return 'Solde Mobile Money insuffisant. Recharge ton compte puis réessaie.'
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('expir')) {
    return 'La demande a expiré. Relance le paiement et valide rapidement sur ton téléphone.'
  }
  if (lower.includes('cancel') || lower.includes('annul')) {
    return 'Paiement annulé. Relance le paiement et valide la demande de retrait sur ton téléphone.'
  }
  if (lower.includes('operator') || lower.includes('opérateur') || lower.includes('mismatch')) {
    return 'Réseau Mobile Money incorrect. Vérifie que le numéro correspond à MTN, Moov ou Celtiis choisi.'
  }
  if (lower.includes('invalid') && (lower.includes('phone') || lower.includes('numéro'))) {
    return 'Numéro Mobile Money invalide. Utilise le format local (ex. 01 XX XX XX XX).'
  }
  if (lower.includes('declined') || lower.includes('refus') || lower.includes('failed')) {
    return `${msg} Vérifie le solde, valide la notification MTN/Moov/Celtiis, puis réessaie.`
  }
  return msg
}
