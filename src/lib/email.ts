/**
 * email.ts — Système d'envoi d'emails via Resend
 * Templates HTML premium aux couleurs She's Fit & Beauty
 */
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Adresse expéditeur — doit être vérifiée sur Resend
const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'She\'s Fit & Beauty <noreply@boutique-she.com>'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'wsaoudi@webminds.dz'
const STORE_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://boutique-she.com'

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrderItem {
  productName: string
  colorAr: string
  size: string
  quantity: number
  unitPrice: number
}

interface OrderEmailData {
  orderNumber: string
  customerName: string
  phone: string
  email?: string
  wilaya: string
  commune: string
  address: string
  note?: string
  deliveryMode: 'home' | 'desk'
  items: OrderItem[]
  subtotal: number
  shippingFee: number
  total: number
}

// ── Styles inline partagés ────────────────────────────────────────────────────
const STYLES = {
  wrapper: 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; background: #F7F5F2; margin: 0; padding: 0;',
  container: 'max-width: 620px; margin: 0 auto; background: #ffffff;',
  header: 'background: linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%); padding: 32px 40px; text-align: center;',
  logo_circle: 'width: 64px; height: 64px; border-radius: 50%; border: 2px solid #CEA060; display: inline-block; overflow: hidden; margin-bottom: 12px;',
  brand: 'color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.04em; margin: 0;',
  tagline: 'color: #CEA060; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; margin: 4px 0 0;',
  body: 'padding: 36px 40px;',
  section_title: 'font-size: 11px; font-weight: 700; color: #CEA060; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 12px; border-bottom: 1px solid #EBE6DF; padding-bottom: 8px;',
  order_badge: 'display: inline-block; background: #FFF0F7; border: 1.5px solid #F9A8D4; border-radius: 8px; padding: 12px 24px; text-align: center;',
  order_number: 'color: #E93D91; font-size: 28px; font-weight: 800; letter-spacing: 0.05em; margin: 0;',
  table: 'width: 100%; border-collapse: collapse; margin: 0;',
  th: 'padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 700; color: #9A9A9A; background: #FAFAFA; border-bottom: 1px solid #EBE6DF;',
  th_left: 'padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #9A9A9A; background: #FAFAFA; border-bottom: 1px solid #EBE6DF;',
  td: 'padding: 12px; font-size: 13px; color: #3D3D3D; border-bottom: 1px solid #F5F5F5; vertical-align: top;',
  total_row: 'padding: 14px 12px; font-size: 15px; font-weight: 800; color: #E93D91; border-top: 2px solid #E93D91;',
  info_grid: 'background: #FAFAFA; border-radius: 10px; padding: 20px; margin: 0;',
  info_row: 'display: flex; margin-bottom: 8px; font-size: 13px;',
  info_label: 'color: #9A9A9A; font-weight: 600; min-width: 130px; flex-shrink: 0;',
  info_value: 'color: #1A1A1A; font-weight: 500;',
  cta: 'display: inline-block; background: linear-gradient(135deg, #E93D91, #D32D80); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; letter-spacing: 0.02em;',
  footer: 'background: #1A1A1A; padding: 24px 40px; text-align: center;',
  footer_text: 'color: #6A6A6A; font-size: 11px; margin: 0; line-height: 1.6;',
  gold_divider: 'border: none; border-top: 1px solid #EBE6DF; margin: 28px 0;',
  gold_accent: 'width: 40px; height: 3px; background: linear-gradient(90deg, #CEA060, #E8C880); border-radius: 2px; margin: 0 auto 20px;',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatPrice(amount: number): string {
  return amount.toLocaleString('fr-DZ') + ' دج'
}

function deliveryModeLabel(mode: 'home' | 'desk'): string {
  return mode === 'desk' ? '🏢 توصيل إلى مكتب ياليدين' : '🏠 توصيل إلى المنزل'
}

// ── Template HTML — Email client ──────────────────────────────────────────────
function buildCustomerEmailHtml(order: OrderEmailData): string {
  const itemsRows = order.items.map(item => `
    <tr>
      <td style="${STYLES.td}">
        <div style="font-weight: 600; color: #1A1A1A;" dir="rtl">${item.productName}</div>
        <div style="font-size: 12px; color: #9A9A9A; margin-top: 3px;" dir="rtl">
          ${item.colorAr ? `اللون: ${item.colorAr}` : ''}${item.colorAr && item.size ? ' · ' : ''}${item.size ? `المقاس: ${item.size}` : ''}
        </div>
      </td>
      <td style="${STYLES.td} text-align: center;">${item.quantity}</td>
      <td style="${STYLES.td} text-align: right; font-weight: 600;">${formatPrice(item.unitPrice)}</td>
      <td style="${STYLES.td} text-align: right; color: #E93D91; font-weight: 700;">${formatPrice(item.unitPrice * item.quantity)}</td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تأكيد طلبك — She's Fit & Beauty</title>
</head>
<body style="${STYLES.wrapper}">
  <div style="${STYLES.container}">

    <!-- Header -->
    <div style="${STYLES.header}">
      <div style="margin-bottom: 8px;">
        <img src="${STORE_URL}/branding/logo.png" width="64" height="64" alt="She's Fit & Beauty" style="border-radius: 50%; border: 2px solid #CEA060; display: inline-block;" />
      </div>
      <h1 style="${STYLES.brand}">SHE'S FIT & BEAUTY</h1>
      <p style="${STYLES.tagline}">Mode Femme · الجزائر</p>
    </div>

    <!-- Body -->
    <div style="${STYLES.body}">

      <!-- Titre -->
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="${STYLES.gold_accent}"></div>
        <h2 style="font-size: 22px; font-weight: 800; color: #1A1A1A; margin: 0 0 8px;" dir="rtl">
          شكراً على طلبك، ${order.customerName}! 🎉
        </h2>
        <p style="font-size: 14px; color: #6D7175; margin: 0; line-height: 1.6;" dir="rtl">
          تم استلام طلبك بنجاح. سنتواصل معك خلال 24 ساعة القادمة لتأكيد الطلب.
        </p>
      </div>

      <!-- Numéro de commande -->
      <div style="text-align: center; margin-bottom: 28px;">
        <p style="font-size: 12px; color: #9A9A9A; margin: 0 0 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;">رقم طلبك</p>
        <div style="${STYLES.order_badge}">
          <p style="${STYLES.order_number}">${order.orderNumber}</p>
        </div>
        <p style="font-size: 11px; color: #B0B0B0; margin: 10px 0 0;" dir="rtl">احتفظ بهذا الرقم للمتابعة</p>
      </div>

      <hr style="${STYLES.gold_divider}" />

      <!-- Articles -->
      <p style="${STYLES.section_title}">تفاصيل الطلب</p>
      <table style="${STYLES.table}">
        <thead>
          <tr>
            <th style="${STYLES.th}" dir="rtl">المنتج</th>
            <th style="${STYLES.th}">الكمية</th>
            <th style="${STYLES.th}">السعر</th>
            <th style="${STYLES.th}">المجموع</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 10px 12px; text-align: right; font-size: 13px; color: #6D7175; border-top: 1px solid #EBE6DF;" dir="rtl">المجموع الجزئي</td>
            <td style="padding: 10px 12px; text-align: right; font-size: 13px; font-weight: 600; border-top: 1px solid #EBE6DF;">${formatPrice(order.subtotal)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 10px 12px; text-align: right; font-size: 13px; color: #6D7175;" dir="rtl">رسوم التوصيل</td>
            <td style="padding: 10px 12px; text-align: right; font-size: 13px; font-weight: 600;">${formatPrice(order.shippingFee)}</td>
          </tr>
          <tr>
            <td colspan="3" style="${STYLES.total_row} text-align: right;" dir="rtl">المجموع الكلي</td>
            <td style="${STYLES.total_row} text-align: right;">${formatPrice(order.total)}</td>
          </tr>
        </tfoot>
      </table>

      <hr style="${STYLES.gold_divider}" />

      <!-- Informations livraison -->
      <p style="${STYLES.section_title}">معلومات التوصيل</p>
      <div style="${STYLES.info_grid}">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #9A9A9A; font-weight: 600; width: 130px;" dir="rtl">طريقة التوصيل</td>
            <td style="padding: 6px 0; font-size: 13px; color: #1A1A1A; font-weight: 500;" dir="rtl">${deliveryModeLabel(order.deliveryMode)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #9A9A9A; font-weight: 600;" dir="rtl">الولاية</td>
            <td style="padding: 6px 0; font-size: 13px; color: #1A1A1A; font-weight: 500;" dir="rtl">${order.wilaya}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #9A9A9A; font-weight: 600;" dir="rtl">البلدية</td>
            <td style="padding: 6px 0; font-size: 13px; color: #1A1A1A; font-weight: 500;" dir="rtl">${order.commune}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #9A9A9A; font-weight: 600;" dir="rtl">العنوان</td>
            <td style="padding: 6px 0; font-size: 13px; color: #1A1A1A; font-weight: 500;" dir="rtl">${order.address}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #9A9A9A; font-weight: 600;" dir="rtl">الهاتف</td>
            <td style="padding: 6px 0; font-size: 13px; color: #1A1A1A; font-weight: 500; direction: ltr; text-align: right;">${order.phone}</td>
          </tr>
          ${order.note ? `
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #9A9A9A; font-weight: 600;" dir="rtl">ملاحظة</td>
            <td style="padding: 6px 0; font-size: 13px; color: #1A1A1A; font-weight: 500;" dir="rtl">${order.note}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <hr style="${STYLES.gold_divider}" />

      <!-- Message COD -->
      <div style="background: #FFF8E7; border: 1px solid #FDE68A; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px; text-align: center;" dir="rtl">
        <p style="font-size: 13px; color: #92400E; margin: 0; font-weight: 500; line-height: 1.7;">
          💳 <strong>الدفع عند الاستلام</strong> — ستدفع عند وصول طلبك إلى بابك.<br/>
          سيتصل بك فريقنا لتأكيد الطلب وتحديد موعد التوصيل.
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin-bottom: 8px;">
        <a href="${STORE_URL}" style="${STYLES.cta}" dir="rtl">متابعة التسوق</a>
      </div>

    </div>

    <!-- Footer -->
    <div style="${STYLES.footer}">
      <p style="${STYLES.footer_text}">
        She&apos;s Fit &amp; Beauty — boutique-she.com<br/>
        هذا البريد أُرسل تلقائياً، لا تحتاج للرد عليه.
      </p>
      <p style="${STYLES.footer_text}; margin-top: 8px;">
        © ${new Date().getFullYear()} She's Fit &amp; Beauty. جميع الحقوق محفوظة.
      </p>
    </div>

  </div>
</body>
</html>
  `.trim()
}

// ── Template HTML — Email admin ───────────────────────────────────────────────
function buildAdminEmailHtml(order: OrderEmailData): string {
  const itemsRows = order.items.map((item, i) => `
    <tr style="background: ${i % 2 === 0 ? '#ffffff' : '#FAFAFA'}">
      <td style="${STYLES.td}">
        <div style="font-weight: 600; color: #1A1A1A;" dir="rtl">${item.productName}</div>
        <div style="font-size: 11px; color: #9A9A9A; margin-top: 2px;" dir="rtl">
          ${item.colorAr ? `اللون: ${item.colorAr}` : ''} ${item.size ? `· المقاس: ${item.size}` : ''}
        </div>
      </td>
      <td style="${STYLES.td} text-align: center; color: #4B5563;">${item.quantity}</td>
      <td style="${STYLES.td} text-align: right; color: #4B5563;">${formatPrice(item.unitPrice)}</td>
      <td style="${STYLES.td} text-align: right; font-weight: 700; color: #E93D91;">${formatPrice(item.unitPrice * item.quantity)}</td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouvelle commande ${order.orderNumber}</title>
</head>
<body style="${STYLES.wrapper}">
  <div style="${STYLES.container}">

    <!-- Header -->
    <div style="${STYLES.header}">
      <div style="margin-bottom: 8px;">
        <img src="${STORE_URL}/branding/logo.png" width="56" height="56" alt="She's" style="border-radius: 50%; border: 2px solid #CEA060;" />
      </div>
      <h1 style="${STYLES.brand}; font-size: 18px;">🛍️ NOUVELLE COMMANDE</h1>
      <p style="${STYLES.tagline}">She's Fit &amp; Beauty — Admin</p>
    </div>

    <!-- Alerte commande -->
    <div style="background: #FFF0F7; border-left: 4px solid #E93D91; padding: 16px 24px; margin: 0;">
      <p style="margin: 0; font-size: 14px; color: #991B1B; font-weight: 600;">
        ⚡ Commande reçue le ${new Date().toLocaleDateString('fr-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>

    <!-- Body -->
    <div style="${STYLES.body}">

      <!-- N° commande + total -->
      <div style="display: flex; align-items: center; justify-content: space-between; background: #FAFAFA; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
        <div>
          <p style="font-size: 11px; color: #9A9A9A; font-weight: 600; margin: 0 0 4px; letter-spacing: 0.08em; text-transform: uppercase;">N° COMMANDE</p>
          <p style="font-size: 24px; font-weight: 800; color: #E93D91; margin: 0; letter-spacing: 0.04em;">${order.orderNumber}</p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 11px; color: #9A9A9A; font-weight: 600; margin: 0 0 4px; letter-spacing: 0.08em; text-transform: uppercase;">TOTAL</p>
          <p style="font-size: 24px; font-weight: 800; color: #1A1A1A; margin: 0;">${formatPrice(order.total)}</p>
        </div>
      </div>

      <!-- Informations client -->
      <p style="${STYLES.section_title}">INFORMATIONS CLIENT</p>
      <div style="${STYLES.info_grid}; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 0; font-size: 13px; color: #9A9A9A; font-weight: 600; width: 140px;">Nom</td>
            <td style="padding: 5px 0; font-size: 13px; color: #1A1A1A; font-weight: 600;">${order.customerName}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-size: 13px; color: #9A9A9A; font-weight: 600;">Téléphone</td>
            <td style="padding: 5px 0; font-size: 14px; color: #E93D91; font-weight: 800;">
              <a href="tel:${order.phone}" style="color: #E93D91; text-decoration: none;">${order.phone}</a>
            </td>
          </tr>
          ${order.email ? `
          <tr>
            <td style="padding: 5px 0; font-size: 13px; color: #9A9A9A; font-weight: 600;">Email</td>
            <td style="padding: 5px 0; font-size: 13px; color: #1A1A1A;">${order.email}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 5px 0; font-size: 13px; color: #9A9A9A; font-weight: 600;">Wilaya</td>
            <td style="padding: 5px 0; font-size: 13px; color: #1A1A1A;" dir="rtl">${order.wilaya}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-size: 13px; color: #9A9A9A; font-weight: 600;">Commune</td>
            <td style="padding: 5px 0; font-size: 13px; color: #1A1A1A;" dir="rtl">${order.commune}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-size: 13px; color: #9A9A9A; font-weight: 600;">Adresse</td>
            <td style="padding: 5px 0; font-size: 13px; color: #1A1A1A;" dir="rtl">${order.address}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; font-size: 13px; color: #9A9A9A; font-weight: 600;">Livraison</td>
            <td style="padding: 5px 0; font-size: 13px; color: #1A1A1A;" dir="rtl">${deliveryModeLabel(order.deliveryMode)}</td>
          </tr>
          ${order.note ? `
          <tr>
            <td style="padding: 5px 0; font-size: 13px; color: #9A9A9A; font-weight: 600;">Note</td>
            <td style="padding: 5px 0; font-size: 13px; color: #B45309; font-style: italic;" dir="rtl">"${order.note}"</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <!-- Articles -->
      <p style="${STYLES.section_title}">ARTICLES COMMANDÉS</p>
      <table style="${STYLES.table}; margin-bottom: 0; border: 1px solid #EBE6DF; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #F5F5F5;">
            <th style="${STYLES.th_left}">Produit</th>
            <th style="${STYLES.th}">Qté</th>
            <th style="${STYLES.th}">Prix unit.</th>
            <th style="${STYLES.th}">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
        <tfoot style="background: #FAFAFA;">
          <tr>
            <td colspan="3" style="padding: 10px 12px; text-align: right; font-size: 12px; color: #9A9A9A; border-top: 1px solid #EBE6DF;">Sous-total</td>
            <td style="padding: 10px 12px; text-align: right; font-size: 13px; font-weight: 600; border-top: 1px solid #EBE6DF;">${formatPrice(order.subtotal)}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 10px 12px; text-align: right; font-size: 12px; color: #9A9A9A;">Frais de livraison</td>
            <td style="padding: 10px 12px; text-align: right; font-size: 13px; font-weight: 600;">${formatPrice(order.shippingFee)}</td>
          </tr>
          <tr style="background: #FFF0F7;">
            <td colspan="3" style="padding: 13px 12px; text-align: right; font-size: 14px; font-weight: 800; color: #E93D91; border-top: 2px solid #E93D91;">TOTAL À PERCEVOIR</td>
            <td style="padding: 13px 12px; text-align: right; font-size: 18px; font-weight: 800; color: #E93D91; border-top: 2px solid #E93D91;">${formatPrice(order.total)}</td>
          </tr>
        </tfoot>
      </table>

      <hr style="${STYLES.gold_divider}" />

      <!-- CTA Admin -->
      <div style="text-align: center;">
        <a href="${STORE_URL}/boutique-admin/orders" style="${STYLES.cta}; background: linear-gradient(135deg, #1A1A1A, #3D3D3D);">
          Voir dans l&apos;admin
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="${STYLES.footer}">
      <p style="${STYLES.footer_text}">
        She&apos;s Fit &amp; Beauty · boutique-she.com<br/>
        Email automatique — ne pas répondre
      </p>
    </div>

  </div>
</body>
</html>
  `.trim()
}

// ── Fonctions d'envoi publiques ───────────────────────────────────────────────

/**
 * Envoie la confirmation de commande au client (si email fourni)
 * ET la notification à l'admin.
 * Ne bloque jamais createOrder — les erreurs sont loguées silencieusement.
 */
export async function sendOrderEmails(order: OrderEmailData): Promise<void> {
  const promises: Promise<unknown>[] = []

  // 1. Email client (seulement si email fourni)
  if (order.email) {
    promises.push(
      resend.emails.send({
        from: FROM_ADDRESS,
        to: order.email,
        subject: `✅ تأكيد طلبك ${order.orderNumber} — She's Fit & Beauty`,
        html: buildCustomerEmailHtml(order),
      }).catch(err => console.error('[email] Erreur envoi client:', err))
    )
  }

  // 2. Email admin (toujours)
  promises.push(
    resend.emails.send({
      from: FROM_ADDRESS,
      to: ADMIN_EMAIL,
      subject: `🛍️ Nouvelle commande ${order.orderNumber} — ${formatPrice(order.total)}`,
      html: buildAdminEmailHtml(order),
    }).catch(err => console.error('[email] Erreur envoi admin:', err))
  )

  // Envoi en parallèle — ne jamais await bloquant dans createOrder
  await Promise.allSettled(promises)
}
