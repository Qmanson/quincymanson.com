'use server'

import { act } from '@/lib/q/act'
import { revalidatePath } from 'next/cache'
import { qAction } from '@/lib/q/db'
import { settle } from '@/lib/q/ledger'
import { num, required, str } from '@/lib/q/form'
import { today } from '@/lib/q/time'

function done() {
  revalidatePath('/q', 'layout')
}

type DB = Awaited<ReturnType<typeof qAction>>

// ── jobs ────────────────────────────────────────────────────

function jobFields(f: FormData) {
  return {
    name: required(f, 'name'),
    wage: num(f, 'wage') ?? 0,
    q_per_hour: Math.round(num(f, 'q_per_hour') ?? 10),
  }
}

export const createJob = act(async function createJob(f: FormData) {
  const db = await qAction()
  const { error } = await db.from('q_jobs').insert(jobFields(f))
  if (error) throw error
  done()
})

export const updateJob = act(async function updateJob(id: string, f: FormData) {
  const db = await qAction()
  const { error } = await db.from('q_jobs').update(jobFields(f)).eq('id', id)
  if (error) throw error
  done()
})

export const setJobActive = act(async function setJobActive(id: string, active: boolean) {
  const db = await qAction()
  await db.from('q_jobs').update({ active }).eq('id', id)
  done()
})

// ── shifts ──────────────────────────────────────────────────

/** Pay Q$ for a worked shift (hours × the job's Q$/hour). */
async function payShift(db: DB, shiftId: string): Promise<number> {
  const { data: s } = await db.from('q_shifts').select('*').eq('id', shiftId).single()
  if (!s) return 0
  const { data: job } = await db.from('q_jobs').select('*').eq('id', s.job_id).single()
  if (!job) return 0
  const q = s.status === 'done' && s.hours ? Math.round(Number(s.hours) * job.q_per_hour) : 0
  return settle(db, { source: 'shift', source_id: s.id, domain: 'admn', note: `shift · ${job.name}`, occurred_on: s.worked_on }, q)
}

async function wageOf(db: DB, jobId: string): Promise<number> {
  const { data } = await db.from('q_jobs').select('wage').eq('id', jobId).single()
  return Number(data?.wage ?? 0)
}

/** Log a shift you've worked. Returns Q$. */
export const logShift = act(async function logShift(f: FormData) {
  const db = await qAction()
  const job_id = required(f, 'job_id', 'job')
  const hours = num(f, 'hours')
  if (!hours || hours <= 0) throw new Error('how many hours?')
  const { data: s, error } = await db
    .from('q_shifts')
    .insert({
      job_id,
      worked_on: str(f, 'worked_on') ?? today(),
      hours,
      location: str(f, 'location'),
      note: str(f, 'note'),
      wage: await wageOf(db, job_id),
      status: 'done',
    })
    .select('id')
    .single()
  if (error) throw error
  const q = await payShift(db, s.id)
  done()
  return q
})

/** Set up a shift ahead of time, to claim once it's worked. */
export const planShift = act(async function planShift(f: FormData) {
  const db = await qAction()
  const { error } = await db.from('q_shifts').insert({
    job_id: required(f, 'job_id', 'job'),
    worked_on: required(f, 'worked_on', 'day'),
    hours: num(f, 'hours'),
    location: str(f, 'location'),
    note: str(f, 'note'),
    status: 'planned',
  })
  if (error) throw error
  done()
})

/** Claim a planned shift: confirm the day, hours and where. Returns Q$. */
export const claimShift = act(async function claimShift(id: string, f: FormData) {
  const db = await qAction()
  const { data: s, error } = await db.from('q_shifts').select('*').eq('id', id).single()
  if (error) throw error
  const hours = num(f, 'hours')
  if (!hours || hours <= 0) throw new Error('how many hours?')
  await db
    .from('q_shifts')
    .update({
      status: 'done',
      hours,
      worked_on: str(f, 'worked_on') ?? s.worked_on,
      location: str(f, 'location') ?? s.location,
      note: str(f, 'note') ?? s.note,
      wage: await wageOf(db, s.job_id),
    })
    .eq('id', id)
  const q = await payShift(db, id)
  done()
  return q
})

export const deleteShift = act(async function deleteShift(id: string) {
  const db = await qAction()
  await settle(db, { source: 'shift', source_id: id }, 0)
  await db.from('q_shifts').delete().eq('id', id)
  done()
})
