import { z } from 'zod'
import { t } from './translations'

// Schéma de validation Zod pour le formulaire de checkout
// Toute validation se fait côté SERVEUR (Server Action)

export const checkoutSchema = z.object({
  customerName: z
    .string()
    .min(3, t.validation.nameMin)
    .max(100),

  phone: z
    .string()
    .regex(/^0[567]\d{8}$/, t.validation.phoneInvalid)
    .transform((val) => val.replace(/\s/g, '')),

  wilayaCode: z
    .string()
    .min(2)
    .max(2)
    .regex(/^\d{2}$/),

  wilayaName: z.string().min(1, t.validation.required),

  commune: z.string().min(1, t.validation.required),

  address: z
    .string()
    .min(10, t.validation.addressMin)
    .max(500),

  note: z.string().max(500).optional(),
})

export type CheckoutFormData = z.infer<typeof checkoutSchema>

// Schéma d'un article de commande (validé côté serveur)
export const orderItemSchema = z.object({
  productId: z.string().min(1),
  variationIndex: z.number().int().min(0),
  quantity: z.number().int().min(1).max(99),
})

export const createOrderSchema = z.object({
  customer: checkoutSchema,
  items: z.array(orderItemSchema).min(1),
})

export type CreateOrderData = z.infer<typeof createOrderSchema>
