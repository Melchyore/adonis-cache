import { BaseCommand, args } from '@adonisjs/core/build/standalone'

export default class DynamoDB extends BaseCommand {
  public static commandName = 'cache:dynamodb'

  public static description = 'Create a Cache DynamoDB table on AWS'

  public static settings = {
    loadApp: true,
    stayAlive: true
  }

  @args.string({
    description: 'Table name',
    required: false
  })
  public tableName: string = 'Cache'

  public async run() {
    await this.createTable(this.tableName)
    await this.exit()
  }

  private async createTable(tableName: string): Promise<void> {
    const Cache = this.application.container.use('Adonis/Addons/Cache')
    const spinner = this.logger.await(`Creating table ${tableName}`, undefined, undefined)
    const table = await Cache.use('dynamodb').store.createTable!(tableName)

    if (table) {
      this.logger.logUpdate(
        this.logger.colors.green(
          `The "${tableName}" table has been created on AWS. Open "config/cache.ts" and create/update DynamoDB driver with table name.`
        )
      )
    } else {
      this.logger.logUpdate(
        this.logger.colors.red(
          `Could not create "${tableName}" table. Make sure it doesn't already exist or credentials are not wrong.`
        )
      )
    }

    spinner.stop()
  }
}
