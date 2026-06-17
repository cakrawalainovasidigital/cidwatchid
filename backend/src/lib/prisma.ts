import { PrismaClient } from '@prisma/client'
import type { Context } from 'hono'
import type { Bindings, Variables } from '../types/hono'
import { initPrismaVPS } from './dbAdapter'

type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>

export function prisma(c: AppContext): PrismaClient {
  const cached = c.get('prisma')
  if (cached) return cached

  const client = initPrismaVPS();

  c.set('prisma', client)
  return client
}
