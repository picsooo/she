import { NotFoundPage } from '@payloadcms/next/views'
import configPromise from '@payload-config'
import { importMap } from '../importMap'

type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] }>
}

// Page 404 de l'admin Payload
const NotFound = ({ params, searchParams }: Args) =>
  NotFoundPage({ config: configPromise, params, importMap, searchParams })

export default NotFound
