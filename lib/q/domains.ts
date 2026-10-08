import type { Domain } from './types'

export const DOMAIN_INFO: Record<Domain, { n: number; blurb: string }> = {
  body: { n: 1, blurb: 'exercise · hygiene · health' },
  home: { n: 2, blurb: 'chores · apartment · plants' },
  styl: { n: 3, blurb: 'clothes · fits · style guide' },
  crew: { n: 4, blurb: 'zia · friends · family · dinners' },
  arts: { n: 5, blurb: 'films · books · albums · artists' },
  city: { n: 6, blurb: 'orgs · events · community' },
  make: { n: 7, blurb: 'projects · ideas · work' },
  admn: { n: 8, blurb: 'money · paperwork · appointments' },
}
