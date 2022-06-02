import type { ReplContract } from '@ioc:Adonis/Addons/Repl'
import type { ApplicationContract } from '@ioc:Adonis/Core/Application'

/**
 * Helper to define REPL state
 */
function setupReplState(repl: ReplContract, key: string, value: any) {
  repl.server.context[key] = value
  repl.notify(
    `Loaded ${key} module. You can access it using the "${repl.colors.underline(key)}" variable`
  )
}

export function defineReplBindings(application: ApplicationContract, Repl: ReplContract) {
  /**
   * Load the cache module
   */
  Repl.addMethod(
    'loadCache',
    (repl) => {
      setupReplState(repl, 'Cache', application.container.resolveBinding('Adonis/Addons/Cache'))
    },
    {
      description: 'Load cache provider and save reference to the "Cache" variable'
    }
  )
}
