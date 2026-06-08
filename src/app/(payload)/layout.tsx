import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts'
// @ts-ignore — CSS import supporté par Next.js mais pas typé dans @payloadcms/next
import '@payloadcms/next/css'
import configPromise from '@payload-config'
import { importMap } from './admin/importMap'
import React from 'react'

type Args = {
  children: React.ReactNode
}

// Wrapper Server Action — injecte config et importMap requis par handleServerFunctions
async function serverFunction(
  args: Omit<Parameters<typeof handleServerFunctions>[0], 'config' | 'importMap'>
) {
  'use server'
  return handleServerFunctions({ ...args, config: configPromise, importMap })
}

// Layout racine de l'admin Payload — fournit le ConfigProvider requis par useConfig()
const Layout = ({ children }: Args) => (
  <RootLayout
    config={configPromise}
    importMap={importMap}
    serverFunction={serverFunction}
  >
    {children}
  </RootLayout>
)

export default Layout
