/** Messages FedaPay / Mobile Money plus actionnables pour l’utilisateur. */
export function friendlyPaymentError(raw: string | null | undefined, fallback: string): string {
  const msg = String(raw || '').trim()
  if (!msg) return fallback
  const lower = msg.toLowerCase()
  if (lower.includes('insufficient') || lower.includes('solde') || lower.includes('insuffisant')) {
    return 'Solde Mobile Money insuffisant. Rechargez votre compte puis réessayez.'
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('expir')) {
    return 'La demande a expiré. Rouvrez le paiement et validez rapidement sur votre téléphone.'
  }
  if (lower.includes('cancel') || lower.includes('annul')) {
    return 'Paiement annulé. Relancez le paiement et validez la demande de retrait sur votre téléphone.'
  }
  if (lower.includes('operator') || lower.includes('opérateur') || lower.includes('mismatch')) {
    return 'Réseau Mobile Money incorrect. Vérifiez que le numéro correspond à MTN, Moov ou Celtiis choisi.'
  }
  if (lower.includes('invalid') && (lower.includes('phone') || lower.includes('numéro'))) {
    return 'Numéro Mobile Money invalide. Utilisez le format local (ex. 01 XX XX XX XX).'
  }
  if (lower.includes('declined') || lower.includes('refus') || lower.includes('failed')) {
    return `${msg} Vérifiez le solde, validez la notification MTN/Moov/Celtiis, puis réessayez.`
  }
  return msg
}
