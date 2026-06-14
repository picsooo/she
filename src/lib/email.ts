/**
 * email.ts — Système d'envoi d'emails via SMTP (Nodemailer)
 * Templates HTML premium aux couleurs She's Fit & Beauty
 */
import nodemailer from 'nodemailer'

// ── Transporteur SMTP ─────────────────────────────────────────────────────────
const smtpPort = parseInt(process.env.SMTP_PORT ?? '587')
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port:   smtpPort,
  secure: smtpPort === 465, // true seulement pour 465, false pour 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
  },
  tls: {
    rejectUnauthorized: false,
  },
})

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "She's Fit & Beauty <shefitandbeauty@gmail.com>"
// Plusieurs destinataires admin séparés par virgule dans ADMIN_EMAILS
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'shefitandbeauty@gmail.com,contact@webminds.dz')
  .split(',').map(e => e.trim()).filter(Boolean)
const STORE_URL    = process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://boutique-she.com'

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

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatPrice(amount: number): string {
  return amount.toLocaleString('fr-DZ') + ' دج'
}

function deliveryModeLabel(mode: 'home' | 'desk'): string {
  return mode === 'desk' ? '🏢 توصيل إلى مكتب ياليدين' : '🏠 توصيل إلى المنزل'
}

// ── Styles inline partagés ────────────────────────────────────────────────────
const S = {
  wrapper:      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; background: #F7F5F2; margin: 0; padding: 0;',
  container:    'max-width: 620px; margin: 0 auto; background: #ffffff;',
  header:       'background: linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%); padding: 32px 40px; text-align: center;',
  brand:        'color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: 0.04em; margin: 0;',
  tagline:      'color: #CEA060; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; margin: 4px 0 0;',
  body:         'padding: 36px 40px;',
  sectionTitle: 'font-size: 11px; font-weight: 700; color: #CEA060; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 12px; border-bottom: 1px solid #EBE6DF; padding-bottom: 8px;',
  orderBadge:   'display: inline-block; background: #FFF0F7; border: 1.5px solid #F9A8D4; border-radius: 8px; padding: 12px 24px; text-align: center;',
  orderNumber:  'color: #E93D91; font-size: 28px; font-weight: 800; letter-spacing: 0.05em; margin: 0;',
  table:        'width: 100%; border-collapse: collapse; margin: 0;',
  th:           'padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 700; color: #9A9A9A; background: #FAFAFA; border-bottom: 1px solid #EBE6DF;',
  thLeft:       'padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; color: #9A9A9A; background: #FAFAFA; border-bottom: 1px solid #EBE6DF;',
  td:           'padding: 12px; font-size: 13px; color: #3D3D3D; border-bottom: 1px solid #F5F5F5; vertical-align: top;',
  infoGrid:     'background: #FAFAFA; border-radius: 10px; padding: 20px; margin: 0;',
  cta:          'display: inline-block; background: linear-gradient(135deg, #E93D91, #D32D80); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; letter-spacing: 0.02em;',
  footer:       'background: #1A1A1A; padding: 24px 40px; text-align: center;',
  footerText:   'color: #6A6A6A; font-size: 11px; margin: 0; line-height: 1.6;',
  divider:      'border: none; border-top: 1px solid #EBE6DF; margin: 28px 0;',
  goldAccent:   'width: 40px; height: 3px; background: linear-gradient(90deg, #CEA060, #E8C880); border-radius: 2px; margin: 0 auto 20px;',
}

// ── Template HTML — Email client ──────────────────────────────────────────────
function buildCustomerEmailHtml(order: OrderEmailData): string {
  const rows = order.items.map(item => `
    <tr>
      <td style="${S.td}">
        <div style="font-weight:600;color:#1A1A1A" dir="rtl">${item.productName}</div>
        <div style="font-size:12px;color:#9A9A9A;margin-top:3px" dir="rtl">
          ${item.colorAr ? `اللون: ${item.colorAr}` : ''}${item.colorAr && item.size ? ' · ' : ''}${item.size ? `المقاس: ${item.size}` : ''}
        </div>
      </td>
      <td style="${S.td} text-align:center">${item.quantity}</td>
      <td style="${S.td} text-align:right;font-weight:600">${formatPrice(item.unitPrice)}</td>
      <td style="${S.td} text-align:right;color:#E93D91;font-weight:700">${formatPrice(item.unitPrice * item.quantity)}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>تأكيد طلبك — She's Fit &amp; Beauty</title></head>
<body style="${S.wrapper}">
<div style="${S.container}">

  <!-- Header -->
  <div style="${S.header}">
    <div style="margin-bottom:8px">
      <img src="${STORE_URL}/branding/logo.png" width="64" height="64" alt="She's Fit &amp; Beauty"
           style="border-radius:50%;border:2px solid #CEA060;display:inline-block" />
    </div>
    <h1 style="${S.brand}">SHE'S FIT &amp; BEAUTY</h1>
    <p style="${S.tagline}">Mode Femme · الجزائر</p>
  </div>

  <!-- Body -->
  <div style="${S.body}">

    <!-- Titre -->
    <div style="text-align:center;margin-bottom:28px">
      <div style="${S.goldAccent}"></div>
      <h2 style="font-size:22px;font-weight:800;color:#1A1A1A;margin:0 0 8px" dir="rtl">
        شكراً على طلبك، ${order.customerName}! 🎉
      </h2>
      <p style="font-size:14px;color:#6D7175;margin:0;line-height:1.6" dir="rtl">
        تم استلام طلبك بنجاح. سنتواصل معك خلال 24 ساعة القادمة لتأكيد الطلب.
      </p>
    </div>

    <!-- Numéro commande -->
    <div style="text-align:center;margin-bottom:28px">
      <p style="font-size:12px;color:#9A9A9A;margin:0 0 10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">رقم طلبك</p>
      <div style="${S.orderBadge}">
        <p style="${S.orderNumber}">${order.orderNumber}</p>
      </div>
      <p style="font-size:11px;color:#B0B0B0;margin:10px 0 0" dir="rtl">احتفظ بهذا الرقم للمتابعة</p>
    </div>

    <hr style="${S.divider}" />

    <!-- Articles -->
    <p style="${S.sectionTitle}">تفاصيل الطلب</p>
    <table style="${S.table}">
      <thead>
        <tr>
          <th style="${S.th}" dir="rtl">المنتج</th>
          <th style="${S.th}">الكمية</th>
          <th style="${S.th}">السعر</th>
          <th style="${S.th}">المجموع</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:10px 12px;text-align:right;font-size:13px;color:#6D7175;border-top:1px solid #EBE6DF" dir="rtl">المجموع الجزئي</td>
          <td style="padding:10px 12px;text-align:right;font-size:13px;font-weight:600;border-top:1px solid #EBE6DF">${formatPrice(order.subtotal)}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding:10px 12px;text-align:right;font-size:13px;color:#6D7175" dir="rtl">رسوم التوصيل</td>
          <td style="padding:10px 12px;text-align:right;font-size:13px;font-weight:600">${formatPrice(order.shippingFee)}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding:14px 12px;text-align:right;font-size:15px;font-weight:800;color:#E93D91;border-top:2px solid #E93D91" dir="rtl">المجموع الكلي</td>
          <td style="padding:14px 12px;text-align:right;font-size:15px;font-weight:800;color:#E93D91;border-top:2px solid #E93D91">${formatPrice(order.total)}</td>
        </tr>
      </tfoot>
    </table>

    <hr style="${S.divider}" />

    <!-- Livraison -->
    <p style="${S.sectionTitle}">معلومات التوصيل</p>
    <div style="${S.infoGrid}">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;font-size:13px;color:#9A9A9A;font-weight:600;width:130px" dir="rtl">طريقة التوصيل</td><td style="padding:6px 0;font-size:13px;color:#1A1A1A;font-weight:500" dir="rtl">${deliveryModeLabel(order.deliveryMode)}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#9A9A9A;font-weight:600" dir="rtl">الولاية</td><td style="padding:6px 0;font-size:13px;color:#1A1A1A" dir="rtl">${order.wilaya}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#9A9A9A;font-weight:600" dir="rtl">البلدية</td><td style="padding:6px 0;font-size:13px;color:#1A1A1A" dir="rtl">${order.commune}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#9A9A9A;font-weight:600" dir="rtl">العنوان</td><td style="padding:6px 0;font-size:13px;color:#1A1A1A" dir="rtl">${order.address}</td></tr>
        <tr><td style="padding:6px 0;font-size:13px;color:#9A9A9A;font-weight:600" dir="rtl">الهاتف</td><td style="padding:6px 0;font-size:13px;color:#1A1A1A;direction:ltr;text-align:right">${order.phone}</td></tr>
        ${order.note ? `<tr><td style="padding:6px 0;font-size:13px;color:#9A9A9A;font-weight:600" dir="rtl">ملاحظة</td><td style="padding:6px 0;font-size:13px;color:#1A1A1A" dir="rtl">${order.note}</td></tr>` : ''}
      </table>
    </div>

    <hr style="${S.divider}" />

    <!-- COD -->
    <div style="background:#FFF8E7;border:1px solid #FDE68A;border-radius:10px;padding:16px 20px;margin-bottom:28px;text-align:center" dir="rtl">
      <p style="font-size:13px;color:#92400E;margin:0;font-weight:500;line-height:1.7">
        💳 <strong>الدفع عند الاستلام</strong> — ستدفع عند وصول طلبك إلى بابك.<br/>
        سيتصل بك فريقنا لتأكيد الطلب وتحديد موعد التوصيل.
      </p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:8px">
      <a href="${STORE_URL}" style="${S.cta}" dir="rtl">متابعة التسوق</a>
    </div>

  </div>

  <!-- Footer -->
  <div style="${S.footer}">
    <p style="${S.footerText}">She's Fit &amp; Beauty — boutique-she.com<br/>هذا البريد أُرسل تلقائياً، لا تحتاج للرد عليه.</p>
    <p style="${S.footerText};margin-top:8px">© ${new Date().getFullYear()} She's Fit &amp; Beauty. جميع الحقوق محفوظة.</p>
  </div>

</div>
</body>
</html>`
}

// ── Template HTML — Email admin ───────────────────────────────────────────────
function buildAdminEmailHtml(order: OrderEmailData): string {
  const rows = order.items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#FAFAFA'}">
      <td style="${S.td}">
        <div style="font-weight:600;color:#1A1A1A" dir="rtl">${item.productName}</div>
        <div style="font-size:11px;color:#9A9A9A;margin-top:2px" dir="rtl">
          ${item.colorAr ? `اللون: ${item.colorAr}` : ''} ${item.size ? `· المقاس: ${item.size}` : ''}
        </div>
      </td>
      <td style="${S.td} text-align:center;color:#4B5563">${item.quantity}</td>
      <td style="${S.td} text-align:right;color:#4B5563">${formatPrice(item.unitPrice)}</td>
      <td style="${S.td} text-align:right;font-weight:700;color:#E93D91">${formatPrice(item.unitPrice * item.quantity)}</td>
    </tr>
  `).join('')

  const now = new Date().toLocaleDateString('fr-DZ', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return `<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Nouvelle commande ${order.orderNumber}</title></head>
<body style="${S.wrapper}">
<div style="${S.container}">

  <!-- Header -->
  <div style="${S.header}">
    <div style="margin-bottom:8px">
      <img src="${STORE_URL}/branding/logo.png" width="56" height="56" alt="She's"
           style="border-radius:50%;border:2px solid #CEA060" />
    </div>
    <h1 style="${S.brand};font-size:18px">🛍️ NOUVELLE COMMANDE</h1>
    <p style="${S.tagline}">She's Fit &amp; Beauty — Admin</p>
  </div>

  <!-- Alerte -->
  <div style="background:#FFF0F7;border-left:4px solid #E93D91;padding:16px 24px;margin:0">
    <p style="margin:0;font-size:14px;color:#991B1B;font-weight:600">
      ⚡ Commande reçue le ${now}
    </p>
  </div>

  <!-- Body -->
  <div style="${S.body}">

    <!-- N° + Total -->
    <table style="width:100%;border-collapse:collapse;background:#FAFAFA;border-radius:10px;margin-bottom:24px">
      <tr>
        <td style="padding:16px 20px">
          <p style="font-size:11px;color:#9A9A9A;font-weight:600;margin:0 0 4px;letter-spacing:0.08em;text-transform:uppercase">N° COMMANDE</p>
          <p style="font-size:24px;font-weight:800;color:#E93D91;margin:0;letter-spacing:0.04em">${order.orderNumber}</p>
        </td>
        <td style="padding:16px 20px;text-align:right">
          <p style="font-size:11px;color:#9A9A9A;font-weight:600;margin:0 0 4px;letter-spacing:0.08em;text-transform:uppercase">TOTAL À PERCEVOIR</p>
          <p style="font-size:24px;font-weight:800;color:#1A1A1A;margin:0">${formatPrice(order.total)}</p>
        </td>
      </tr>
    </table>

    <!-- Client -->
    <p style="${S.sectionTitle}">INFORMATIONS CLIENT</p>
    <div style="${S.infoGrid};margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:5px 0;font-size:13px;color:#9A9A9A;font-weight:600;width:140px">Nom</td><td style="padding:5px 0;font-size:13px;color:#1A1A1A;font-weight:600">${order.customerName}</td></tr>
        <tr>
          <td style="padding:5px 0;font-size:13px;color:#9A9A9A;font-weight:600">Téléphone</td>
          <td style="padding:5px 0;font-size:14px;font-weight:800">
            <a href="tel:${order.phone}" style="color:#E93D91;text-decoration:none">${order.phone}</a>
          </td>
        </tr>
        ${order.email ? `<tr><td style="padding:5px 0;font-size:13px;color:#9A9A9A;font-weight:600">Email</td><td style="padding:5px 0;font-size:13px;color:#1A1A1A">${order.email}</td></tr>` : ''}
        <tr><td style="padding:5px 0;font-size:13px;color:#9A9A9A;font-weight:600">Wilaya</td><td style="padding:5px 0;font-size:13px;color:#1A1A1A" dir="rtl">${order.wilaya}</td></tr>
        <tr><td style="padding:5px 0;font-size:13px;color:#9A9A9A;font-weight:600">Commune</td><td style="padding:5px 0;font-size:13px;color:#1A1A1A" dir="rtl">${order.commune}</td></tr>
        <tr><td style="padding:5px 0;font-size:13px;color:#9A9A9A;font-weight:600">Adresse</td><td style="padding:5px 0;font-size:13px;color:#1A1A1A" dir="rtl">${order.address}</td></tr>
        <tr><td style="padding:5px 0;font-size:13px;color:#9A9A9A;font-weight:600">Livraison</td><td style="padding:5px 0;font-size:13px;color:#1A1A1A" dir="rtl">${deliveryModeLabel(order.deliveryMode)}</td></tr>
        ${order.note ? `<tr><td style="padding:5px 0;font-size:13px;color:#9A9A9A;font-weight:600">Note client</td><td style="padding:5px 0;font-size:13px;color:#B45309;font-style:italic" dir="rtl">"${order.note}"</td></tr>` : ''}
      </table>
    </div>

    <!-- Articles -->
    <p style="${S.sectionTitle}">ARTICLES COMMANDÉS</p>
    <table style="${S.table};border:1px solid #EBE6DF;border-radius:8px;overflow:hidden;margin-bottom:0">
      <thead>
        <tr style="background:#F5F5F5">
          <th style="${S.thLeft}">Produit</th>
          <th style="${S.th}">Qté</th>
          <th style="${S.th}">Prix unit.</th>
          <th style="${S.th}">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot style="background:#FAFAFA">
        <tr>
          <td colspan="3" style="padding:10px 12px;text-align:right;font-size:12px;color:#9A9A9A;border-top:1px solid #EBE6DF">Sous-total</td>
          <td style="padding:10px 12px;text-align:right;font-size:13px;font-weight:600;border-top:1px solid #EBE6DF">${formatPrice(order.subtotal)}</td>
        </tr>
        <tr>
          <td colspan="3" style="padding:10px 12px;text-align:right;font-size:12px;color:#9A9A9A">Frais de livraison</td>
          <td style="padding:10px 12px;text-align:right;font-size:13px;font-weight:600">${formatPrice(order.shippingFee)}</td>
        </tr>
        <tr style="background:#FFF0F7">
          <td colspan="3" style="padding:13px 12px;text-align:right;font-size:14px;font-weight:800;color:#E93D91;border-top:2px solid #E93D91">TOTAL À PERCEVOIR</td>
          <td style="padding:13px 12px;text-align:right;font-size:18px;font-weight:800;color:#E93D91;border-top:2px solid #E93D91">${formatPrice(order.total)}</td>
        </tr>
      </tfoot>
    </table>

    <hr style="${S.divider}" />

    <!-- CTA -->
    <div style="text-align:center">
      <a href="${STORE_URL}/boutique-admin/orders" style="${S.cta};background:linear-gradient(135deg,#1A1A1A,#3D3D3D)">
        Voir dans l'admin
      </a>
    </div>

  </div>

  <!-- Footer -->
  <div style="${S.footer}">
    <p style="${S.footerText}">She's Fit &amp; Beauty · boutique-she.com<br/>Email automatique — ne pas répondre</p>
  </div>

</div>
</body>
</html>`
}

// ── Envoi ─────────────────────────────────────────────────────────────────────

/**
 * Envoie confirmation au client (si email fourni) + notification à l'admin.
 * Ne bloque jamais createOrder — erreurs loguées silencieusement.
 */
export async function sendOrderEmails(order: OrderEmailData): Promise<void> {
  const promises: Promise<unknown>[] = []

  // 1. Email client
  if (order.email) {
    promises.push(
      transporter.sendMail({
        from:    FROM_ADDRESS,
        to:      order.email,
        subject: `✅ تأكيد طلبك ${order.orderNumber} — She's Fit & Beauty`,
        html:    buildCustomerEmailHtml(order),
      }).catch(err => console.error('[email] Erreur client:', err))
    )
  }

  // 2. Email admin — envoyé à tous les destinataires configurés
  promises.push(
    transporter.sendMail({
      from:    FROM_ADDRESS,
      to:      ADMIN_EMAILS.join(', '),
      subject: `🛍️ Nouvelle commande ${order.orderNumber} — ${formatPrice(order.total)}`,
      html:    buildAdminEmailHtml(order),
    }).catch(err => console.error('[email] Erreur admin:', err))
  )

  await Promise.allSettled(promises)
}
