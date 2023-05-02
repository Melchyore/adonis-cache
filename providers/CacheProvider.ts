import { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class CacheProvider {
  public static needsApplication = true

  constructor(protected app: ApplicationContract) {}

  public register() {
    this.app.container.singleton('Adonis/Addons/Cache', () => {
      const config = this.app.container.resolveBinding('Adonis/Core/Config').get('cache', {})
      const CacheManager = require('../src/CacheManager').default

      return new CacheManager(this.app, config)
    })

    /* istanbul ignore next */
    this.app.container.singleton('Adonis/Addons/Cache/Stores', () => {
      return {
        BaseCacheStore: require('../src/Stores/BaseStore').default,
        TaggableStore: require('../src/Stores/TaggableStore').default
      }
    })
  }

  public async boot() {
    // IoC container is ready
    this.registerViewHelper()
    this.defineReplBindings()
  }

  public async ready() {
    // App is ready
  }

  public async shutdown() {
    // Cleanup, since app is going down
  }

  /**
   * Define repl binding
   */
  protected defineReplBindings() {
    /**
     * Do not register repl binding when not running in "repl"
     * environment
     */
    /* istanbul ignore next */
    if (this.app.environment !== 'repl') {
      return
    }

    /**
     * Define REPL bindings
     */
    /* istanbul ignore next */
    this.app.container.withBindings(['Adonis/Addons/Repl'], (Repl) => {
      const { defineReplBindings } = require('../src/Bindings/Repl')

      defineReplBindings(this.app, Repl)
    })
  }

  /**
   * Define view helper
   */
  protected registerViewHelper() {
    /**
     * Do not register view helper when running in "test"
     * environment
     */
    if (this.app.environment !== 'repl') {
      return
    }

    /* istanbul ignore next */
    this.app.container.withBindings(
      ['Adonis/Core/Server', 'Adonis/Addons/Cache'],
      (Server, Cache) => {
        Server.hooks.before(async (ctx) => {
          ctx.view.share({ cache: Cache })
        })
      }
    )
  }
}
