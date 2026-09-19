import { LayoutAnimation, Platform, UIManager } from 'react-native'

let enabled = false

/**
 * Transition douce (insertion/suppression) avant un setState de liste.
 * Sans changement de layout, ne produit aucune animation.
 * Inoffensif hors écran : n'interrompt jamais l'UI.
 */
export function animateLayout() {
  if (!enabled) {
    enabled = true
    if (
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true)
    }
  }
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
}
