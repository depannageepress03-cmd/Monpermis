const ONBOARDING_KEY = 'mp-onboarding-done-v2'

export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1'
  } catch {
    return false
  }
}

export function markOnboardingDone() {
  try {
    localStorage.setItem(ONBOARDING_KEY, '1')
  } catch {
    /* ignore quota */
  }
}
