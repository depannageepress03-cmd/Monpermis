import type { ImageSourcePropType } from 'react-native'
import type { MobileMoneyOperator } from '../api/accessRequests'

export type PaymentOperatorOption = {
  id: MobileMoneyOperator
  label: string
  logo: ImageSourcePropType
  alt: string
}

/** Clés FedaPay inchangées : mtn → mtn_open, moov → moov, celtiis → sbin */
export const PAYMENT_OPERATORS: PaymentOperatorOption[] = [
  {
    id: 'mtn',
    label: 'MTN MoMo',
    logo: require('../../assets/payments/mtn.png'),
    alt: 'Logo MTN MoMo',
  },
  {
    id: 'moov',
    label: 'Moov Money',
    logo: require('../../assets/payments/moov.png'),
    alt: 'Logo Moov Africa',
  },
  {
    id: 'celtiis',
    label: 'Celtiis Cash',
    logo: require('../../assets/payments/celtiis.png'),
    alt: 'Logo Celtiis Cash',
  },
]

export function paymentOperatorLabel(id: MobileMoneyOperator | null | undefined) {
  if (!id) return ''
  return PAYMENT_OPERATORS.find((op) => op.id === id)?.label || id.toUpperCase()
}
