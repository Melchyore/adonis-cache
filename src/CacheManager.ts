import type { ApplicationContract } from '@ioc:Adonis/Core/Application'
import type {
  CacheStoreContract,
  CacheConfig,
  RepositoryContract,
  AsyncFunction,
  CacheStoresList,
  InMemoryStoreConfig,
  RedisStoreConfig,
  MemcachedStoreConfig,
  CacheStoreConfig,
  DynamoDBStoreConfig,
  DatabaseStoreConfig,
  FileStoreConfig,
  PutManyResult,
  TaggedCacheContract
} from '@ioc:Adonis/Addons/Cache'

import { Manager } from '@poppinss/manager'
import { Exception, ManagerConfigValidator } from '@poppinss/utils'

import Repository from './Repository'

import Memcached from './Stores/Memcached'
import InMemory from './Stores/InMemory'
import Redis from './Stores/Redis'
import DynamoDB from './Stores/DynamoDB'
import Database from './Stores/Database'
import File from './Stores/File'

export default class CacheManager extends Manager<
  ApplicationContract,
  CacheStoreContract,
  RepositoryContract<keyof CacheStoresList>,
  { [P in keyof CacheStoresList]: RepositoryContract<P> }
> {
  /**
   * Cache all stores instances.
   */
  protected singleton = true

  /**
   * Find if cache is ready to be used
   */
  private isReady: boolean = false

  private emitter = this.app.container.use('Adonis/Core/Event')

  constructor(private app: ApplicationContract, private config: CacheConfig) {
    super(app)

    this.validateConfig()
  }

  public createInMemory(_: string, __: InMemoryStoreConfig) {
    return new InMemory()
  }

  public createMemcached(_: string, __: MemcachedStoreConfig) {
    return new Memcached(this.app.container.use('Adonis/Addons/Adonis5-MemcachedClient'))
  }

  public createRedis(_: string, config: RedisStoreConfig) {
    const AdonisRedis = this.app.container.use('Adonis/Addons/Redis')
    const redisConnection = this.app.container.use('Adonis/Core/Env').get('REDIS_CONNECTION')

    return new Redis(AdonisRedis, config.connection ?? redisConnection)
  }

  public createDynamodb(_: string, config: DynamoDBStoreConfig) {
    return new DynamoDB(this.app.container.use('Adonis/Addons/DynamoDB').DynamoDB, config.table)
  }

  public createDatabase(_: string, config: DatabaseStoreConfig) {
    const Container = this.app.container

    return new Database(
      Container.use('Adonis/Lucid/Database').connection(
        config.connection ?? Container.use('Adonis/Core/Env').get('DB_CONNECTION')
      ),
      config.table
    )
  }

  public createFile(_: string, config: FileStoreConfig) {
    const disk = config.disk
    const driveConfig = this.app.container.use('Adonis/Core/Config').get('drive').disks[disk]

    if (!driveConfig) {
      throw new Error(
        `You must create and add the '${config.disk}' disk using local driver to the disks object inside config/drive.ts\n` +
          `${config.disk}: {\n
          driver: 'local',\n
          visibility: 'private',\n
          root: Application.tmpPath('the-path-you-want-to-use'),\n
        },`
      )
    }

    return new File(this.app.container.use('Adonis/Core/Drive').use(disk))
  }

  public use(store?: keyof CacheStoresList): RepositoryContract<keyof CacheStoresList> {
    if (!this.isReady) {
      throw new Exception(
        'Missing configuration for cache. Visit https://github.com/Melchyore/adonis-cache for setup instructions',
        500,
        'E_MISSING_CACHE_CONFIG'
      )
    }

    return super.use(store ?? this.getDefaultMappingName())
  }

  public async get<T = any>(key: string, fallback?: T | AsyncFunction<T>): Promise<T | null> {
    return await this.use().get<T>(key, fallback)
  }

  public async many<T extends Record<string, any>>(keys: Array<string>): Promise<T> {
    return await this.use().many<T>(keys)
  }

  public async add<T = any>(key: string, value: T, ttl?: number): Promise<boolean> {
    return await this.use().add<T>(key, value, ttl)
  }

  public async put<T = any>(key: string, value: T, ttl?: number | null): Promise<boolean> {
    return await this.use().put<T>(key, value, ttl)
  }

  public async set<T = any>(key: string, value: T, ttl?: number | null): Promise<boolean> {
    return await this.use().set<T>(key, value, ttl)
  }

  public async increment(key: string, value: number = 1): Promise<number | boolean> {
    return await this.use().increment(key, value)
  }

  public async decrement(key: string, value: number = 1): Promise<number | boolean> {
    return await this.use().decrement(key, value)
  }

  public async has(key: string): Promise<boolean> {
    return await this.use().has(key)
  }

  public async missing(key: string): Promise<boolean> {
    return await this.use().missing(key)
  }

  public async putMany(list: Record<string, unknown>, ttl?: number): Promise<PutManyResult> {
    return await this.use().putMany(list, ttl)
  }

  public async putManyForever(list: Record<string, unknown>): Promise<PutManyResult> {
    return await this.use().putManyForever(list)
  }

  public async forever<T = any>(key: string, value: T): Promise<boolean> {
    return await this.use().forever<T>(key, value)
  }

  public async pull<T = any>(key: string): Promise<T | null> {
    return await this.use().pull<T>(key)
  }

  public async remember<T = any>(
    key: string,
    ttl: number | undefined | null,
    closure: AsyncFunction<T>
  ): Promise<T | undefined> {
    return await this.use().remember<T>(key, ttl, closure)
  }

  public async sear<T = any>(key: string, closure: AsyncFunction<T>): Promise<T | undefined> {
    return await this.use().sear<T>(key, closure)
  }

  public async rememberForever<T = any>(
    key: string,
    closure: AsyncFunction<T>
  ): Promise<T | undefined> {
    return await this.use().rememberForever<T>(key, closure)
  }

  public async forget(key: string): Promise<boolean> {
    return await this.use().forget(key)
  }

  public async forgetMultiple(keys: Array<string>): Promise<Record<string, boolean>> {
    return await this.use().forgetMultiple(keys)
  }

  public async flush(): Promise<boolean> {
    return await this.use().flush()
  }

  public async clear(): Promise<boolean> {
    return await this.use().clear()
  }

  public tags(names: string | Array<string>): TaggedCacheContract {
    return this.use().tags(names)
  }

  protected getDefaultMappingName() {
    if (!this.config.store) {
      throw new Exception(
        'Invalid "cache" config. Missing value for "store". Make sure to set it inside the "config/cache" file'
      )
    }

    return this.config.store
  }

  protected getMappingConfig(mappingName: keyof CacheStoresList) {
    return this.config.stores[mappingName]
  }

  protected getMappingDriver(mappingName: keyof CacheStoresList): string | undefined {
    return this.getMappingConfig(mappingName)?.driver
  }

  /**
   * Since we don't expose the drivers instances directly, we wrap them
   * inside the repository instance.
   */
  protected wrapDriverResponse<Name extends keyof CacheStoresList>(
    mappingName: Name,
    driver: CacheStoreContract
  ) {
    const driverConfig = this.getMappingConfig(mappingName)
    const repository = new Repository(driver, this.getPrefix(driverConfig))
    repository.setConfig(this.config, driverConfig)
    repository.setEventDispatcher(this.emitter)

    return repository
  }

  private getPrefix(config: CacheStoreConfig): string {
    return config.prefix ?? this.config.prefix
  }

  private validateConfig() {
    const validator = new ManagerConfigValidator(this.config, 'cache', 'config/cache')
    validator.validateDefault('store')
    validator.validateList('stores', 'store')

    this.isReady = true
  }
}
