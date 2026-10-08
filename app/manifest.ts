import type { MetadataRoute } from 'next'

// Installs q (the private app) to the phone home screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'q',
    short_name: 'q',
    description: 'quincy’s life console',
    start_url: '/q',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#05060f',
    theme_color: '#05060f',
    icons: [
      { src: '/q-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/q-icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/q-icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
