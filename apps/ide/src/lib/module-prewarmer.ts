/**
 * ESM Module Prewarmer
 *
 * Background precaching of common esm.sh modules into the Workbox
 * runtime cache. Runs after SW activation via requestIdleCallback
 * so it doesn't block the UI.
 *
 * URL format matches buildEsmShUrl() output (unbundled + target)
 * for cache hits when esmPlugin fetches the same packages.
 */

const ESM_CACHE_NAME = 'wiggum-esm-modules'

/**
 * Named bundles of esm.sh URLs to precache.
 * Versions are hardcoded to match common project lockfiles.
 */
export const MODULE_BUNDLES: Record<string, string[]> = {
  core: [
    'https://esm.sh/*react@19.2.0?target=es2022',
    'https://esm.sh/*react-dom@19.2.0?target=es2022',
    'https://esm.sh/*lucide-react@0.294.0?target=es2022',
    'https://esm.sh/*clsx@2.1.1?target=es2022',
    'https://esm.sh/*tailwind-merge@2.5.0?target=es2022',
    'https://esm.sh/*class-variance-authority@0.7.0?target=es2022',
    'https://esm.sh/*recharts@2.12.0?target=es2022',
  ],
  forms: [
    'https://esm.sh/*react-hook-form@7.54.0?target=es2022',
    'https://esm.sh/*zod@3.24.0?target=es2022',
    'https://esm.sh/*@hookform/resolvers@3.9.0?target=es2022',
  ],
  animation: [
    'https://esm.sh/*motion@11.15.0/react?target=es2022',
  ],
  data: [
    'https://esm.sh/*@tanstack/react-table@8.20.0?target=es2022',
    'https://esm.sh/*@tanstack/react-virtual@3.10.0?target=es2022',
  ],
  dnd: [
    'https://esm.sh/*@dnd-kit/core@6.1.0?target=es2022',
    'https://esm.sh/*@dnd-kit/sortable@8.0.0?target=es2022',
    'https://esm.sh/*@dnd-kit/utilities@3.2.2?target=es2022',
  ],
}

/**
 * Prewarm profiles — named sets of bundles
 */
export const PREWARM_PROFILES: Record<string, string[]> = {
  minimal: ['core'],
  dashboard: ['core', 'data'],
  marketing: ['core', 'animation'],
  fullstack: Object.keys(MODULE_BUNDLES),
}

/**
 * Schedule work during idle time, with fallback
 */
function scheduleIdle(fn: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(fn)
  } else {
    setTimeout(fn, 1000)
  }
}

/**
 * Prewarm a single bundle by fetching all its URLs.
 * Fire-and-forget — errors are silently caught.
 */
export function prewarmBundle(bundleName: string): void {
  const urls = MODULE_BUNDLES[bundleName]
  if (!urls) return

  for (const url of urls) {
    scheduleIdle(() => {
      fetch(url).catch(() => {
        // Silent — prewarming is best-effort
      })
    })
  }
}

/**
 * Prewarm all bundles in a profile
 */
export function prewarmProfile(profileName: string): void {
  const bundles = PREWARM_PROFILES[profileName]
  if (!bundles) return

  for (const bundle of bundles) {
    prewarmBundle(bundle)
  }
}

/**
 * Check which bundles are already cached.
 * Tests the first URL of each bundle as a proxy.
 */
export async function getCacheStatus(): Promise<Record<string, boolean>> {
  const status: Record<string, boolean> = {}

  if (typeof caches === 'undefined') {
    // Cache API not available (e.g., test environment)
    for (const name of Object.keys(MODULE_BUNDLES)) {
      status[name] = false
    }
    return status
  }

  try {
    const cache = await caches.open(ESM_CACHE_NAME)
    for (const [name, urls] of Object.entries(MODULE_BUNDLES)) {
      if (urls.length === 0) {
        status[name] = false
        continue
      }
      const match = await cache.match(urls[0])
      status[name] = match !== undefined
    }
  } catch {
    // Cache access failed — report all as uncached
    for (const name of Object.keys(MODULE_BUNDLES)) {
      status[name] = false
    }
  }

  return status
}

/**
 * Initialize the prewarmer. Called once after SW activation.
 * Only prewarms if core bundle is not already cached.
 */
export async function initPrewarmer(): Promise<void> {
  try {
    const status = await getCacheStatus()
    if (!status.core) {
      console.log('[Prewarmer] Core modules not cached, starting minimal prewarm')
      prewarmProfile('minimal')
    }
  } catch {
    // Silent — prewarming is optional
  }
}

export { ESM_CACHE_NAME }
