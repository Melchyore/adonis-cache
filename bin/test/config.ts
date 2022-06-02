import type { ApplicationContract } from '@ioc:Adonis/Core/Application'

import type {
  Constructor,
  AbstractCtor,
  CacheConfig,
  CacheStoreContract,
  BaseStoreContract,
  CacheStoreConfig,
  TaggableStoreContract,
  CacheStoresList
} from '@ioc:Adonis/Addons/Cache'
import type { AdonisMemcachedClientConfig } from '@ioc:Adonis/Addons/Adonis5-MemcachedClient'
import type { DynamoDBConfig } from '@ioc:Adonis/Addons/DynamoDB'

import { Filesystem } from '@poppinss/dev-utils'
import { Application } from '@adonisjs/core/build/standalone'
import { join } from 'path'

import Repository from '../../src/Repository'
import cacheConfig from '../../tests/config/cache'

export const fs = new Filesystem(join(__dirname, 'app'))

const redisConfig = {
  connection: 'primary',
  connections: {
    primary: {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT)
    }
  }
}

const dynamoDBConfig: DynamoDBConfig = {
  region: process.env.AWS_REGION!,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
}

const memcachedConfig: AdonisMemcachedClientConfig = {
  server: process.env.MEMCACHED_SERVER_URL
}

const databaseConfig = {
  connection: process.env.DB_CONNECTION,
  connections: {
    mysql: {
      client: 'mysql',
      connection: {
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DB_NAME
      },
      debug: true
    }
  }
}

const driveConfig = {
  disk: 'cache',
  disks: {
    cache: {
      driver: 'local',
      visibility: 'private',
      root: './tmp'
    }
  }
}

export async function setup(
  environment: 'test' | 'web',
  _cacheConfig: CacheConfig | Record<string, any>
) {
  await fs.add('.env', '')
  await fs.add(
    'config/app.ts',
    `
		export const appKey = 'averylong32charsrandomsecretkey',
		export const http = {
			cookie: {},
			trustProxy: () => true,
		}
	`
  )

  await fs.add(
    'config/cache.ts',
    `
    const cacheConfig = ${JSON.stringify(_cacheConfig, null, 2)}
    export default cacheConfig
  `
  )

  await fs.add(
    'config/redis.ts',
    `
		const redisConfig = ${JSON.stringify(redisConfig, null, 2)}
		export default redisConfig
	`
  )

  await fs.add(
    'config/memcached.ts',
    `
		const memcachedConfig = ${JSON.stringify(memcachedConfig, null, 2)}
		export default memcachedConfig
	`
  )

  await fs.add(
    'config/dynamodb.ts',
    `
		const dynamoDBConfig = ${JSON.stringify(dynamoDBConfig, null, 2)}
		export default dynamoDBConfig
	`
  )

  await fs.add(
    'config/database.ts',
    `
		const databaseConfig = ${JSON.stringify(databaseConfig, null, 2)}
		export default databaseConfig
	`
  )

  await fs.add(
    'config/drive.ts',
    `
		const driveConfig = ${JSON.stringify(driveConfig, null, 2)}
		export default driveConfig
	`
  )

  const app = new Application(fs.basePath, environment, {
    providers: [
      '@adonisjs/core',
      '@adonisjs/view',
      '@adonisjs/lucid',
      '@adonisjs/redis',
      'adonis5-memcached-client',
      'adonis-dynamodb',
      '../../../providers/CacheProvider'
    ]
  })

  await app.setup()
  await app.registerProviders()
  await app.bootProviders()

  return app
}

export function getCacheConfig(store?: keyof CacheStoresList) {
  const config = cacheConfig

  return store ? { ...cacheConfig, store } : config
}

export async function createRedisConfig(fs: Filesystem) {
  await fs.add(
    'config/redis.ts',
    `
		const redisConfig = ${JSON.stringify(redisConfig, null, 2)}
		export default redisConfig
	`
  )
}

export async function createRepository(
  app: ApplicationContract,
  config: CacheConfig,
  driverConfig: CacheStoreConfig,
  store: CacheStoreContract
) {
  const Event = app.container.use('Adonis/Core/Event')
  const repository = new Repository(store, driverConfig.prefix ?? config.prefix)
  repository.setConfig(config, driverConfig)
  repository.setEventDispatcher(Event)

  return {
    Repository: repository,
    Event
  }
}

export function getDummyStore(
  Base: Constructor<BaseStoreContract>
): Constructor<CacheStoreContract> {
  class DummyStore extends Base implements CacheStoreContract {
    constructor() {
      super()
    }

    public calculateTTL(ttlInMilliseconds: number): number {
      return ttlInMilliseconds / 1000
    }

    public async get<T = any>(_key: string): Promise<T> {
      return true as unknown as T
    }

    public async many<T extends Record<string, any>>(_keys: Array<string>): Promise<T> {
      return {} as any
    }

    public async has(_key: string): Promise<boolean> {
      return true
    }

    public async put<T = any>(_key: string, _value: T, _ttl: number): Promise<boolean> {
      return true
    }

    public async putMany(_list: Record<string, unknown>, _ttl?: number): Promise<Array<boolean>> {
      return [true]
    }

    public async putManyForever(_list: Record<string, unknown>): Promise<Array<boolean>> {
      return [true]
    }

    public async forever<T = any>(_key: string, _value: T): Promise<boolean> {
      return true
    }

    public async forget(_key: string): Promise<boolean> {
      return true
    }

    public async flush(): Promise<boolean> {
      return true
    }

    public async increment(_key: string, _value: number): Promise<number | boolean> {
      return 1
    }

    public async decrement(_key: string, _value: number): Promise<number | boolean> {
      return 1
    }
  }

  return DummyStore
}

export function getTaggableDummyStore(
  Base: AbstractCtor<TaggableStoreContract>
): Constructor<CacheStoreContract> {
  class DummyStore extends Base implements CacheStoreContract {
    constructor() {
      super()
    }

    public calculateTTL(ttlInMilliseconds: number): number {
      return ttlInMilliseconds / 1000
    }

    public async get<T = any>(_key: string): Promise<T> {
      return true as unknown as T
    }

    public async many<T extends Record<string, any>>(_keys: Array<string>): Promise<T> {
      return {} as any
    }

    public async has(_key: string): Promise<boolean> {
      return true
    }

    public async put<T = any>(_key: string, _value: T, _ttl: number): Promise<boolean> {
      return true
    }

    public async putMany(_list: Record<string, unknown>, _ttl?: number): Promise<Array<boolean>> {
      return [true]
    }

    public async putManyForever(_list: Record<string, unknown>): Promise<Array<boolean>> {
      return [true]
    }

    public async forever<T = any>(_key: string, _value: T): Promise<boolean> {
      return true
    }

    public async forget(_key: string): Promise<boolean> {
      return true
    }

    public async flush(): Promise<boolean> {
      return true
    }

    public async increment(_key: string, _value: number): Promise<number | boolean> {
      return 1
    }

    public async decrement(_key: string, _value: number): Promise<number | boolean> {
      return 1
    }
  }

  return DummyStore
}

export async function setupTable(
  app: ApplicationContract,
  _connection: string,
  table: string
): Promise<void> {
  const connection = app.container.use('Adonis/Lucid/Database').connection(_connection)

  await connection.schema.dropTableIfExists(table)
  await connection.schema.createTable(table, (_table) => {
    _table.string('key', 255).notNullable().primary()
    _table.text('value', 'longtext').notNullable()
    _table.timestamp('expiration', { useTz: true }).nullable()
  })
}

export async function setupDynamoDBTable(app: ApplicationContract): Promise<void> {
  const Cache = app.container.use('Adonis/Addons/Cache').use('dynamodb')

  await Cache.store.createTable!()
}

export async function getCache(store: keyof CacheStoresList, config: CacheConfig) {
  const app = await setup('test', config)

  if (store === 'database') {
    await setupTable(
      app,
      app.container.use('Adonis/Core/Env').get('DB_CONNECTION'),
      config.stores.database.table
    )
  } else if (store === 'dynamodb') {
    await setupDynamoDBTable(app)
  }

  const Cache = app.container.use('Adonis/Addons/Cache').use(store)

  // DynamoDB doesn't support flushing a table, so we need to delete the keys manually.
  if (store !== 'dynamodb') {
    await Cache.clear()
  } else {
    for (const key of ['test', 'foo', 'bar']) {
      await Cache.forget(key)
    }
  }

  return Cache
}
