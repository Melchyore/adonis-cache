declare module '@ioc:Adonis/Addons/Cache' {
  import type { ManagerContract } from '@poppinss/manager'
  import type { ApplicationContract } from '@ioc:Adonis/Core/Application'
  import type { RedisConnectionsList, RedisConnectionContract } from '@ioc:Adonis/Addons/Redis'
  import type { EmitterContract } from '@ioc:Adonis/Core/Event'
  import type { DisksList } from '@ioc:Adonis/Core/Drive'
  import type { Table, Query } from '@ioc:Adonis/Addons/DynamoDB'
  import type { TableDescription } from 'aws-sdk/clients/dynamodb'

  export type Constructor<T extends {} = {}> = new (...args: any[]) => T
  export type AnyFunction<A = any> = (...input: any[]) => A
  export type AbstractCtor<T> = abstract new (...args: any[]) => T
  export type Mixin<T extends AnyFunction> = InstanceType<ReturnType<T>>

  export interface DyanmoDBTable extends Table {
    primaryKey: Query.PrimaryKey<this, string, void>

    Key: string

    Value: string

    ExpiresAt: number | Date
  }

  export type PutManyResult = Record<string, boolean>

  export interface BaseStoreContract {
    setPrefix(prefix: string): void

    readonly prefix: string
  }

  export interface CacheStoreContract extends BaseStoreContract {
    get<T = any>(key: string): Promise<T | null>

    many<T extends Record<string, any>>(keys: Array<string>): Promise<T>

    put<T = any>(key: string, value: T, ttl: number): Promise<boolean>

    increment(key: string, value: number): Promise<number | boolean>

    decrement(key: string, value: number): Promise<number | boolean>

    putMany(list: Record<string, unknown>, ttl: number): Promise<Array<boolean>>

    putManyForever(list: Record<string, unknown>): Promise<Array<boolean>>

    has(key: string): Promise<boolean>

    forever<T = any>(key: string, value: T): Promise<boolean>

    forget(key: string): Promise<boolean>

    flush(): Promise<boolean>

    calculateTTL?(ttlInMilliseconds: number): number

    add?<T = any>(key: string, value: T, ttl?: number): Promise<boolean>

    tags?(names: string | Array<string>): TaggedCacheContract

    createTable?(tableName?: string): Promise<TableDescription | null>
  }

  export interface RepositoryContract<Name extends keyof CacheStoresList> {
    setConfig(config: CacheConfig, driverConfig: CacheStoreConfig): void

    setEventDispatcher(event: EmitterContract): void

    /**
     * Retrieve an item from the cache by key.
     *
     * @template T
     * @param    {string} key
     * @param    {(T | AsyncFunction<T>)} fallback
     * @return   {Promise<T | null>} Promise<T | null>
     * @memberof RepositoryContract
     */
    get<T = any>(key: string, fallback?: T | AsyncFunction<T>): Promise<T | null>

    /**
     * Retrieve multiple items from the cache by keys.
     * Item(s) not found in the cache will have a null value.
     *
     * @template T
     * @param {Array<string>} keys
     * @return {*}  {Promise<T>}
     * @memberof RepositoryContract
     */
    many<T extends Record<string, any>>(keys: Array<string>): Promise<T>

    /**
     * Store an item in the cache if the key does not exist.
     *
     * @param  {string} key
     * @param  {T} value
     * @param  {number | null} ttl
     * @return {Promise<boolean>} Promise<boolean>
     * @memberof RepositoryContract
     */
    add<T = any>(key: string, value: T, ttl?: number): Promise<boolean>

    /**
     * Store an item in the cache for a given number of seconds.
     *
     * @template T
     * @param  {string} key
     * @param  {T}      value
     * @param  {number} [ttl]
     * @return {Promise<boolean>} Promise
     * @memberof RepositoryContract
     */
    put<T = any>(key: string, value: T, ttl?: number | null): Promise<boolean>

    /**
     * Store an item in the cache.
     *
     * @template T
     * @param {string} key
     * @param {T} value
     * @param {(number | null)} [ttl]
     * @return {*}  {Promise<boolean>}
     * @memberof RepositoryContract
     */
    set<T = any>(key: string, value: T, ttl?: number | null): Promise<boolean>

    /**
     * Increment the value of an item in the cache.
     *
     * @param {string} key
     * @param {number} value
     * @return {*}  {(Promise<number | boolean>)}
     * @memberof RepositoryContract
     */
    increment(key: string, value?: number): Promise<number | boolean>

    /**
     * Decrement the value of an item in the cache.
     *
     * @param {string} key
     * @param {number} value
     * @return {*}  {(Promise<number | boolean>)}
     * @memberof RepositoryContract
     */
    decrement(key: string, value?: number): Promise<number | boolean>

    /**
     * Determine if an item exists in the cache.
     *
     * @param {string} key
     * @return {*}  {Promise<boolean>}
     * @memberof RepositoryContract
     */
    has(key: string): Promise<boolean>

    /**
     * Determine if an item doesn't exist in the cache.
     *
     * @param {string} key
     * @return {*}  {Promise<boolean>}
     * @memberof RepositoryContract
     */
    missing(key: string): Promise<boolean>

    /**
     * Store multiple items in the cache for a given number of seconds.
     *
     * @param {Record<string, unknown>} list
     * @param {number} [ttl]
     * @return {*} Promise<PutManyResult>
     * @memberof RepositoryContract
     */
    putMany(list: Record<string, unknown>, ttl?: number): Promise<PutManyResult>

    /**
     * Store multiple items in the cache indefinitely.
     *
     * @param {Record<string, unknown>} list
     * @return {*}  Promise<PutManyResult>
     * @memberof RepositoryContract
     */
    putManyForever(list: Record<string, unknown>): Promise<PutManyResult>

    /**
     * Store one item in the cache indefinitely.
     *
     * @template T
     * @param {string} key
     * @param {T} value
     * @return {*}  {Promise<boolean>}
     * @memberof RepositoryContract
     */
    forever<T = any>(key: string, value: T): Promise<boolean>

    /**
     * Retrieve an item from the cache and delete it.
     *
     * @param  {string}  key
     * @return {Promise<T | null>} Promise<T | null>
     */
    pull<T = any>(key: string): Promise<T | null>

    /**
     * Get an item from the cache, or execute the given Closure and store the result.
     *
     * @template T
     * @param {string} key
     * @param {(number | undefined | null)} ttl
     * @param {AsyncFunction<T>} closure
     * @return {*}  {(Promise<T | undefined>)}
     * @memberof RepositoryContract
     */
    remember<T = any>(
      key: string,
      ttl: number | undefined | null,
      closure: AsyncFunction<T>
    ): Promise<T | undefined>

    /**
     * Get an item from the cache, or execute the given Closure and store the result forever.
     *
     * @template T
     * @param {string} key
     * @param {AsyncFunction<T>} closure
     * @return {*}  {(Promise<T | undefined>)}
     * @memberof RepositoryContract
     */
    sear<T = any>(key: string, closure: AsyncFunction<T>): Promise<T | undefined>

    /**
     * Get an item from the cache, or execute the given Closure and store the result forever.
     *
     * @template T
     * @param {string} key
     * @param {AsyncFunction<T>} closure
     * @return {*}  {(Promise<T | undefined>)}
     * @memberof RepositoryContract
     */
    rememberForever<T = any>(key: string, closure: AsyncFunction<T>): Promise<T | undefined>

    /**
     * Remove an item from the cache.
     *
     * @param  {string} key
     * @return {boolean}
     */
    forget(key: string): Promise<boolean>

    /**
     * Remove multiple items from the cache.
     *
     * @param {Array<string>} keys
     * @return {*}  {Promise<boolean>}
     * @memberof RepositoryContract
     */
    forgetMultiple(keys: Array<string>): Promise<Record<string, boolean>>

    /**
     * Remove all items from the cache.
     *
     * @return {*}  {Promise<boolean>}
     * @memberof RepositoryContract
     */
    flush(): Promise<boolean>

    /**
     * Remove all items from the cache.
     *
     * @alias flush
     * @return {*}  {Promise<boolean>}
     * @memberof RepositoryContract
     */
    clear(): Promise<boolean>

    /**
     * Begin executing a new tags operation if the store supports it.
     *
     * @param {(string | Array<string>)} names
     * @return {*}  {TaggedCacheContract}
     * @memberof RepositoryContract
     */
    tags(names: string | Array<string>): TaggedCacheContract
  }

  export interface TaggedCacheContract extends RepositoryContract<keyof CacheStoresList> {}

  export type AsyncFunction<T = any> = () => Promise<T>

  export type InMemoryValue<T> = {
    expiration: number
    value: T
  }

  export interface CacheStoreConfig {
    driver: string
    prefix?: string
  }

  export interface InMemoryStoreConfig extends CacheStoreConfig {
    driver: 'in_memory'
  }

  export interface RedisStoreConfig extends CacheStoreConfig {
    driver: 'redis'
    connection?: keyof RedisConnectionsList
  }

  export interface MemcachedStoreConfig extends CacheStoreConfig {
    driver: 'memcached'
  }

  export interface DynamoDBStoreConfig extends CacheStoreConfig {
    driver: 'dynamodb'
    table: string
  }

  export interface DatabaseStoreConfig extends CacheStoreConfig {
    driver: 'database'
    connection?: string
    table: string
  }

  export interface FileStoreConfig extends CacheStoreConfig {
    driver: 'file'
    disk: keyof DisksList
  }

  export interface InMemoryStoreContract extends CacheStoreContract {}
  export interface RedisStoreContract extends CacheStoreContract {
    connection(): RedisConnectionContract
  }
  export interface MemcachedStoreContract extends CacheStoreContract {}
  export interface DynamoDBStoreContract extends CacheStoreContract {}
  export interface DatabaseStoreContract extends CacheStoreContract {}
  export interface FileStoreContract extends CacheStoreContract {}

  export interface CacheStores {
    in_memory: {
      implementation: InMemoryStoreContract
      config: InMemoryStoreConfig
    }

    redis: {
      implementation: RedisStoreContract
      config: RedisStoreConfig
    }

    memcached: {
      implementation: MemcachedStoreContract
      config: MemcachedStoreConfig
    }

    dynamodb: {
      implementation: DynamoDBStoreContract
      config: DynamoDBStoreConfig
    }

    database: {
      implementation: DatabaseStoreContract
      config: DatabaseStoreConfig
    }

    file: {
      implementation: FileStoreContract
      config: FileStoreConfig
    }
  }

  export type CacheRecord = {
    key?: string
    value: string
    expiration: Date | number
  }

  /**
   * A list of stores registered in the user land
   */
  export interface CacheStoresList {}

  /**
   * The config accepted by Cache
   * @type {Object}
   */
  export type CacheConfig = {
    prefix: string
    store: keyof CacheStoresList
    stores: {
      [K in keyof CacheStoresList]: CacheStoresList[K]['config']
    }
    ttl: number
    events: CacheEventsConfig
  }

  export interface TaggableStoreContract extends BaseStoreContract {
    tags(names: Array<string>): TaggedCacheContract
  }

  /**
   * Cache manager to manage stores instances
   */
  export interface CacheManagerContract
    extends ManagerContract<
      ApplicationContract,
      CacheStoreContract,
      RepositoryContract<keyof CacheStoresList>,
      { [P in keyof CacheStoresList]: RepositoryContract<P> }
    > {}

  const Cache: CacheManagerContract

  export default Cache
}
