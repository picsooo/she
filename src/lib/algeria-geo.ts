// Données géographiques de l'Algérie — 58 wilayas + communes
// Source : dataset open-source des communes algériennes
// Utilisé dans le checkout pour la cascade wilaya → communes

export interface Wilaya {
  code: string // ex: "16" pour Alger
  nameAr: string
  nameFr: string
}

export interface Commune {
  wilayaCode: string
  nameAr: string
  nameFr: string
}

// 58 wilayas (incluant les 10 nouvelles créées en 2019)
export const WILAYAS: Wilaya[] = [
  { code: '01', nameAr: 'أدرار', nameFr: 'Adrar' },
  { code: '02', nameAr: 'الشلف', nameFr: 'Chlef' },
  { code: '03', nameAr: 'الأغواط', nameFr: 'Laghouat' },
  { code: '04', nameAr: 'أم البواقي', nameFr: 'Oum El Bouaghi' },
  { code: '05', nameAr: 'باتنة', nameFr: 'Batna' },
  { code: '06', nameAr: 'بجاية', nameFr: 'Béjaïa' },
  { code: '07', nameAr: 'بسكرة', nameFr: 'Biskra' },
  { code: '08', nameAr: 'بشار', nameFr: 'Béchar' },
  { code: '09', nameAr: 'البليدة', nameFr: 'Blida' },
  { code: '10', nameAr: 'البويرة', nameFr: 'Bouira' },
  { code: '11', nameAr: 'تمنراست', nameFr: 'Tamanrasset' },
  { code: '12', nameAr: 'تبسة', nameFr: 'Tébessa' },
  { code: '13', nameAr: 'تلمسان', nameFr: 'Tlemcen' },
  { code: '14', nameAr: 'تيارت', nameFr: 'Tiaret' },
  { code: '15', nameAr: 'تيزي وزو', nameFr: 'Tizi Ouzou' },
  { code: '16', nameAr: 'الجزائر', nameFr: 'Alger' },
  { code: '17', nameAr: 'الجلفة', nameFr: 'Djelfa' },
  { code: '18', nameAr: 'جيجل', nameFr: 'Jijel' },
  { code: '19', nameAr: 'سطيف', nameFr: 'Sétif' },
  { code: '20', nameAr: 'سعيدة', nameFr: 'Saïda' },
  { code: '21', nameAr: 'سكيكدة', nameFr: 'Skikda' },
  { code: '22', nameAr: 'سيدي بلعباس', nameFr: 'Sidi Bel Abbès' },
  { code: '23', nameAr: 'عنابة', nameFr: 'Annaba' },
  { code: '24', nameAr: 'قالمة', nameFr: 'Guelma' },
  { code: '25', nameAr: 'قسنطينة', nameFr: 'Constantine' },
  { code: '26', nameAr: 'المدية', nameFr: 'Médéa' },
  { code: '27', nameAr: 'مستغانم', nameFr: 'Mostaganem' },
  { code: '28', nameAr: 'المسيلة', nameFr: 'M\'Sila' },
  { code: '29', nameAr: 'معسكر', nameFr: 'Mascara' },
  { code: '30', nameAr: 'ورقلة', nameFr: 'Ouargla' },
  { code: '31', nameAr: 'وهران', nameFr: 'Oran' },
  { code: '32', nameAr: 'البيض', nameFr: 'El Bayadh' },
  { code: '33', nameAr: 'إليزي', nameFr: 'Illizi' },
  { code: '34', nameAr: 'برج بوعريريج', nameFr: 'Bordj Bou Arréridj' },
  { code: '35', nameAr: 'بومرداس', nameFr: 'Boumerdès' },
  { code: '36', nameAr: 'الطارف', nameFr: 'El Tarf' },
  { code: '37', nameAr: 'تندوف', nameFr: 'Tindouf' },
  { code: '38', nameAr: 'تيسمسيلت', nameFr: 'Tissemsilt' },
  { code: '39', nameAr: 'الوادي', nameFr: 'El Oued' },
  { code: '40', nameAr: 'خنشلة', nameFr: 'Khenchela' },
  { code: '41', nameAr: 'سوق أهراس', nameFr: 'Souk Ahras' },
  { code: '42', nameAr: 'تيبازة', nameFr: 'Tipaza' },
  { code: '43', nameAr: 'ميلة', nameFr: 'Mila' },
  { code: '44', nameAr: 'عين الدفلى', nameFr: 'Aïn Defla' },
  { code: '45', nameAr: 'النعامة', nameFr: 'Naâma' },
  { code: '46', nameAr: 'عين تموشنت', nameFr: 'Aïn Témouchent' },
  { code: '47', nameAr: 'غرداية', nameFr: 'Ghardaïa' },
  { code: '48', nameAr: 'غليزان', nameFr: 'Relizane' },
  // 10 nouvelles wilayas (2019)
  { code: '49', nameAr: 'تيميمون', nameFr: 'Timimoun' },
  { code: '50', nameAr: 'برج باجي مختار', nameFr: 'Bordj Badji Mokhtar' },
  { code: '51', nameAr: 'أولاد جلال', nameFr: 'Ouled Djellal' },
  { code: '52', nameAr: 'بني عباس', nameFr: 'Béni Abbès' },
  { code: '53', nameAr: 'عين صالح', nameFr: 'In Salah' },
  { code: '54', nameAr: 'عين قزام', nameFr: 'In Guezzam' },
  { code: '55', nameAr: 'تقرت', nameFr: 'Touggourt' },
  { code: '56', nameAr: 'جانت', nameFr: 'Djanet' },
  { code: '57', nameAr: 'المغير', nameFr: 'El M\'Ghair' },
  { code: '58', nameAr: 'المنيعة', nameFr: 'El Meniaa' },
]

// Communes — liste partielle (chefs-lieux) à compléter avec le dataset complet
// TODO: remplacer par le fichier JSON complet des ~1 541 communes algériennes
export const COMMUNES: Commune[] = [
  // Alger (16) — communes principales
  { wilayaCode: '16', nameAr: 'الجزائر الوسطى', nameFr: 'Alger Centre' },
  { wilayaCode: '16', nameAr: 'باب الوادي', nameFr: 'Bab El Oued' },
  { wilayaCode: '16', nameAr: 'الحراش', nameFr: 'El Harrach' },
  { wilayaCode: '16', nameAr: 'بابا حسن', nameFr: 'Baba Hassen' },
  { wilayaCode: '16', nameAr: 'بئر مراد رايس', nameFr: 'Bir Mourad Raïs' },
  { wilayaCode: '16', nameAr: 'بن عكنون', nameFr: 'Ben Aknoun' },
  { wilayaCode: '16', nameAr: 'الدار البيضاء', nameFr: 'Dar El Beïda' },
  { wilayaCode: '16', nameAr: 'دالي إبراهيم', nameFr: 'Dély Ibrahim' },
  { wilayaCode: '16', nameAr: 'درارية', nameFr: 'Draria' },
  { wilayaCode: '16', nameAr: 'القبة', nameFr: 'El Biar' },
  { wilayaCode: '16', nameAr: 'المرادية', nameFr: 'Hydra' },
  { wilayaCode: '16', nameAr: 'حسين داي', nameFr: 'Hussein Dey' },
  { wilayaCode: '16', nameAr: 'الرغاية', nameFr: 'Rouïba' },
  { wilayaCode: '16', nameAr: 'الشراقة', nameFr: 'Chéraga' },
  { wilayaCode: '16', nameAr: 'سيدي امحمد', nameFr: 'Sidi M\'Hamed' },
  { wilayaCode: '16', nameAr: 'المحمدية', nameFr: 'Mohammadia' },
  { wilayaCode: '16', nameAr: 'بوزريعة', nameFr: 'Bouzareah' },
  { wilayaCode: '16', nameAr: 'المقرية', nameFr: 'El Magharia' },
  { wilayaCode: '16', nameAr: 'خرايسية', nameFr: 'Khraïcia' },
  { wilayaCode: '16', nameAr: 'المنظر الجميل', nameFr: 'Ain Benian' },
  // Oran (31)
  { wilayaCode: '31', nameAr: 'وهران', nameFr: 'Oran' },
  { wilayaCode: '31', nameAr: 'عين الترك', nameFr: 'Aïn El Turk' },
  { wilayaCode: '31', nameAr: 'بئر الجير', nameFr: 'Bir El Djir' },
  { wilayaCode: '31', nameAr: 'عرزيو', nameFr: 'Arzew' },
  { wilayaCode: '31', nameAr: 'مرسى الكبير', nameFr: 'Mers El Kébir' },
  { wilayaCode: '31', nameAr: 'السانية', nameFr: 'Es Sénia' },
  // Constantine (25)
  { wilayaCode: '25', nameAr: 'قسنطينة', nameFr: 'Constantine' },
  { wilayaCode: '25', nameAr: 'الخروب', nameFr: 'El Khroub' },
  { wilayaCode: '25', nameAr: 'حامة بوزيان', nameFr: 'Hamma Bouziane' },
  { wilayaCode: '25', nameAr: 'ديدوش مراد', nameFr: 'Didouche Mourad' },
  { wilayaCode: '25', nameAr: 'عين عبيد', nameFr: 'Aïn Abid' },
  { wilayaCode: '25', nameAr: 'زيغود يوسف', nameFr: 'Zighoud Youcef' },
  // Annaba (23)
  { wilayaCode: '23', nameAr: 'عنابة', nameFr: 'Annaba' },
  { wilayaCode: '23', nameAr: 'سرايدي', nameFr: 'Seraïdi' },
  { wilayaCode: '23', nameAr: 'برحال', nameFr: 'Berrahel' },
  { wilayaCode: '23', nameAr: 'الحجار', nameFr: 'El Hadjar' },
  // Blida (09)
  { wilayaCode: '09', nameAr: 'البليدة', nameFr: 'Blida' },
  { wilayaCode: '09', nameAr: 'بوفاريك', nameFr: 'Boufarik' },
  { wilayaCode: '09', nameAr: 'الأربعاء', nameFr: 'Larbaâ' },
  { wilayaCode: '09', nameAr: 'بني مراد', nameFr: 'Beni Mered' },
  { wilayaCode: '09', nameAr: 'شفا', nameFr: 'Chiffa' },
  // Sétif (19)
  { wilayaCode: '19', nameAr: 'سطيف', nameFr: 'Sétif' },
  { wilayaCode: '19', nameAr: 'عين ولمان', nameFr: 'Aïn Oulmene' },
  { wilayaCode: '19', nameAr: 'الأرنا', nameFr: 'El Eulma' },
  { wilayaCode: '19', nameAr: 'بئر العرش', nameFr: 'Bir El Arch' },
  // Batna (05)
  { wilayaCode: '05', nameAr: 'باتنة', nameFr: 'Batna' },
  { wilayaCode: '05', nameAr: 'عين توتة', nameFr: 'Aïn Touta' },
  { wilayaCode: '05', nameAr: 'تيمقاد', nameFr: 'Timgad' },
  { wilayaCode: '05', nameAr: 'لمباركية', nameFr: 'Barika' },
  // Tlemcen (13)
  { wilayaCode: '13', nameAr: 'تلمسان', nameFr: 'Tlemcen' },
  { wilayaCode: '13', nameAr: 'وجدة', nameFr: 'Oujda' },
  { wilayaCode: '13', nameAr: 'منصورة', nameFr: 'Mansourah' },
  { wilayaCode: '13', nameAr: 'بني مستر', nameFr: 'Beni Mester' },
  // Boumerdès (35)
  { wilayaCode: '35', nameAr: 'بومرداس', nameFr: 'Boumerdès' },
  { wilayaCode: '35', nameAr: 'بودواو', nameFr: 'Boudouaou' },
  { wilayaCode: '35', nameAr: 'دلس', nameFr: 'Dellys' },
  { wilayaCode: '35', nameAr: 'رويبة', nameFr: 'Rouïba' },
  // Tipaza (42)
  { wilayaCode: '42', nameAr: 'تيبازة', nameFr: 'Tipaza' },
  { wilayaCode: '42', nameAr: 'حجوط', nameFr: 'Hadjout' },
  { wilayaCode: '42', nameAr: 'القليعة', nameFr: 'Koléa' },
  { wilayaCode: '42', nameAr: 'بواسماعيل', nameFr: 'Bou Ismail' },
  // Pour les autres wilayas : chef-lieu = nom de la wilaya (à compléter)
  ...WILAYAS.filter(w => !['16','31','25','23','09','19','05','13','35','42'].includes(w.code))
    .map(w => ({ wilayaCode: w.code, nameAr: w.nameAr, nameFr: w.nameFr })),
]

// Récupère les communes d'une wilaya (par code)
export function getCommunesByWilaya(wilayaCode: string): Commune[] {
  return COMMUNES.filter(c => c.wilayaCode === wilayaCode)
}

// Récupère une wilaya par son code
export function getWilayaByCode(code: string): Wilaya | undefined {
  return WILAYAS.find(w => w.code === code)
}
