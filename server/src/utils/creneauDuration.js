/** Durée d'un créneau en heures, arrondie au 0,5h le plus proche (minimum 0,5h). */
export function computeCreneauHeures(creneau) {
  if (!creneau) return 1
  const [startH, startM] = String(creneau.startTime || '0:0').split(':').map((v) => parseInt(v, 10) || 0)
  const [endH, endM] = String(creneau.endTime || '0:0').split(':').map((v) => parseInt(v, 10) || 0)
  const dureeHeures = endH - startH + (endM - startM) / 60
  return Math.max(0.5, Math.round(dureeHeures * 2) / 2)
}
