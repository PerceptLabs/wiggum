/**
 * Bundle @wiggum/stack for browser-based esbuild builds
 *
 * This script pre-bundles @wiggum/stack at IDE build time so it can be
 * provided to esbuild-wasm at runtime via a plugin.
 *
 * Run: pnpm bundle:stack
 */
import { build } from 'esbuild'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

async function bundleStack() {
  console.log('Bundling @wiggum/stack...')

  const result = await build({
    entryPoints: [resolve(rootDir, 'packages/stack/src/index.ts')],
    bundle: true,
    format: 'esm',
    write: false,
    minify: false, // Keep readable for debugging
    external: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'use-sync-external-store',
      'use-sync-external-store/shim',
    ], // Provided by preview HTML importmap
    target: 'es2020',
    // Use automatic JSX runtime (generates imports, not React.createElement)
    jsx: 'automatic',
    jsxImportSource: 'react',
    // Force ESM resolution - prioritize module/browser fields over main (CJS)
    mainFields: ['module', 'browser', 'main'],
    conditions: ['module', 'browser', 'import'],
    // Handle CSS-in-JS and Tailwind classes
    loader: {
      '.css': 'text',
    },
    // Disable code splitting - we want a single bundle
    splitting: false,
  })

  const outPath = resolve(rootDir, 'apps/ide/src/lib/build/generated/wiggum-stack-bundle.ts')
  mkdirSync(dirname(outPath), { recursive: true })

  const code = result.outputFiles[0].text

  writeFileSync(
    outPath,
    `// AUTO-GENERATED - Do not edit
// Run: pnpm bundle:stack
export const WIGGUM_STACK_BUNDLE = ${JSON.stringify(code)}
`
  )

  console.log(`Wrote ${outPath} (${(code.length / 1024).toFixed(1)} KB)`)
}

bundleStack().catch((err) => {
  console.error('Failed to bundle @wiggum/stack:', err)
  process.exit(1)
})
