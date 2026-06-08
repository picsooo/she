import { REST_DELETE, REST_GET, REST_PATCH, REST_POST, REST_PUT } from '@payloadcms/next/routes'
import configPromise from '@payload-config'
import type { NextRequest } from 'next/server'

// Type correspondant au paramètre de la route [...slug]
// Payload 3.x attend explicitement le nom "slug" pour le catch-all REST API
type RouteContext = { params: Promise<{ slug: string[] }> }

const getHandler = REST_GET(configPromise)
const postHandler = REST_POST(configPromise)
const deleteHandler = REST_DELETE(configPromise)
const patchHandler = REST_PATCH(configPromise)
const putHandler = REST_PUT(configPromise)

export const GET = (req: NextRequest, ctx: RouteContext) =>
  getHandler(req, ctx as Parameters<typeof getHandler>[1])

export const POST = (req: NextRequest, ctx: RouteContext) =>
  postHandler(req, ctx as Parameters<typeof postHandler>[1])

export const DELETE = (req: NextRequest, ctx: RouteContext) =>
  deleteHandler(req, ctx as Parameters<typeof deleteHandler>[1])

export const PATCH = (req: NextRequest, ctx: RouteContext) =>
  patchHandler(req, ctx as Parameters<typeof patchHandler>[1])

export const PUT = (req: NextRequest, ctx: RouteContext) =>
  putHandler(req, ctx as Parameters<typeof putHandler>[1])
