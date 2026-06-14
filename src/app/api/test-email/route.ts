import { NextResponse } from 'next/server'
import { sendOrderEmails } from '@/lib/email'

// Route de test email — à supprimer après validation
export async function GET() {
  await sendOrderEmails({
    orderNumber:  'SHE-TEST-0001',
    customerName: 'فاطمة الزهراء (Test)',
    phone:        '0555123456',
    email:        undefined,
    wilaya:       'الجزائر العاصمة',
    commune:      'باب الواد',
    address:      'شارع ديدوش مراد، رقم 12',
    note:         'هذا بريد اختبار — تجاهله',
    deliveryMode: 'home',
    items: [
      { productName: 'عباءة فيسكوز هادئة', colorAr: 'أسود', size: 'M(40-42)', quantity: 1, unitPrice: 4500 },
      { productName: 'جيلابة مطرزة', colorAr: 'بيج', size: 'L(42-44)', quantity: 2, unitPrice: 6000 },
    ],
    subtotal:    16500,
    shippingFee: 400,
    total:       16900,
  })

  return NextResponse.json({ ok: true, message: 'Email test envoyé — vérifiez shefitandbeauty@gmail.com et contact@webminds.dz' })
}
