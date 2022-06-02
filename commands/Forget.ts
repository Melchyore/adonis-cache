import { BaseCommand, args } from '@adonisjs/core/build/standalone'
import { CacheStoresList } from '@ioc:Adonis/Addons/Cache'

export default class Forget extends BaseCommand {
  public static commandName = 'cache:forget'

  public static description = 'Remove a cached value by its key'

  public static settings = {
    loadApp: true,
    stayAlive: false
  }

  @args.string({
    description: 'The key to remove',
    required: true
  })
  public key: string

  @args.string({
    description: 'The store to remove the key from',
    required: false
  })
  public store?: keyof CacheStoresList

  public async run() {
    const Cache = this.application.container.use('Adonis/Addons/Cache')

    const result = await Cache.use(
      this.store ?? (this.application.config.get('cache').store as keyof CacheStoresList)
    ).forget(this.key)

    if (result) {
      this.logger.info(`The ${this.key} key has been removed from the cache.`)
    } else {
      this.logger.warning(`${this.key} key not found in the cache.`)
    }
  }
}
