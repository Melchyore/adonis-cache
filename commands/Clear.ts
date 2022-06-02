import { BaseCommand, args } from '@adonisjs/core/build/standalone'
import { CacheStoresList } from '@ioc:Adonis/Addons/Cache'

export default class Forget extends BaseCommand {
  public static commandName = 'cache:clear'

  public static description = 'Flush the application cache'

  public static settings = {
    loadApp: true,
    stayAlive: false
  }

  @args.string({
    description: 'The name of the store you would like to clear',
    required: false
  })
  public store?: keyof CacheStoresList | undefined

  public async run() {
    const Container = this.application.container
    const Event = Container.use('Adonis/Core/Event')
    const Cache = Container.use('Adonis/Addons/Cache')
    const store =
      this.store ?? (this.application.config.get('cache').store as keyof CacheStoresList)

    Event.emit('cache:clearing', { store })

    const result = await Cache.use(store).clear()

    if (result) {
      Event.emit('cache:cleared', { store })

      this.logger.info('Application cache cleared successfully.')
    } else {
      this.logger.warning('Failed to clear cache. Make sure you have the appropriate permissions.')
    }
  }
}
