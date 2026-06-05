import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import configPromise from '@payload-config'
import { importMap } from '../importMap'
import type { Metadata } from 'next'

type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] }>
}

// Métadonnées de la page admin (générées par Payload)
export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config: configPromise, params, searchParams })

// Page admin Payload (gestion complète depuis /admin)
const Page = ({ params, searchParams }: Args) =>
  RootPage({ config: configPromise, params, importMap, searchParams })

export default Page
