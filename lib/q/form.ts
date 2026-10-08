import { DOMAINS, type Domain } from './types'

// FormData readers shared by server actions.

export function str(f: FormData, k: string): string | null {
  const v = f.get(k)
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

export function num(f: FormData, k: string): number | null {
  const v = str(f, k)
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function json<T>(f: FormData, k: string): T | null {
  const v = str(f, k)
  if (!v) return null
  try { return JSON.parse(v) as T } catch { return null }
}

export function required(f: FormData, k: string, label = k): string {
  const v = str(f, k)
  if (!v) throw new Error(`${label} is required`)
  return v
}

export function domainOf(f: FormData, fallback?: Domain): Domain {
  const d = str(f, 'domain')
  if (d && (DOMAINS as readonly string[]).includes(d)) return d as Domain
  if (fallback) return fallback
  throw new Error('pick a domain')
}
