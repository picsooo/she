// collections/Orders.ts
// Exemple Payload (v3). À FUSIONNER avec ta collection orders existante.
// Ajoute : les champs de tracking Meta + un hook afterChange qui déclenche
// l'event Purchase à la livraison (Option B), de façon idempotente.

import type { CollectionConfig } from "payload";
import { sendCapiEvent } from "@/lib/metaCapi";
import { randomUUID } from "crypto";

// Adapte cette valeur au libellé exact de ton statut "livré"
const DELIVERED_STATUS = "delivered";

export const Orders: CollectionConfig = {
  slug: "orders",
  fields: [
    // ... tes champs existants (items, total, customer, status, etc.)

    // --- Champs de tracking Meta ---
    {
      name: "metaEventId",
      type: "text",
      admin: { readOnly: true, description: "event_id partagé Pixel/CAPI (déduplication)" },
    },
    {
      name: "metaPurchaseSent",
      type: "checkbox",
      defaultValue: false,
      admin: { readOnly: true, description: "Empêche le double envoi de l'event Purchase" },
    },
    {
      name: "fbp",
      type: "text",
      admin: { readOnly: true, description: "Cookie _fbp capturé au checkout" },
    },
    {
      name: "fbc",
      type: "text",
      admin: { readOnly: true, description: "Cookie _fbc capturé au checkout" },
    },
  ],

  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        // Option B : ne déclencher Purchase qu'à la LIVRAISON.
        if (process.env.PURCHASE_EVENT_STRATEGY !== "delivery") return doc;

        const becameDelivered =
          doc.status === DELIVERED_STATUS && previousDoc?.status !== DELIVERED_STATUS;

        if (!becameDelivered || doc.metaPurchaseSent) return doc;

        // event_id stable : on réutilise celui stocké, sinon on en génère un
        const eventId = doc.metaEventId || randomUUID();

        try {
          const result = await sendCapiEvent({
            eventName: "Purchase",
            eventId,
            value: doc.total,
            currency: "DZD",
            contents: (doc.items || []).map((i: any) => ({
              id: i.product?.id || i.productId || i.id,
              quantity: i.quantity,
              item_price: i.price,
            })),
            user: {
              email: doc.customer?.email,
              phone: doc.customer?.phone,
              firstName: doc.customer?.firstName,
              lastName: doc.customer?.lastName,
              city: doc.customer?.wilaya || doc.customer?.city,
              fbp: doc.fbp,
              fbc: doc.fbc,
            },
          });

          if (result.ok) {
            // Marque l'envoi pour éviter tout doublon (update direct, sans relancer les hooks)
            await req.payload.update({
              collection: "orders",
              id: doc.id,
              data: { metaPurchaseSent: true, metaEventId: eventId },
              overrideAccess: true,
              context: { skipHooks: true },
            });
          }
        } catch (e) {
          req.payload.logger.error(`[Meta CAPI] échec Purchase commande ${doc.id}: ${e}`);
        }

        return doc;
      },
    ],
  },
};
