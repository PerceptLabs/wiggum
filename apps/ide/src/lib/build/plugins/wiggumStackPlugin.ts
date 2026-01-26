/**
 * esbuild plugin to provide pre-bundled @wiggum/stack
 *
 * This plugin intercepts imports of @wiggum/stack and provides
 * the pre-bundled code instead of trying to fetch from CDN.
 */
import type { Plugin } from 'esbuild-wasm'
import { WIGGUM_STACK_BUNDLE } from '../generated/wiggum-stack-bundle'

/**
 * Create a plugin that provides @wiggum/stack from a pre-bundled source
 */
export function createWiggumStackPlugin(): Plugin {
  return {
    name: 'wiggum-stack',
    setup(build) {
      // Intercept @wiggum/stack imports
      build.onResolve({ filter: /^@wiggum\/stack$/ }, (args) => {
        return {
          path: '@wiggum/stack',
          namespace: 'wiggum-stack',
        }
      })

      // Also handle subpath imports like @wiggum/stack/components
      build.onResolve({ filter: /^@wiggum\/stack\// }, (args) => {
        // For now, redirect all subpaths to the main bundle
        // The bundle re-exports everything from the main entry
        return {
          path: args.path,
          namespace: 'wiggum-stack',
        }
      })

      // Provide the pre-bundled code
      build.onLoad({ filter: /.*/, namespace: 'wiggum-stack' }, (args) => {
        if (!WIGGUM_STACK_BUNDLE) {
          return {
            errors: [
              {
                text: '@wiggum/stack bundle not generated. Run: pnpm bundle:stack',
              },
            ],
          }
        }

        return {
          contents: WIGGUM_STACK_BUNDLE,
          loader: 'js',
        }
      })
    },
  }
}
