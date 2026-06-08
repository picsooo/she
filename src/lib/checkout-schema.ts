import { z } from 'zod'
import { t } from './translations'

// Schéma de validation Zod pour le formulaire de checkout
// Toute validation se fait côté SERVEUR (Server Action)

export const checkoutSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(3, t.validation.nameMin)
    .max(100),

  // Nettoie espaces/tirets avant validation — accepte 05/06/07/08/09
  phone: z.preprocess(
    (val) => (typeof val === 'string' ? val.replace(/[\s\-\.]/g, '') : val),
    z.string().regex(/^0[5-9]\d{8}$/, t.validation.phoneInvalid)
  ),

  // wilayaCode : "01" à "58" — accepter strings et nombres
  wilayaCode: z.coerce.string().min(1).max(3),

  wilayaName: z.string().min(1, t.validation.required),

  commune: z.string().min(1, t.validation.required),

  address: z
    .string()
    .trim()
    .min(3, t.validation.addressMin)
    .max(500),

  note: z.string().max(500).optional(),

  // Mode de livraison — home = domicile, desk = bureau Yalidine
  deliveryMode: z.enum(['home', 'desk']).default('home'),
})

export type CheckoutFormData = z.infer<typeof checkoutSchema>

// Schéma d'un article — productId peut être string ou number (SQLite retourne des nombres)
export const orderItemSchema = z.object({
  productId: z.union([z.string(), z.number()]).transform(String),
  variationIndex: z.coerce.number().int().min(0),
  quantity: z.coerce.number().int().min(1).max(99),
})

export const createOrderSchema = z.object({
  customer: checkoutSchema,
  items: z.array(orderItemSchema).min(1),
})

export type CreateOrderData = z.infer<typeof createOrderSchema>
