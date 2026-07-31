import AsyncStorage from '@react-native-async-storage/async-storage'

const ONBOARDING_KEY = '@mp/onboarding-done-v2'

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === '1'
  } catch {
    return false
  }
}

export async function markOnboardingDone() {
  await AsyncStorage.setItem(ONBOARDING_KEY, '1')
}
