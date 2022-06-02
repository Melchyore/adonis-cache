import { join } from 'path'
import { BaseCommand, args } from '@adonisjs/core/build/standalone'

export default class Make extends BaseCommand {
  public static commandName = 'cache:table'

  public static description = 'Create a migration for the cache database table'

  public static settings = {
    loadApp: true,
    stayAlive: false
  }

  @args.string({
    description: 'Table name',
    required: false
  })
  public cacheTableName: string = 'cache'

  public async run() {
    const stub = join(__dirname, '..', 'templates', 'migration.txt')
    const cacheTableName = this.cacheTableName

    this.generator
      .addFile(`${Date.now()}_${cacheTableName}.ts`)
      .appRoot(this.application.appRoot)
      .destinationDir(this.application.directoriesMap.get('migrations') || 'database')
      .useMustache()
      .stub(stub)
      .apply({ cacheTableName })

    await this.generator.run()
  }
}
