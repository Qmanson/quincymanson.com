import { unstable_rethrow } from 'next/navigation'

/** What a wrapped action returns when it fails. */
export type ActError = { error: string }

/**
 * Wrap a server action so its error message reaches the phone. Production
 * builds hide thrown messages behind a generic "Server Components render"
 * error, so failures come back as { error } values instead.
 */
export function act<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R | ActError> => {
    try {
      return await fn(...args)
    } catch (e) {
      unstable_rethrow(e) // let redirect() / notFound() through
      const msg =
        e instanceof Error ? e.message
        : e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message)
        : 'something broke'
      return { error: msg }
    }
  }
}

/** Client side: turn an { error } result back into a throw. */
export function unwrap<R>(r: R | ActError): R {
  if (r && typeof r === 'object' && 'error' in r && typeof (r as ActError).error === 'string') {
    throw new Error((r as ActError).error)
  }
  return r as R
}
