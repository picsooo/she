'use client'

import { useState, useEffect, useRef } from 'react'

// Villes algériennes pour les notifications de preuve sociale
const CITIES = [
  'الجزائر', 'وهران', 'قسنطينة', 'عنابة', 'البليدة',
  'سطيف', 'باتنة', 'بجاية', 'تلمسان', 'الجلفة',
  'بسكرة', 'تيزي وزو', 'مستغانم', 'بومرداس', 'المدية',
  'تبسة', 'قالمة', 'سكيكدة', 'جيجل', 'ميلة',
  'سيدي بلعباس', 'معسكر', 'تيارت', 'الأغواط', 'الشلف',
]

interface Notification {
  id: number
  city: string
  action: string
  timeAgo: number // minutes ago
}

function generateNotification(id: number, productId: string | number): Notification {
  // Seed basé sur l'ID produit — convertir en string si nécessaire (SQLite retourne des nombres)
  const idStr = String(productId)
  const seed = idStr.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + id * 7
  const city = CITIES[seed % CITIES.length]
  const actions = ['طلبت هذا المنتج', 'أضافت إلى السلة', 'طلبت هذا المنتج']
  const action = actions[(seed * 3) % actions.length]
  const timeAgo = ((seed * 13) % 58) + 2 // 2-60 minutes

  return { id, city, action, timeAgo }
}

interface SocialProofProps {
  productId: string | number
  productName: string
}

// Notification flottante "quelqu'un vient de commander" — coin bas gauche (bas droit en RTL)
export function SocialProofNotification({ productId, productName }: SocialProofProps) {
  const [visible, setVisible] = useState(false)
  const [notification, setNotification] = useState<Notification | null>(null)
  const counterRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Première notification après 1.5 secondes
    const show = () => {
      counterRef.current += 1
      const notif = generateNotification(counterRef.current, productId)
      setNotification(notif)
      setVisible(true)

      // Masquer après 3.5 secondes
      timerRef.current = setTimeout(() => {
        setVisible(false)
        // Prochaine notification dans 8-15 secondes
        const delay = 8000 + Math.random() * 7000
        timerRef.current = setTimeout(show, delay)
      }, 3500)
    }

    timerRef.current = setTimeout(show, 1500)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [productId])

  if (!notification) return null

  return (
    <div
      className={`fixed bottom-6 start-6 z-50 max-w-xs transition-all duration-500 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl border border-[#EBE6DF]">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#FFF0F7] text-lg">
          🛍️
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground line-clamp-1">
            شخص من <span className="text-[#E93D91]">{notification.city}</span> {notification.action}
          </p>
          <p className="mt-0.5 text-[11px] text-foreground/50">
            منذ {notification.timeAgo} دقيقة
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="ms-1 flex-shrink-0 text-foreground/30 hover:text-foreground/60"
          aria-label="إغلاق"
        >
          ×
        </button>
      </div>
    </div>
  )
}

interface LiveViewersProps {
  productId: string | number
}

// Compteur "X personnes regardent ça maintenant" — discret, sous le bouton
export function LiveViewerCount({ productId }: LiveViewersProps) {
  const idStr = String(productId)
  const seed = idStr.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const [count, setCount] = useState(((seed % 8) + 3))

  useEffect(() => {
    // Fait varier le compteur légèrement toutes les 15-30 secondes
    const interval = setInterval(() => {
      setCount((prev) => {
        const delta = Math.random() > 0.5 ? 1 : -1
        return Math.max(2, Math.min(15, prev + delta))
      })
    }, 15000 + Math.random() * 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex items-center gap-1.5 text-xs text-foreground/50">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <span>
        <span className="font-semibold text-foreground/70">{count}</span> شخص يشاهد هذا الآن
      </span>
    </div>
  )
}

interface StockUrgencyProps {
  inStockCount: number // nombre de variations en stock
}

// Badge urgence "Il reste X en stock" — affiché si stock faible
export function StockUrgency({ inStockCount }: StockUrgencyProps) {
  if (inStockCount <= 0 || inStockCount > 5) return null

  return (
    <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
      <span className="text-amber-500">⚡</span>
      <p className="text-xs font-semibold text-amber-700">
        لم يتبق إلا <span className="text-amber-600">{inStockCount}</span> قطعة — اطلبي الآن!
      </p>
    </div>
  )
}
