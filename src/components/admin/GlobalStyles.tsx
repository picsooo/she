'use client'
/**
 * She's Fit & Beauty — Admin Design System
 * Transformation complète du design Payload → interface premium niveau Shopify/Linear
 */
import React, { useEffect } from 'react'

const GlobalStyles: React.FC = () => {
  useEffect(() => {
    if (document.getElementById('she-admin-styles')) return

    // ── Police Inter (moderne, lisible, pro) ─────────────────────────
    const font = document.createElement('link')
    font.rel = 'stylesheet'
    font.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
    document.head.appendChild(font)

    const style = document.createElement('style')
    style.id = 'she-admin-styles'
    style.textContent = `

/* ══════════════════════════════════════════════════════════════════════
   RESET GLOBAL & FONT
══════════════════════════════════════════════════════════════════════ */
*, *::before, *::after { font-family: 'Inter', system-ui, sans-serif !important; }

:root, [data-theme="light"] {
  --she-pink:         #E93D91;
  --she-pink-dark:    #C4197A;
  --she-pink-light:   #FFF0F7;
  --she-gold:         #CEA060;
  --she-nav-bg:       #0F0A1A;
  --she-nav-accent:   rgba(233,61,145,0.18);
  --she-radius-sm:    8px;
  --she-radius:       12px;
  --she-radius-lg:    16px;
  --she-shadow-sm:    0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --she-shadow:       0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
  --she-shadow-pink:  0 4px 16px rgba(233,61,145,0.25);
}

/* ══════════════════════════════════════════════════════════════════════
   LAYOUT PRINCIPAL
══════════════════════════════════════════════════════════════════════ */
body, html {
  background: #F4F2F7 !important;
}

/* ══════════════════════════════════════════════════════════════════════
   SIDEBAR — NOIR PROFOND AVEC ACCENTS ROSES
══════════════════════════════════════════════════════════════════════ */
.nav {
  background: var(--she-nav-bg) !important;
  border-right: none !important;
  border-left: none !important;
  box-shadow: 2px 0 20px rgba(0,0,0,0.25) !important;
}

/* Marque dans le bas de la nav */
.nav::after {
  content: "SHE'S FIT & BEAUTY";
  display: block;
  position: absolute;
  bottom: 16px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 9px;
  letter-spacing: 0.18em;
  color: rgba(255,255,255,0.15);
  font-weight: 700;
}

/* Groupes nav */
.nav-group { margin-bottom: 4px !important; }

.nav-group__label,
.nav-group__toggle-label {
  color: rgba(255,255,255,0.25) !important;
  font-size: 9.5px !important;
  letter-spacing: 0.14em !important;
  text-transform: uppercase !important;
  font-weight: 700 !important;
  padding: 12px 20px 4px !important;
}

/* Liens nav */
.nav__link {
  color: rgba(255,255,255,0.65) !important;
  border-radius: 10px !important;
  margin: 1px 10px !important;
  padding: 8px 12px !important;
  font-size: 13.5px !important;
  font-weight: 500 !important;
  transition: background .15s, color .15s, transform .1s !important;
  position: relative !important;
}

.nav__link:hover {
  background: rgba(255,255,255,0.07) !important;
  color: rgba(255,255,255,0.92) !important;
}

.nav__link.active,
.nav__link--active {
  background: var(--she-nav-accent) !important;
  color: #fff !important;
  font-weight: 600 !important;
  box-shadow: inset 2px 0 0 var(--she-pink) !important;
}

.nav__link.active::before,
.nav__link--active::before {
  content: '';
  position: absolute;
  left: 0; top: 4px; bottom: 4px;
  width: 3px;
  background: var(--she-pink);
  border-radius: 0 3px 3px 0;
}

/* Icônes nav */
.nav__link svg { opacity: 0.7 !important; transition: opacity .15s !important; }
.nav__link:hover svg,
.nav__link.active svg { opacity: 1 !important; color: var(--she-pink) !important; }

/* ══════════════════════════════════════════════════════════════════════
   APP HEADER — BLANC GLASSMORPHISM
══════════════════════════════════════════════════════════════════════ */
.app-header,
.app-header__wrapper {
  background: rgba(255,255,255,0.95) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border-bottom: 1px solid rgba(233,61,145,0.1) !important;
  box-shadow: 0 1px 0 rgba(0,0,0,0.04) !important;
}

.app-header__bg { opacity: 0 !important; }

/* Breadcrumb */
.step-nav__link,
.app-header__step-nav-wrapper a { color: #9CA3AF !important; font-size: 13px !important; }
.step-nav__link:hover { color: var(--she-pink) !important; }
.step-nav__separator { color: #D1D5DB !important; }

/* ══════════════════════════════════════════════════════════════════════
   ZONE DE CONTENU PRINCIPALE
══════════════════════════════════════════════════════════════════════ */
.template-default,
.template-list,
.template-global,
.template-document,
.gutter,
.gutter--left,
.gutter--right {
  background: transparent !important;
}

/* ══════════════════════════════════════════════════════════════════════
   COLLECTION LIST — TABLEAU MODERNE (style Shopify)
══════════════════════════════════════════════════════════════════════ */
.collection-list__wrap {
  background: #fff !important;
  border-radius: var(--she-radius-lg) !important;
  box-shadow: var(--she-shadow) !important;
  border: 1px solid rgba(0,0,0,0.06) !important;
  overflow: hidden !important;
  margin-top: 8px !important;
}

/* En-tête table (colonne headers) */
.table thead tr th,
.sort-column__wrap,
[class*="__header-row"] th {
  background: #FAFAFA !important;
  color: #6B7280 !important;
  font-size: 11.5px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.07em !important;
  padding: 13px 16px !important;
  border-bottom: 1px solid #F3F4F6 !important;
  white-space: nowrap !important;
}

/* Lignes tableau */
.table tbody tr,
.draggable-table-row {
  transition: background .1s !important;
  border-bottom: 1px solid #F9FAFB !important;
}

.table tbody tr:hover,
.draggable-table-row:hover {
  background: #FFF5FA !important;
}

.table tbody tr td,
.draggable-table-row td,
.draggable-table-row__cell-content {
  padding: 13px 16px !important;
  font-size: 13.5px !important;
  color: #374151 !important;
  border-bottom: 1px solid #F3F4F6 !important;
  vertical-align: middle !important;
}

/* First cell / titre produit */
.default-cell__first-cell a,
.table td:nth-child(2) a,
.cell-wrap td:first-of-type a {
  font-weight: 600 !important;
  color: #111827 !important;
}

.table td a { color: #374151 !important; text-decoration: none !important; transition: color .12s !important; }
.table td a:hover { color: var(--she-pink) !important; }

/* ══════════════════════════════════════════════════════════════════════
   BARRE DE CONTRÔLES LIST (recherche + filtres + boutons)
══════════════════════════════════════════════════════════════════════ */
.list-controls {
  background: #fff !important;
  border-radius: var(--she-radius-lg) var(--she-radius-lg) 0 0 !important;
  padding: 16px 20px !important;
  border-bottom: 1px solid #F3F4F6 !important;
}

.list-controls__search-input-wrap input,
.collection-list__search-input input,
.search-filter input {
  border-radius: var(--she-radius-sm) !important;
  border: 1.5px solid #E5E7EB !important;
  background: #F9FAFB !important;
  padding: 9px 14px 9px 38px !important;
  font-size: 13.5px !important;
  font-weight: 400 !important;
  transition: border-color .15s, box-shadow .15s, background .15s !important;
  color: #111827 !important;
}

.list-controls__search-input-wrap input:focus,
.search-filter input:focus {
  border-color: var(--she-pink) !important;
  background: #fff !important;
  box-shadow: 0 0 0 3px rgba(233,61,145,0.10) !important;
  outline: none !important;
}

/* ══════════════════════════════════════════════════════════════════════
   BOUTONS — NIVEAU PRO
══════════════════════════════════════════════════════════════════════ */

/* Bouton primaire */
.btn--style-pill.btn--theme-default,
.btn--style-pill.btn--size-medium.btn--theme-default,
button[type="submit"].btn--style-pill {
  background: linear-gradient(135deg, var(--she-pink), #C4197A) !important;
  border: none !important;
  color: #fff !important;
  border-radius: 10px !important;
  font-weight: 600 !important;
  font-size: 13.5px !important;
  letter-spacing: 0.01em !important;
  box-shadow: 0 2px 8px rgba(233,61,145,0.3) !important;
  transition: all .2s !important;
}

.btn--style-pill.btn--theme-default:hover,
button[type="submit"].btn--style-pill:hover {
  background: linear-gradient(135deg, #D32D80, #B0125C) !important;
  box-shadow: 0 4px 16px rgba(233,61,145,0.4) !important;
  transform: translateY(-1px) !important;
}

.btn--style-pill.btn--theme-default:active,
button[type="submit"].btn--style-pill:active {
  transform: translateY(0) !important;
  box-shadow: 0 1px 4px rgba(233,61,145,0.2) !important;
}

/* Bouton secondaire */
.btn--style-pill.btn--theme-secondary,
.btn--style-pill.btn--theme-transparent,
.btn--style-pill.btn--size-small {
  background: #fff !important;
  border: 1.5px solid #E5E7EB !important;
  color: #374151 !important;
  border-radius: 10px !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  transition: all .15s !important;
  box-shadow: var(--she-shadow-sm) !important;
}

.btn--style-pill.btn--theme-secondary:hover,
.btn--style-pill.btn--size-small:hover {
  border-color: var(--she-pink) !important;
  color: var(--she-pink) !important;
  background: #FFF5FA !important;
}

/* Bouton danger */
.btn--style-pill.btn--theme-error {
  background: linear-gradient(135deg, #EF4444, #DC2626) !important;
  border: none !important;
  color: #fff !important;
  border-radius: 10px !important;
}

/* ══════════════════════════════════════════════════════════════════════
   PAGINATION
══════════════════════════════════════════════════════════════════════ */
.paginator {
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
  padding: 16px 20px !important;
}

.paginator__page {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-width: 34px !important;
  height: 34px !important;
  border-radius: var(--she-radius-sm) !important;
  border: 1.5px solid #E5E7EB !important;
  background: #fff !important;
  color: #374151 !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  transition: all .15s !important;
  cursor: pointer !important;
}

.paginator__page:hover:not(.paginator__page--is-current) {
  border-color: var(--she-pink) !important;
  color: var(--she-pink) !important;
  background: #FFF5FA !important;
}

.paginator__page--is-current {
  background: linear-gradient(135deg, var(--she-pink), #C4197A) !important;
  border-color: transparent !important;
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(233,61,145,0.35) !important;
}

/* ══════════════════════════════════════════════════════════════════════
   FORMULAIRE D'ÉDITION — PAGE PRODUIT / COMMANDE
══════════════════════════════════════════════════════════════════════ */
.template-document,
.collection-edit {
  background: #F4F2F7 !important;
}

/* En-tête du document */
.doc-header {
  background: #fff !important;
  border-radius: var(--she-radius-lg) !important;
  padding: 20px 24px !important;
  margin-bottom: 16px !important;
  box-shadow: var(--she-shadow-sm) !important;
  border: 1px solid rgba(0,0,0,0.05) !important;
}

.doc-header__title h1,
.doc-header h1 {
  font-size: 20px !important;
  font-weight: 700 !important;
  color: #111827 !important;
}

/* Sections de champs */
.collapsible__content,
.group-field__wrap,
.document-fields__main > .field-type:not(.tabs-field) {
  background: #fff !important;
  border-radius: var(--she-radius-lg) !important;
  border: 1px solid rgba(0,0,0,0.06) !important;
  padding: 24px !important;
  margin-bottom: 14px !important;
  box-shadow: var(--she-shadow-sm) !important;
}

.collapsible__header,
.group-field__label-wrap {
  background: #fff !important;
  border-radius: var(--she-radius-lg) var(--she-radius-lg) 0 0 !important;
  padding: 16px 24px 0 !important;
  font-size: 14px !important;
  font-weight: 700 !important;
  color: #111827 !important;
  border-bottom: none !important;
}

/* Sidebar droite (Save panel) */
.document-fields__sidebar-wrap,
.document-fields__sidebar {
  background: transparent !important;
}

.document-fields__sidebar > * {
  background: #fff !important;
  border-radius: var(--she-radius-lg) !important;
  border: 1px solid rgba(0,0,0,0.06) !important;
  padding: 20px !important;
  margin-bottom: 14px !important;
  box-shadow: var(--she-shadow-sm) !important;
}

/* Champs de formulaire */
.field-type.text input,
.field-type.email input,
.field-type.number input,
.field-type.textarea textarea,
input[type="text"],
input[type="email"],
input[type="number"],
input[type="password"],
input[type="search"],
input[type="url"],
textarea {
  border-radius: var(--she-radius-sm) !important;
  border: 1.5px solid #E5E7EB !important;
  background: #F9FAFB !important;
  font-size: 14px !important;
  padding: 10px 14px !important;
  color: #111827 !important;
  transition: border-color .15s, background .15s, box-shadow .15s !important;
}

input:focus,
textarea:focus,
select:focus {
  border-color: var(--she-pink) !important;
  background: #fff !important;
  box-shadow: 0 0 0 3px rgba(233,61,145,0.10) !important;
  outline: none !important;
}

/* Labels */
.field-label,
.field-label__label,
label {
  font-size: 13px !important;
  font-weight: 600 !important;
  color: #374151 !important;
  margin-bottom: 6px !important;
}

/* Select */
.field-type.select .react-select__control,
.rs__control {
  border-radius: var(--she-radius-sm) !important;
  border: 1.5px solid #E5E7EB !important;
  background: #F9FAFB !important;
  min-height: 42px !important;
  font-size: 14px !important;
  transition: border-color .15s !important;
}

.rs__control:hover,
.rs__control--is-focused {
  border-color: var(--she-pink) !important;
  box-shadow: 0 0 0 3px rgba(233,61,145,0.10) !important;
}

/* ══════════════════════════════════════════════════════════════════════
   TABS (dans les formulaires)
══════════════════════════════════════════════════════════════════════ */
.doc-tab__label {
  font-size: 13px !important;
  font-weight: 600 !important;
  color: #6B7280 !important;
  padding: 10px 16px !important;
  border-radius: 8px 8px 0 0 !important;
  transition: color .15s !important;
}

.doc-tab__label:hover { color: var(--she-pink) !important; }
.doc-tab--is-active .doc-tab__label {
  color: var(--she-pink) !important;
  border-bottom: 2px solid var(--she-pink) !important;
}

/* ══════════════════════════════════════════════════════════════════════
   DOC CONTROLS (barre save/status en haut)
══════════════════════════════════════════════════════════════════════ */
.doc-controls {
  background: rgba(255,255,255,0.9) !important;
  backdrop-filter: blur(8px) !important;
  border-bottom: 1px solid rgba(233,61,145,0.08) !important;
}

.doc-controls__value,
.doc-controls__label { font-size: 12.5px !important; }

/* ══════════════════════════════════════════════════════════════════════
   TOASTS / NOTIFICATIONS
══════════════════════════════════════════════════════════════════════ */
.toast {
  border-radius: var(--she-radius) !important;
  box-shadow: var(--she-shadow) !important;
  font-size: 13.5px !important;
  font-weight: 500 !important;
  border-left-width: 4px !important;
  border-left-style: solid !important;
}

.toast--success {
  background: #F0FDF4 !important;
  border-left-color: #16A34A !important;
  color: #166534 !important;
}

.toast--error {
  background: #FFF1F2 !important;
  border-left-color: #DC2626 !important;
  color: #991B1B !important;
}

/* ══════════════════════════════════════════════════════════════════════
   CARDS (dashboard Payload default)
══════════════════════════════════════════════════════════════════════ */
.card {
  background: #fff !important;
  border-radius: var(--she-radius-lg) !important;
  border: 1px solid rgba(0,0,0,0.06) !important;
  box-shadow: var(--she-shadow-sm) !important;
  transition: transform .2s, box-shadow .2s !important;
  overflow: hidden !important;
}

.card:hover {
  transform: translateY(-3px) !important;
  box-shadow: 0 8px 24px rgba(233,61,145,0.12) !important;
}

.card__title { font-weight: 700 !important; color: #111827 !important; font-size: 14px !important; }
.card__label { font-size: 11px !important; color: #6B7280 !important; font-weight: 600 !important; }

.card__titlebar {
  background: linear-gradient(135deg, var(--she-nav-bg), #2D1A35) !important;
}

/* ══════════════════════════════════════════════════════════════════════
   LOGIN PAGE
══════════════════════════════════════════════════════════════════════ */
.login,
.template-login {
  background: linear-gradient(135deg, #0F0A1A 0%, #1A0D2E 50%, #0F0A1A 100%) !important;
}

.login__form-wrapper,
.form-submit {
  background: rgba(255,255,255,0.04) !important;
  backdrop-filter: blur(24px) !important;
  border: 1px solid rgba(255,255,255,0.08) !important;
  border-radius: 20px !important;
  box-shadow: 0 24px 64px rgba(0,0,0,0.4) !important;
}

/* ══════════════════════════════════════════════════════════════════════
   DIVERS — polish final
══════════════════════════════════════════════════════════════════════ */

/* Focus visible */
:focus-visible {
  outline: 2px solid var(--she-pink) !important;
  outline-offset: 2px !important;
}

/* Checkboxes */
input[type="checkbox"]:checked { accent-color: var(--she-pink) !important; }

/* Scrollbar custom */
::-webkit-scrollbar { width: 5px !important; height: 5px !important; }
::-webkit-scrollbar-track { background: transparent !important; }
::-webkit-scrollbar-thumb { background: #D1D5DB !important; border-radius: 10px !important; }
::-webkit-scrollbar-thumb:hover { background: var(--she-pink) !important; }

/* Selection */
::selection { background: rgba(233,61,145,0.18) !important; color: #111827 !important; }

/* Quick actions (dashboard) */
.she-quick-action {
  transition: all .2s !important;
  box-shadow: var(--she-shadow-sm) !important;
}
.she-quick-action:hover {
  border-color: var(--she-pink) !important;
  color: var(--she-pink) !important;
  background: #FFF5FA !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(233,61,145,0.15) !important;
}

/* Pills / badges Payload */
.pill {
  border-radius: 20px !important;
  font-size: 11px !important;
  font-weight: 600 !important;
  padding: 3px 10px !important;
  letter-spacing: 0.02em !important;
}

/* Thumbnail images dans les listes */
.thumbnail,
.thumbnail__image {
  border-radius: var(--she-radius-sm) !important;
  object-fit: cover !important;
}

/* Upload area */
.upload__dropzone,
.file-input {
  border-radius: var(--she-radius) !important;
  border: 2px dashed #E5E7EB !important;
  background: #FAFAFA !important;
  transition: border-color .15s, background .15s !important;
}

.upload__dropzone:hover {
  border-color: var(--she-pink) !important;
  background: #FFF5FA !important;
}

/* Banner */
.banner {
  border-radius: var(--she-radius-sm) !important;
  font-size: 13.5px !important;
}

`
    document.head.appendChild(style)
    return () => {
      document.getElementById('she-admin-styles')?.remove()
    }
  }, [])
  return null
}

export default GlobalStyles
