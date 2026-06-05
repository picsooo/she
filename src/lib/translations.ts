// Centralisation de tous les textes arabes du site
// ⚠️ Jamais de texte arabe en dur dans les composants — tout passe par ici

export const t = {
  // ── Navigation ────────────────────────────────────────────────────
  nav: {
    home: 'الرئيسية',
    catalog: 'المتجر',
    cart: 'السلة',
    search: 'بحث',
    categories: 'التصنيفات',
  },

  // ── Page d'accueil ────────────────────────────────────────────────
  home: {
    heroTitle: 'أناقتكِ تبدأ هنا',
    heroSubtitle: 'تشكيلة حصرية من أزياء المرأة',
    heroCta: 'تسوقي الآن',
    featuredProducts: 'منتجات مميزة',
    newArrivals: 'وصل حديثاً',
    promoSection: 'عروض خاصة',
    categoriesSection: 'تصفحي حسب الفئة',
    seeAll: 'عرض الكل',
  },

  // ── Catalogue ─────────────────────────────────────────────────────
  catalog: {
    title: 'المتجر',
    filterBy: 'تصفية حسب',
    sortBy: 'ترتيب حسب',
    sortNewest: 'الأحدث',
    sortPriceAsc: 'السعر: من الأقل',
    sortPriceDesc: 'السعر: من الأعلى',
    noResults: 'لا توجد منتجات',
    loading: 'جارٍ التحميل...',
    filterColor: 'اللون',
    filterSize: 'المقاس',
    filterPrice: 'السعر',
    filterCategory: 'الفئة',
    resetFilters: 'إلغاء الفلاتر',
    productsCount: (n: number) => `${n} منتج`,
  },

  // ── Page produit ──────────────────────────────────────────────────
  product: {
    addToCart: 'أضف إلى السلة',
    addedToCart: 'تمت الإضافة إلى السلة',
    outOfStock: 'غير متوفر',
    inStock: 'متوفر',
    selectColor: 'اختاري اللون',
    selectSize: 'اختاري المقاس',
    selectVariant: 'اختاري أولاً',
    price: 'السعر',
    regularPrice: 'السعر الأصلي',
    salePrice: 'سعر التخفيض',
    sku: 'المرجع',
    share: 'مشاركة',
    relatedProducts: 'منتجات مشابهة',
    colors: 'الألوان',
    sizes: 'المقاسات',
  },

  // ── Panier ────────────────────────────────────────────────────────
  cart: {
    title: 'سلة التسوق',
    empty: 'سلتكِ فارغة',
    emptyCta: 'ابدئي التسوق',
    quantity: 'الكمية',
    remove: 'حذف',
    subtotal: 'المجموع الفرعي',
    shipping: 'الشحن',
    total: 'المجموع',
    checkout: 'إتمام الطلب',
    continueShopping: 'مواصلة التسوق',
    viewCart: 'عرض السلة',
    itemAdded: 'تمت إضافة المنتج',
    updateVariant: 'تغيير المقاس/اللون',
  },

  // ── Checkout ──────────────────────────────────────────────────────
  checkout: {
    title: 'إتمام الطلب',
    personalInfo: 'المعلومات الشخصية',
    fullName: 'الاسم الكامل',
    phone: 'رقم الهاتف',
    phonePlaceholder: '05xxxxxxxx',
    phoneHint: 'يجب أن يبدأ بـ 05 أو 06 أو 07',
    wilaya: 'الولاية',
    commune: 'البلدية',
    address: 'العنوان',
    addressPlaceholder: 'رقم، شارع، حي...',
    note: 'ملاحظة (اختياري)',
    notePlaceholder: 'معلومات إضافية للتوصيل...',
    orderSummary: 'ملخص الطلب',
    paymentMethod: 'طريقة الدفع',
    cod: 'الدفع عند الاستلام',
    codDescription: 'تدفعين عند استلام طلبك',
    placeOrder: 'تأكيد الطلب',
    processing: 'جارٍ المعالجة...',
    requiredField: 'هذا الحقل مطلوب',
    selectWilaya: 'اختاري الولاية',
    selectCommune: 'اختاري البلدية',
    shippingFee: 'رسوم التوصيل',
    free: 'مجاني',
  },

  // ── Confirmation commande ─────────────────────────────────────────
  orderConfirmation: {
    title: 'تم استلام طلبك!',
    subtitle: 'شكراً لكِ على ثقتكِ',
    orderNumber: 'رقم الطلب',
    message: 'سيتم التواصل معكِ هاتفياً لتأكيد الطلب والتنسيق للتوصيل.',
    summary: 'تفاصيل طلبك',
    continueShopping: 'مواصلة التسوق',
    total: 'المجموع',
    deliveryAddress: 'عنوان التوصيل',
  },

  // ── Erreurs formulaire ────────────────────────────────────────────
  validation: {
    required: 'هذا الحقل مطلوب',
    phoneInvalid: 'رقم الهاتف غير صحيح (05/06/07 + 8 أرقام)',
    nameMin: 'الاسم يجب أن يكون 3 أحرف على الأقل',
    addressMin: 'العنوان غير مكتمل',
  },

  // ── Général ───────────────────────────────────────────────────────
  general: {
    currency: 'دج',
    loading: 'جارٍ التحميل...',
    error: 'حدث خطأ',
    tryAgain: 'حاولي مجدداً',
    close: 'إغلاق',
    confirm: 'تأكيد',
    cancel: 'إلغاء',
    save: 'حفظ',
    edit: 'تعديل',
    delete: 'حذف',
    search: 'بحث',
    back: 'رجوع',
    next: 'التالي',
    previous: 'السابق',
    siteTitle: 'She\'s Fit & Beauty',
    siteDescription: 'متجر أزياء المرأة الجزائرية',
  },

  // ── Réassurance (pied de page / bandeaux) ────────────────────────
  reassurance: {
    delivery: 'توصيل لجميع الولايات',
    payment: 'الدفع عند الاستلام',
    quality: 'جودة مضمونة',
    returns: 'سياسة إرجاع مرنة',
    support: 'تواصلي معنا',
  },

  // ── Footer ────────────────────────────────────────────────────────
  footer: {
    about: 'من نحن',
    contact: 'اتصلي بنا',
    shipping: 'سياسة التوصيل',
    returns: 'سياسة الإرجاع',
    followUs: 'تابعينا',
    rights: 'جميع الحقوق محفوظة',
    madeWith: 'صُنع بـ',
    love: '♥',
  },
} as const

// Formatage d'un prix en DZD
export function formatPrice(amount: number): string {
  return `${amount.toLocaleString('ar-DZ')} ${t.general.currency}`
}

// Table de correspondance couleurs FR → AR (import WooCommerce)
export const COLOR_TRANSLATIONS: Record<string, string> = {
  'Blanc': 'أبيض',
  'Noir': 'أسود',
  'Rose': 'وردي',
  'Bleu': 'أزرق',
  'Bleu marine': 'كحلي',
  'Rouge': 'أحمر',
  'Vert': 'أخضر',
  'Gris': 'رمادي',
  'Beige': 'بيج',
  'Marron': 'بني',
  'Violet': 'بنفسجي',
  'Orange': 'برتقالي',
  'Jaune': 'أصفر',
  'Or': 'ذهبي',
  'Argent': 'فضي',
  'Crème': 'كريمي',
  'Bordeaux': 'عنابي',
  'Corail': 'مرجاني',
  'Turquoise': 'تركواز',
  'Lavande': 'خزامي',
  'Camel': 'جملي',
  'Kaki': 'كاكي',
  'Taupe': 'توب',
  'Ecru': 'إيكرو',
  'Moutarde': 'خردلي',
  'Saumon': 'سلموني',
  'Fuchsia': 'فوشيا',
  'Nude': 'بشرة',
  'Blanc cassé': 'أبيض مكسور',
  'Bleu ciel': 'أزرق سماوي',
  'Bleu clair': 'أزرق فاتح',
  'Bleu foncé': 'أزرق غامق',
  'Vert kaki': 'أخضر زيتوني',
  'Rose poudré': 'وردي ناعم',
  'Rose fushia': 'وردي فوشيا',
  'Gris clair': 'رمادي فاتح',
  'Gris foncé': 'رمادي غامق',
}

// Convertit une couleur française en arabe
export function translateColor(colorFr: string): string {
  return COLOR_TRANSLATIONS[colorFr] ?? colorFr
}

// Table de correspondance catégories FR → AR
export const CATEGORY_TRANSLATIONS: Record<string, string> = {
  'Burkini': 'بوركيني',
  'Burkini SHE': 'بوركيني شي',
  'Robe Hidjab': 'فستان حجاب',
  'Manteaux et vestes': 'معاطف وسترات',
  'Ensemble': 'طقم',
  'Sacs': 'حقائب',
  'Chaussures': 'أحذية',
  'Pareo': 'باريو',
  'Jupe': 'تنورة',
  'Chemise': 'قميص',
  'Pantalon': 'بنطال',
  'Robe': 'فستان',
  'Tunique': 'تونيك',
  'Abaya': 'عباية',
  'Kaftan': 'قفطان',
  'Accessoires': 'إكسسوارات',
  'Ceinture': 'حزام',
  'Foulard': 'وشاح',
  'Hijab': 'حجاب',
}
