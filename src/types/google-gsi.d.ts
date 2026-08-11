/**
 * Typage minimal de Google Identity Services (https://accounts.google.com/gsi/client).
 */
export interface GsiCredentialResponse {
  credential: string
  select_by?: string
}

export interface GsiPromptMomentNotification {
  isDisplayMoment: () => boolean
  isSkippedMoment: () => boolean
  isDismissedMoment: () => boolean
  getNotDisplayedReason: () => string
  getSkippedReason: () => string
  getDismissedReason: () => string
  getMomentType: () => string
}

export interface GsiInitConfig {
  client_id: string
  callback: (response: GsiCredentialResponse) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
  ux_mode?: 'popup' | 'redirect'
  login_uri?: string
}

export interface GsiRenderOptions {
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  logo_alignment?: 'left' | 'center'
  width?: number
  locale?: string
}

export interface GsiAccounts {
  id: {
    initialize: (config: GsiInitConfig) => void
    renderButton: (parent: HTMLElement, options: GsiRenderOptions) => void
    prompt: (callback?: (notification: GsiPromptMomentNotification) => void) => void
    disableAutoSelect: () => void
  }
}

declare global {
  interface Window {
    google?: { accounts?: GsiAccounts }
  }
}
