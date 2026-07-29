import * as Haptics from 'expo-haptics'

export async function hapticSelect() {
  try {
    await Haptics.selectionAsync()
  } catch {
    // no-op si non supporté
  }
}

export async function hapticSuccess() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  } catch {
    // no-op
  }
}

export async function hapticError() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  } catch {
    // no-op
  }
}

export async function hapticLight() {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  } catch {
    // no-op
  }
}
