'use client'
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────────
interface OrderItem {
  productName?: string; colorAr?: string; size?: string
  quantity?: number; unitPrice?: number; price?: number
  product?: { id?: string; nameAr?: string; category?: Array<{ id?: string; nameAr?: string; name?: string }> }
}
interface Order {
  id: string; status: string; createdAt: string; total?: number
  items?: OrderItem[]
}

type Tab    = 'overview' | 'products' | 'categories' | 'variants'
type Period = '7d' | '30d' | '90d' | 'month' | 'all'

const PERIODS: { value: Period; label: string; days: number }[] = [
  { value: '7d',    label: '7 jours',        days: 7  },
  { value: '30d',   label: '30 jours',       days: 30 },
  { value: '90d',   label: '90 jours',       days: 90 },
  { value: 'month', label: 'Ce mois',        days: 0  },
  { value: 'all',   label: 'Depuis le début',days: 0  },
]
const STATUS_LABEL: Record<string, string>              = { new:'Nouvelle', pending:'En attente', in_progress:'En cours', confirmed:'Confirmée', shipping:'En livraison', delivered:'Livrée', failed:'Échouée', cancelled:'Annulée' }
const STATUS_COLOR: Record<string, { c: string; bg: string }> = {
  new:        { c:'#B45309', bg:'#FEF3C7' },
  pending:    { c:'#92400E', bg:'#FEF9C3' },
  in_progress:{ c:'#1E40AF', bg:'#DBEAFE' },
  confirmed:  { c:'#1D4ED8', bg:'#EFF6FF' },
  shipping:   { c:'#7C3AED', bg:'#EDE9FE' },
  delivered:  { c:'#065F46', bg:'#D1FAE5' },
  failed:     { c:'#991B1B', bg:'#FEE2E2' },
  cancelled:  { c:'#6D7175', bg:'#F1F1F1' },
}
const PAID_STATUSES = ['confirmed','shipping','delivered']

// ── Formatage ──────────────────────────────────────────────────────────────────
const fmt  = (n: number) => new Intl.NumberFormat('fr-DZ').format(Math.round(n)) + ' DA'
const fmtK = (n: number) => n >= 1_000_000 ? (n/1_000_000).toFixed(1)+'M DA' : n >= 1_000 ? (n/1_000).toFixed(0)+'k DA' : fmt(n)
const fmtPct = (n: number, d: number) => d === 0 ? '0%' : Math.round((n/d)*100) + '%'

// ── Calcul de la date de début ─────────────────────────────────────────────────
function getFrom(period: Period): Date | null {
  const now = new Date()
  if (period === 'all') return null
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  const p = PERIODS.find(p => p.value === period)!
  return new Date(now.getTime() - p.days * 86400000)
}

// ── SVG Area/Bar Chart ─────────────────────────────────────────────────────────
function AreaChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const W = 900, H = 140, PL = 60, PR = 16, PT = 12, PB = 28
  if (!data.length) return <div style={{ height: H, display:'flex', alignItems:'center', justifyContent:'center', color:'#9A9A9A', fontSize:13 }}>Pas de données</div>
  const vals = data.map(d => d.value)
  const maxV = Math.max(...vals, 1)
  const toX = (i: number) => PL + (i/(data.length-1||1)) * (W-PL-PR)
  const toY = (v: number) => PT + ((maxV-v)/maxV) * (H-PT-PB)
  const pts = data.map((d,i) => ({ x: toX(i), y: toY(d.value) }))
  let path = `M ${pts[0].x} ${pts[0].y}`
  for (let i=1; i<pts.length; i++) {
    const cx = (pts[i-1].x + pts[i].x)/2
    path += ` C ${cx} ${pts[i-1].y} ${cx} ${pts[i].y} ${pts[i].x} ${pts[i].y}`
  }
  const area = `${path} L ${pts[pts.length-1].x} ${H-PB} L ${pts[0].x} ${H-PB} Z`
  const gId  = `g${color.replace('#','')}`
  const ySteps = [0, 0.5, 1].map(t => ({ val: maxV*t, y: toY(maxV*t) })).reverse()
  const step = Math.max(1, Math.floor(data.length / 7))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:H, display:'block', overflow:'visible' }}>
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.01"/>
        </linearGradient>
      </defs>
      {ySteps.map((s,i) => (
        <g key={i}>
          <line x1={PL} y1={s.y} x2={W-PR} y2={s.y} stroke="#F1F1F1" strokeWidth="1"/>
          <text x={PL-8} y={s.y+4} textAnchor="end" fontSize="10" fill="#B0B0B0">{fmtK(s.val).replace(' DA','')}</text>
        </g>
      ))}
      <path d={area} fill={`url(#${gId})`}/>
      <path d={path}  fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {data.map((d,i) => {
        if (data.length > 14 && i % step !== 0 && i !== data.length-1) return null
        return (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(d.value)} r={3} fill="#fff" stroke={color} strokeWidth="2"/>
            <text x={toX(i)} y={H-6} textAnchor="middle" fontSize="9" fill="#B0B0B0">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Mini Bar (horizontal) ──────────────────────────────────────────────────────
function HBar({ value, max, color='#E93D91' }: { value:number; max:number; color?:string }) {
  const pct = max === 0 ? 0 : Math.round((value/max)*100)
  return (
    <div style={{ height:6, background:'#F1F1F1', borderRadius:3, overflow:'hidden', width:'100%' }}>
      <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3, transition:'width 0.5s' }}/>
    </div>
  )
}

// ── KPI Card ───────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, icon, color='#1A1A1A' }: { label:string; value:string; sub?:string; icon:string; color?:string }) {
  return (
    <div className="admin-card" style={{ padding:'18px 20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <span style={{ fontSize:11, fontWeight:500, color:'#6D7175', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>
        <span style={{ fontSize:20 }}>{icon}</span>
      </div>
      <div style={{ fontSize:26, fontWeight:800, color, lineHeight:1.1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#9A9A9A', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

// ── Section card ───────────────────────────────────────────────────────────────
function Card({ title, action, children }: { title:string; action?:React.ReactNode; children:React.ReactNode }) {
  return (
    <div className="admin-card" style={{ overflow:'hidden', marginBottom:16 }}>
      <div style={{ padding:'14px 20px', borderBottom:'1px solid #F1F1F1', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontWeight:700, fontSize:14, color:'#1A1A1A' }}>{title}</span>
        {action}
      </div>
      <div style={{ padding:'16px 20px' }}>{children}</div>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [tab,     setTab]     = useState<Tab>('overview')
  const [period,  setPeriod]  = useState<Period>('30d')
  const [orders,  setOrders]  = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [sortProd, setSortProd] = useState<'ca'|'qty'|'orders'>('ca')
  const [sortCat,  setSortCat]  = useState<'ca'|'qty'>('ca')
  const [colorFil, setColorFil] = useState('')
  const [sizeFil,  setSizeFil]  = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const from = getFrom(period)
      const whereObj = from ? { createdAt: { greater_than: from.toISOString() } } : {}
      const url = `/api/boutique-admin/orders?limit=1000&depth=2&sort=-createdAt&where=${encodeURIComponent(JSON.stringify(whereObj))}`
      const data = await fetch(url).then(r => r.json())
      setOrders(data.docs ?? [])
    } catch { setOrders([]) }
    finally { setLoading(false) }
  }, [period])

  useEffect(() => { load() }, [load])

  // ── Métriques globales ────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const paid = orders.filter(o => PAID_STATUSES.includes(o.status))
    const ca   = paid.reduce((s,o) => s + (o.total ?? 0), 0)
    const avgOrder = paid.length ? ca / paid.length : 0
    const statusCounts: Record<string,number> = {}
    orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status]??0)+1 })
    const deliveryRate = orders.length ? Math.round((statusCounts['delivered']??0)/orders.length*100) : 0
    const confirmRate  = orders.length ? Math.round(((statusCounts['confirmed']??0)+(statusCounts['shipping']??0)+(statusCounts['delivered']??0))/orders.length*100) : 0
    return { ca, avgOrder, totalOrders:orders.length, paidOrders:paid.length, statusCounts, deliveryRate, confirmRate }
  }, [orders])

  // ── Données chronologiques (CA par jour) ──────────────────────────────────────
  const chartData = useMemo(() => {
    const from = getFrom(period)
    const now  = new Date()
    const start = from ?? new Date(orders.reduce((min,o) => Math.min(min, new Date(o.createdAt).getTime()), now.getTime()))
    const diffDays = Math.ceil((now.getTime() - start.getTime()) / 86400000) + 1
    const buckets: Record<string,number> = {}
    for (let i=0; i<diffDays; i++) {
      const d = new Date(start); d.setDate(d.getDate()+i)
      const key = d.toISOString().slice(0,10)
      buckets[key] = 0
    }
    orders.filter(o => PAID_STATUSES.includes(o.status)).forEach(o => {
      const key = o.createdAt.slice(0,10)
      if (key in buckets) buckets[key] += o.total ?? 0
    })
    const entries = Object.entries(buckets).sort()
    // Grouper par semaine si > 60 jours
    if (entries.length > 60) {
      const weeks: Record<string,number> = {}
      entries.forEach(([date,val]) => {
        const d = new Date(date); const wn = `S${Math.ceil(d.getDate()/7)} ${d.toLocaleDateString('fr-FR',{month:'short'})}`
        weeks[wn] = (weeks[wn]??0) + val
      })
      return Object.entries(weeks).map(([label,value]) => ({ label, value }))
    }
    return entries.map(([date,value]) => {
      const d = new Date(date)
      const label = diffDays <= 14
        ? d.toLocaleDateString('fr-FR',{weekday:'short',day:'numeric'})
        : d.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})
      return { label, value }
    })
  }, [orders, period])

  // ── Agrégation PAR PRODUIT ─────────────────────────────────────────────────────
  const productData = useMemo(() => {
    const map: Record<string,{ name:string; ca:number; qty:number; orders:Set<string>; statusCounts:Record<string,number>; colors:Set<string>; sizes:Set<string> }> = {}
    orders.forEach(o => {
      ;(o.items??[]).forEach(item => {
        const name = item.productName ?? (item.product?.nameAr) ?? '—'
        if (!map[name]) map[name] = { name, ca:0, qty:0, orders:new Set(), statusCounts:{}, colors:new Set(), sizes:new Set() }
        const qty = item.quantity??1
        const price = item.unitPrice??item.price??0
        map[name].ca  += price*qty
        map[name].qty += qty
        map[name].orders.add(o.id)
        map[name].statusCounts[o.status] = (map[name].statusCounts[o.status]??0)+qty
        if (item.colorAr && item.colorAr !== '—') map[name].colors.add(item.colorAr)
        if (item.size    && item.size !== '—')    map[name].sizes.add(item.size)
      })
    })
    return Object.values(map)
      .map(r => ({ ...r, ordersCount: r.orders.size, colors: Array.from(r.colors), sizes: Array.from(r.sizes) }))
      .sort((a,b) => sortProd==='qty' ? b.qty-a.qty : sortProd==='orders' ? b.ordersCount-a.ordersCount : b.ca-a.ca)
  }, [orders, sortProd])

  // ── Agrégation PAR CATÉGORIE ───────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const map: Record<string,{ name:string; ca:number; qty:number; products:Set<string> }> = {}
    orders.forEach(o => {
      ;(o.items??[]).forEach(item => {
        const cats = item.product?.category
        const catName = (cats && cats.length > 0) ? (cats[0].nameAr ?? cats[0].name ?? 'Sans catégorie') : 'Sans catégorie'
        if (!map[catName]) map[catName] = { name:catName, ca:0, qty:0, products:new Set() }
        const qty = item.quantity??1
        const price = item.unitPrice??item.price??0
        map[catName].ca  += price*qty
        map[catName].qty += qty
        map[catName].products.add(item.productName??'')
      })
    })
    return Object.values(map)
      .map(r => ({ ...r, productsCount: r.products.size }))
      .sort((a,b) => sortCat==='qty' ? b.qty-a.qty : b.ca-a.ca)
  }, [orders, sortCat])

  // ── Agrégation PAR VARIATION (couleur × taille) ────────────────────────────────
  const variantData = useMemo(() => {
    const map: Record<string,{ productName:string; colorAr:string; size:string; ca:number; qty:number; statusCounts:Record<string,number> }> = {}
    orders.forEach(o => {
      ;(o.items??[]).forEach(item => {
        const name  = item.productName ?? '—'
        const color = item.colorAr ?? '—'
        const size  = item.size ?? '—'
        const key   = `${name}||${color}||${size}`
        if (!map[key]) map[key] = { productName:name, colorAr:color, size, ca:0, qty:0, statusCounts:{} }
        const qty   = item.quantity??1
        const price = item.unitPrice??item.price??0
        map[key].ca  += price*qty
        map[key].qty += qty
        map[key].statusCounts[o.status] = (map[key].statusCounts[o.status]??0)+qty
      })
    })
    const rows = Object.values(map).sort((a,b) => b.qty-a.qty)
    const colors = Array.from(new Set(rows.map(r => r.colorAr).filter(c => c !== '—'))).sort()
    const sizes  = Array.from(new Set(rows.map(r => r.size).filter(s => s !== '—'))).sort()
    const filtered = rows.filter(r => {
      if (search   && !r.productName.toLowerCase().includes(search.toLowerCase()) && !r.colorAr.toLowerCase().includes(search.toLowerCase())) return false
      if (colorFil && r.colorAr !== colorFil) return false
      if (sizeFil  && r.size    !== sizeFil)  return false
      return true
    })
    return { rows: filtered, colors, sizes }
  }, [orders, search, colorFil, sizeFil])

  const maxProductCA = productData[0]?.ca ?? 1
  const maxCatCA     = categoryData[0]?.ca ?? 1

  const periodLabel = PERIODS.find(p => p.value === period)?.label ?? ''

  return (
    <div style={{ maxWidth:1300, animation:'fadeIn 0.25s ease' }}>

      {/* ── En-tête ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#1A1A1A', margin:0 }}>Analytics</h1>
          <p style={{ fontSize:13, color:'#6D7175', margin:'4px 0 0' }}>Tableau de bord détaillé — ventes, produits, catégories</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <Link href="/boutique-admin/orders" className="admin-btn admin-btn-secondary" style={{ textDecoration:'none', display:'inline-flex', padding:'8px 14px', fontSize:12 }}>
            ← Commandes
          </Link>
          {/* Période */}
          <div style={{ display:'flex', gap:3, background:'#F5F5F5', borderRadius:8, padding:3 }}>
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)} style={{
                padding:'6px 12px', borderRadius:6, fontSize:12, fontWeight:period===p.value?700:500,
                background:period===p.value?'#fff':'transparent', color:period===p.value?'#1A1A1A':'#6D7175',
                border:'none', cursor:'pointer', boxShadow:period===p.value?'0 1px 3px rgba(0,0,0,0.1)':'none', whiteSpace:'nowrap',
              }}>{p.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:2, borderBottom:'2px solid #F1F1F1', marginBottom:24 }}>
        {([
          { id:'overview',   label:'📊 Vue d\'ensemble' },
          { id:'products',   label:'📦 Par produit'     },
          { id:'categories', label:'🗂️ Par catégorie'   },
          { id:'variants',   label:'🎨 Par variation'   },
        ] as { id:Tab; label:string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:'10px 18px', border:'none', cursor:'pointer', fontSize:13,
            fontWeight:tab===t.id?700:500, color:tab===t.id?'#E93D91':'#6D7175',
            background:'transparent', borderBottom:tab===t.id?'2px solid #E93D91':'2px solid transparent',
            marginBottom:-2, transition:'color 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300, gap:12 }}>
          <div style={{ width:32, height:32, border:'3px solid #E3E5E7', borderTopColor:'#E93D91', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
          <span style={{ fontSize:14, color:'#9A9A9A' }}>Chargement des données pour {periodLabel}…</span>
        </div>
      ) : (
        <>
          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* TAB 1 — VUE D'ENSEMBLE                                              */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          {tab === 'overview' && (
            <div>
              {/* KPI cards */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
                <KPI label="Chiffre d'affaires" value={fmtK(metrics.ca)}       sub={`${metrics.paidOrders} commandes payées`}       icon="💰" color="#007A5C"/>
                <KPI label="Commandes totales"  value={String(metrics.totalOrders)} sub={`${periodLabel}`}                             icon="📦"/>
                <KPI label="Panier moyen"       value={fmtK(metrics.avgOrder)}  sub="commandes confirmées/livrées"                   icon="🛒"/>
                <KPI label="Taux livraison"     value={`${metrics.deliveryRate}%`} sub={`Confirmation : ${metrics.confirmRate}%`}   icon="🚀" color="#7C3AED"/>
              </div>

              {/* Graphique CA */}
              <Card title={`📈 Évolution du CA — ${periodLabel}`}>
                <AreaChart data={chartData} color="#E93D91"/>
              </Card>

              {/* Répartition statuts + Top produits */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1.6fr', gap:16, marginBottom:16 }}>

                {/* Statuts */}
                <Card title="🏷️ Répartition par statut">
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {Object.entries(metrics.statusCounts)
                      .sort(([,a],[,b]) => b-a)
                      .map(([st, count]) => {
                        const s = STATUS_COLOR[st] ?? { c:'#6D7175', bg:'#F1F1F1' }
                        return (
                          <div key={st} style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <span className="admin-badge" style={{ background:s.bg, color:s.c, minWidth:100, textAlign:'center' }}>
                              {STATUS_LABEL[st] ?? st}
                            </span>
                            <div style={{ flex:1 }}>
                              <HBar value={count} max={metrics.totalOrders} color={s.c}/>
                            </div>
                            <span style={{ fontSize:13, fontWeight:700, color:'#1A1A1A', minWidth:24, textAlign:'right' }}>{count}</span>
                            <span style={{ fontSize:11, color:'#9A9A9A', minWidth:34, textAlign:'right' }}>{fmtPct(count,metrics.totalOrders)}</span>
                          </div>
                        )
                    })}
                    {metrics.totalOrders === 0 && <p style={{ color:'#9A9A9A', fontSize:13, textAlign:'center', padding:'20px 0' }}>Aucune commande sur cette période</p>}
                  </div>
                </Card>

                {/* Top produits */}
                <Card title="🏆 Top 5 produits du mois (par CA)" action={<button onClick={() => setTab('products')} style={{ fontSize:11, color:'#E93D91', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Voir tout →</button>}>
                  {productData.slice(0,5).length === 0
                    ? <p style={{ color:'#9A9A9A', fontSize:13, textAlign:'center', padding:'20px 0' }}>Pas de données</p>
                    : productData.slice(0,5).map((p,i) => (
                      <div key={p.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom: i<4 ? '1px solid #F7F7F7' : 'none' }}>
                        <div style={{ width:28, height:28, borderRadius:7, flexShrink:0, background:i===0?'#FEF3C7':i===1?'#F3F4F6':i===2?'#FEF9C3':'#F9FAFB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
                          {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'#1A1A1A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                          <div style={{ display:'flex', gap:8, marginTop:4 }}>
                            <HBar value={p.ca} max={maxProductCA} color="#E93D91"/>
                          </div>
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'#007A5C' }}>{fmtK(p.ca)}</div>
                          <div style={{ fontSize:11, color:'#9A9A9A' }}>{p.qty} unités</div>
                        </div>
                      </div>
                    ))
                  }
                </Card>
              </div>

              {/* Top catégories */}
              <Card title="🗂️ Ventes par catégorie" action={<button onClick={() => setTab('categories')} style={{ fontSize:11, color:'#E93D91', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Voir tout →</button>}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
                  {categoryData.slice(0,8).map(cat => (
                    <div key={cat.name} style={{ background:'#FAFAFA', border:'1px solid #E3E5E7', borderRadius:10, padding:'14px 16px' }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#1A1A1A', marginBottom:8, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cat.name}</div>
                      <HBar value={cat.ca} max={maxCatCA} color="#CEA060"/>
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:12 }}>
                        <span style={{ color:'#9A9A9A' }}>{cat.qty} art.</span>
                        <span style={{ fontWeight:700, color:'#007A5C' }}>{fmtK(cat.ca)}</span>
                      </div>
                    </div>
                  ))}
                  {categoryData.length === 0 && <p style={{ color:'#9A9A9A', fontSize:13, gridColumn:'1/-1', textAlign:'center', padding:'20px 0' }}>Pas de données</p>}
                </div>
              </Card>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* TAB 2 — PAR PRODUIT                                                 */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          {tab === 'products' && (
            <div>
              {/* KPI + tri */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
                <div style={{ display:'flex', gap:10 }}>
                  <span style={{ fontSize:13, color:'#6D7175' }}><strong style={{ color:'#1A1A1A' }}>{productData.length}</strong> produits vendus sur {periodLabel}</span>
                  <span style={{ fontSize:13, color:'#6D7175' }}>CA total: <strong style={{ color:'#007A5C' }}>{fmtK(metrics.ca)}</strong></span>
                </div>
                <div style={{ display:'flex', gap:4, background:'#F5F5F5', borderRadius:8, padding:3 }}>
                  {([{v:'ca',l:'CA'},{v:'qty',l:'Quantité'},{v:'orders',l:'Commandes'}] as {v:typeof sortProd;l:string}[]).map(s => (
                    <button key={s.v} onClick={() => setSortProd(s.v)} style={{
                      padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:sortProd===s.v?700:500,
                      background:sortProd===s.v?'#fff':'transparent', color:sortProd===s.v?'#1A1A1A':'#6D7175',
                      border:'none', cursor:'pointer', boxShadow:sortProd===s.v?'0 1px 3px rgba(0,0,0,0.1)':'none',
                    }}>{s.l}</button>
                  ))}
                </div>
              </div>

              <div className="admin-card" style={{ overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'#FAFAFA', borderBottom:'1px solid #E3E5E7' }}>
                      <th style={TH}>#</th>
                      <th style={TH}>Produit</th>
                      <th style={{ ...TH, textAlign:'center' }}>Commandes</th>
                      <th style={{ ...TH, textAlign:'center' }}>Qté vendue</th>
                      <th style={{ ...TH, textAlign:'right'  }}>CA (DA)</th>
                      <th style={TH}>Couleurs vendues</th>
                      <th style={TH}>Tailles vendues</th>
                      <th style={TH}>Statuts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productData.length === 0 ? (
                      <tr><td colSpan={8} style={{ padding:'48px', textAlign:'center', color:'#9A9A9A' }}>
                        <div style={{ fontSize:36, marginBottom:8 }}>📊</div>
                        Aucun produit vendu sur cette période
                      </td></tr>
                    ) : productData.map((p,i) => (
                      <tr key={p.name} className="admin-row-hover" style={{ borderBottom:'1px solid #F1F1F1' }}>
                        <td style={{ ...TD, color:'#B0B0B0', fontWeight:700, width:36 }}>{i+1}</td>
                        <td style={{ ...TD, maxWidth:220 }}>
                          <div style={{ fontWeight:700, color:'#1A1A1A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                          <div style={{ marginTop:4 }}>
                            <HBar value={p.ca} max={maxProductCA} color="#E93D91"/>
                          </div>
                        </td>
                        <td style={{ ...TD, textAlign:'center' }}>
                          <span style={{ fontSize:16, fontWeight:800, color:'#1D4ED8' }}>{p.ordersCount}</span>
                        </td>
                        <td style={{ ...TD, textAlign:'center' }}>
                          <span style={{ fontSize:16, fontWeight:800, color:'#1A1A1A' }}>{p.qty}</span>
                          <div style={{ fontSize:10, color:'#9A9A9A' }}>unités</div>
                        </td>
                        <td style={{ ...TD, textAlign:'right', fontWeight:800, color:'#007A5C', whiteSpace:'nowrap', fontSize:14 }}>{fmt(p.ca)}</td>
                        <td style={TD}>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                            {p.colors.slice(0,4).map(c => (
                              <span key={c} style={{ background:'#FFF0F8', color:'#E93D91', border:'1px solid #FCE7F3', padding:'1px 7px', borderRadius:20, fontSize:10, fontWeight:600 }}>{c}</span>
                            ))}
                            {p.colors.length > 4 && <span style={{ fontSize:10, color:'#9A9A9A' }}>+{p.colors.length-4}</span>}
                          </div>
                        </td>
                        <td style={TD}>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                            {p.sizes.slice(0,4).map(s => (
                              <span key={s} style={{ background:'#EFF6FF', color:'#1D4ED8', border:'1px solid #DBEAFE', padding:'1px 7px', borderRadius:20, fontSize:10, fontWeight:600 }}>{s}</span>
                            ))}
                            {p.sizes.length > 4 && <span style={{ fontSize:10, color:'#9A9A9A' }}>+{p.sizes.length-4}</span>}
                          </div>
                        </td>
                        <td style={TD}>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                            {Object.entries(p.statusCounts).sort(([,a],[,b])=>b-a).map(([st,n]) => {
                              const s = STATUS_COLOR[st] ?? { c:'#6D7175', bg:'#F1F1F1' }
                              return <span key={st} className="admin-badge" style={{ background:s.bg, color:s.c, fontSize:10, padding:'1px 6px' }}>{STATUS_LABEL[st]??st} ×{n}</span>
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {productData.length > 0 && (
                  <div style={{ padding:'12px 20px', borderTop:'1px solid #E3E5E7', background:'#FAFAFA', display:'flex', justifyContent:'flex-end', gap:24, fontSize:13 }}>
                    <span style={{ color:'#6D7175' }}><strong style={{ color:'#1A1A1A' }}>{productData.length}</strong> produits</span>
                    <span style={{ color:'#6D7175' }}><strong style={{ color:'#1A1A1A' }}>{productData.reduce((s,p)=>s+p.qty,0)}</strong> unités</span>
                    <span style={{ fontWeight:700, color:'#007A5C' }}>{fmt(metrics.ca)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* TAB 3 — PAR CATÉGORIE                                               */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          {tab === 'categories' && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
                <span style={{ fontSize:13, color:'#6D7175' }}><strong style={{ color:'#1A1A1A' }}>{categoryData.length}</strong> catégories — {periodLabel}</span>
                <div style={{ display:'flex', gap:4, background:'#F5F5F5', borderRadius:8, padding:3 }}>
                  {([{v:'ca',l:'CA'},{v:'qty',l:'Quantité'}] as {v:typeof sortCat;l:string}[]).map(s => (
                    <button key={s.v} onClick={() => setSortCat(s.v)} style={{
                      padding:'5px 12px', borderRadius:6, fontSize:12, fontWeight:sortCat===s.v?700:500,
                      background:sortCat===s.v?'#fff':'transparent', color:sortCat===s.v?'#1A1A1A':'#6D7175',
                      border:'none', cursor:'pointer', boxShadow:sortCat===s.v?'0 1px 3px rgba(0,0,0,0.1)':'none',
                    }}>{s.l}</button>
                  ))}
                </div>
              </div>

              <div className="admin-card" style={{ overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'#FAFAFA', borderBottom:'1px solid #E3E5E7' }}>
                      <th style={TH}>#</th>
                      <th style={TH}>Catégorie</th>
                      <th style={{ ...TH, textAlign:'center' }}>Produits vendus</th>
                      <th style={{ ...TH, textAlign:'center' }}>Unités vendues</th>
                      <th style={{ ...TH, textAlign:'right'  }}>CA (DA)</th>
                      <th style={TH}>Part du CA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.length === 0 ? (
                      <tr><td colSpan={6} style={{ padding:'48px', textAlign:'center', color:'#9A9A9A' }}>
                        <div style={{ fontSize:36, marginBottom:8 }}>🗂️</div>
                        Aucune donnée de catégorie
                      </td></tr>
                    ) : categoryData.map((cat,i) => (
                      <tr key={cat.name} className="admin-row-hover" style={{ borderBottom:'1px solid #F1F1F1' }}>
                        <td style={{ ...TD, color:'#B0B0B0', fontWeight:700, width:36 }}>{i+1}</td>
                        <td style={{ ...TD, fontWeight:700, color:'#1A1A1A', maxWidth:200 }}>
                          <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cat.name}</div>
                        </td>
                        <td style={{ ...TD, textAlign:'center' }}>
                          <span style={{ fontSize:15, fontWeight:700, color:'#7C3AED' }}>{cat.productsCount}</span>
                        </td>
                        <td style={{ ...TD, textAlign:'center' }}>
                          <span style={{ fontSize:15, fontWeight:700, color:'#1A1A1A' }}>{cat.qty}</span>
                        </td>
                        <td style={{ ...TD, textAlign:'right', fontWeight:800, color:'#007A5C', fontSize:14, whiteSpace:'nowrap' }}>{fmt(cat.ca)}</td>
                        <td style={{ ...TD, minWidth:160 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1 }}><HBar value={cat.ca} max={maxCatCA} color="#CEA060"/></div>
                            <span style={{ fontSize:12, fontWeight:700, color:'#B45309', minWidth:36 }}>{fmtPct(cat.ca, metrics.ca)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* TAB 4 — PAR VARIATION (couleur × taille)                            */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          {tab === 'variants' && (
            <div>
              {/* Filtres */}
              <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:220, position:'relative' }}>
                  <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#9A9A9A', fontSize:14, pointerEvents:'none' }}>🔍</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un produit ou une couleur…" className="admin-input" style={{ paddingLeft:36 }}/>
                </div>
                <select value={colorFil} onChange={e => setColorFil(e.target.value)} className="admin-select" style={{ minWidth:160 }}>
                  <option value="">🎨 Toutes les couleurs</option>
                  {variantData.colors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={sizeFil} onChange={e => setSizeFil(e.target.value)} className="admin-select" style={{ minWidth:140 }}>
                  <option value="">📐 Toutes les tailles</option>
                  {variantData.sizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {(colorFil||sizeFil||search) && (
                  <button onClick={() => { setColorFil(''); setSizeFil(''); setSearch('') }} style={{ padding:'8px 12px', borderRadius:8, fontSize:12, fontWeight:600, border:'1px solid #FCA5A5', background:'#FEE2E2', color:'#991B1B', cursor:'pointer' }}>✕ Effacer</button>
                )}
              </div>

              <div className="admin-card" style={{ overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'#FAFAFA', borderBottom:'1px solid #E3E5E7' }}>
                      <th style={TH}>#</th>
                      <th style={TH}>Produit</th>
                      <th style={TH}>Couleur</th>
                      <th style={TH}>Taille</th>
                      <th style={{ ...TH, textAlign:'center' }}>Qté vendue</th>
                      <th style={{ ...TH, textAlign:'right'  }}>CA</th>
                      <th style={TH}>Statuts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variantData.rows.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding:'48px', textAlign:'center', color:'#9A9A9A' }}>
                        <div style={{ fontSize:36, marginBottom:8 }}>🎨</div>
                        Aucun résultat — essayez d&apos;autres filtres
                      </td></tr>
                    ) : variantData.rows.map((row,i) => (
                      <tr key={`${row.productName}-${row.colorAr}-${row.size}`} className="admin-row-hover" style={{ borderBottom:'1px solid #F1F1F1' }}>
                        <td style={{ ...TD, color:'#B0B0B0', fontWeight:700, width:36 }}>{i+1}</td>
                        <td style={{ ...TD, maxWidth:200 }}>
                          <div style={{ fontWeight:600, color:'#1A1A1A', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.productName}</div>
                        </td>
                        <td style={TD}>
                          {row.colorAr !== '—'
                            ? <span style={{ background:'#FFF0F8', color:'#E93D91', border:'1px solid #FCE7F3', padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>🎨 {row.colorAr}</span>
                            : <span style={{ color:'#C0C0C0', fontSize:12 }}>—</span>}
                        </td>
                        <td style={TD}>
                          {row.size !== '—'
                            ? <span style={{ background:'#EFF6FF', color:'#1D4ED8', border:'1px solid #DBEAFE', padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600 }}>📐 {row.size}</span>
                            : <span style={{ color:'#C0C0C0', fontSize:12 }}>—</span>}
                        </td>
                        <td style={{ ...TD, textAlign:'center' }}>
                          <span style={{ fontSize:16, fontWeight:800, color:'#1A1A1A' }}>{row.qty}</span>
                        </td>
                        <td style={{ ...TD, textAlign:'right', fontWeight:700, color:'#007A5C', whiteSpace:'nowrap' }}>{fmt(row.ca)}</td>
                        <td style={TD}>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                            {Object.entries(row.statusCounts).sort(([,a],[,b])=>b-a).map(([st,n]) => {
                              const s = STATUS_COLOR[st] ?? { c:'#6D7175', bg:'#F1F1F1' }
                              return <span key={st} className="admin-badge" style={{ background:s.bg, color:s.c, fontSize:10, padding:'1px 6px' }}>{STATUS_LABEL[st]??st} ×{n}</span>
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {variantData.rows.length > 0 && (
                  <div style={{ padding:'12px 20px', borderTop:'1px solid #E3E5E7', background:'#FAFAFA', display:'flex', justifyContent:'flex-end', gap:24, fontSize:13 }}>
                    <span style={{ color:'#6D7175' }}><strong style={{ color:'#1A1A1A' }}>{variantData.rows.length}</strong> variations</span>
                    <span style={{ color:'#6D7175' }}><strong style={{ color:'#1A1A1A' }}>{variantData.rows.reduce((s,r)=>s+r.qty,0)}</strong> unités</span>
                    <span style={{ fontWeight:700, color:'#007A5C' }}>{fmt(variantData.rows.reduce((s,r)=>s+r.ca,0))}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const TH: React.CSSProperties = { padding:'10px 16px', textAlign:'left', fontWeight:600, fontSize:10, color:'#9A9A9A', textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap' }
const TD: React.CSSProperties = { padding:'12px 16px', verticalAlign:'middle' }
