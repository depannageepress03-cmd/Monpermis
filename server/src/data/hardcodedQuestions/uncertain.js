/**
 * Questions explicitement signalées comme NON SÛRES (réponse à confirmer, énoncé douteux…).
 * Elles ne sont proposées à aucun apprenant tant qu'elles figurent ici. Retirer la ligne une fois la
 * question vérifiée la remet en service. Clé = identifiant de question (hc-chN-qNN).
 */
export const UNCERTAIN_QUESTIONS = {
  // vide — hc-ch15-q07 validée : parmi les options (0,6 / 0,4 / 1), 0,6 g/L est le premier
  // seuil au-dessus de la limite légale Bénin (0,5 g/L). Le seuil « 0,8 g/L » n’est pas proposé.
}

/**
 * QCM où toutes les options sont volontairement justes (vérifié manuellement).
 * Sans cette liste, le filtre « toutes bonnes » les exclurait des sujets / examens.
 */
export const CONFIRMED_ALL_CORRECT_QUESTIONS = {
  'hc-ch2-q68':
    'Croisement / dépassement 2-roues : non-respect signaux, priorités et écarts imprévisibles',
  'hc-ch3-q16': 'Changement de direction : les 5 gestes listés sont tous exigés',
  'hc-ch3-q17': 'Adaptation de la vitesse : trafic, risques, adhérence, visibilité, vigilance',
  'hc-ch3-q27': 'Adhérence ou visibilité réduite : il faut ralentir dans les deux cas',
  'hc-ch3-q33': 'Stationnement réglementé pour sécurité et fluidité',
  'hc-ch3-q34': 'Stationnement dangereux, abusif ou gênant = infraction',
  'hc-ch4-q13': 'Virage serré : force centrifuge, adhérence et visibilité',
  'hc-ch6-q11': 'Le long des stationnements : piétons, véhicules, portières, départs',
  'hc-ch8-q38': 'Plaque de tare : PV, PTAC, PTRA et surface (mention réglementaire)',
  'hc-ch9-q09': 'Panne transport en commun : alerter, carburant, électrique, triangle',
  'hc-ch10-q43': 'Assureur : responsabilité, ceinture, alcool, lunettes du permis',
  'hc-ch12-q47': 'Distance d’arrêt : chaussée, pneus, vitesse, freins',
  'hc-ch12-q56': 'Pneus sous-gonflés : adhérence, stabilité, renversement, conso',
  'hc-ch12-q64': 'Règles de circulation : autos, motos et piétons',
  'hc-ch12-q67': 'Adapter sa vitesse : trafic, signes, adhérence, vigilance',
  'hc-ch12-q69': 'Phases de fatigue : bâillement, picotements, somnolence, maux de tête',
  'hc-ch13-q44': 'Voie d’insertion : accélérer, rétros/cligno, s’insérer en contrôle',
  'hc-ch13-q51': 'Avertisseur sonore interdit (hôpitaux/écoles, racolage, agglo sauf danger)',
  'hc-ch13-q87': 'Entrée d’agglomération : 50 km/h, perte priorité route, klaxon limité',
  'hc-ch13-q91': 'Emprise cyclistes : piste hors agglo et bande en agglo',
  'hc-ch14-q27': 'Le long des stationnements : piétons, véhicules, portières, départs',
  'hc-ch15-q04': 'Délit de fuite : accident matériel ou corporel (options en double dans l’énoncé)',
  'hc-ch15-q18': 'Demi-tour dangereux : sens unique, virage, circulation dense/rapide',
  'hc-ch16-q05':
    'Autoroute : bornes d’appel, téléphone et autre usager sont tous des moyens valides d’alerter',
  'hc-ch16-q06':
    'De nuit : feux du véhicule, lampe et triangle sont tous des moyens valides de signaler',
  'hc-ch17-q14': 'Conso carburant : vitesse, charge, clim, caravane',
  'hc-ch17-q17': 'Changement de roue : cric, écrous, sol plat, frein stationnement',
  'hc-ch17-q24': 'Début d’incendie : extincteurs, couverture, sable, boules',
  'hc-ch18-q14': 'Conso carburant : vitesse, charge, clim, caravane',
  'hc-ch18-q17': 'Changement de roue : cric, écrous, sol plat, frein stationnement',
  'hc-ch18-q24': 'Début d’incendie : extincteurs, couverture, sable, boules',
  'hc-ch19-q09':
    'Croisement : ralentir, serrer à droite et feux de croisement la nuit sont tous corrects',
}
