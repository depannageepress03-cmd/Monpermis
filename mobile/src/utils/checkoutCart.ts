import AsyncStorage from '@react-native-async-storage/async-storage'
import type { CheckoutCartItem } from '../api/accessRequests'

const CART_KEY = '@mp/checkout-cart'

export type PendingCheckoutCart = {
  items: CheckoutCartItem[]
  savedAt: number
  source: 'abonnement' | 'conduite'
}

export async function savePendingCheckoutCart(cart: PendingCheckoutCart) {
  await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart))
}

export async function loadPendingCheckoutCart(): Promise<PendingCheckoutCart | null> {
  try {
    const raw = await AsyncStorage.getItem(CART_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingCheckoutCart
    if (!parsed?.items?.length) return null
    // Expire après 2 h
    if (Date.now() - parsed.savedAt > 2 * 60 * 60 * 1000) {
      await clearPendingCheckoutCart()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export async function clearPendingCheckoutCart() {
  await AsyncStorage.removeItem(CART_KEY)
}
