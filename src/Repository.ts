import type { EmitterContract } from '@ioc:Adonis/Core/Event'
import type {
  CacheStoreContract,
  CacheConfig,
  CacheStoreConfig,
  AsyncFunction,
  RepositoryContract,
  PutManyResult,
  TaggedCacheContract,
  TaggableStoreContract,
  CacheStoresList
} from '@ioc:Adonis/Addons/Cache'

import { Exception } from '@poppinss/utils'
import { string } from '@poppinss/utils/build/helpers'

import CacheEvent from './Events/CacheEvent'
import CacheMissed from './Events/CacheMissed'
import CacheKeyWritten from './Events/CacheKeyWritten'
import CacheKeyForgotten from './Events/CacheKeyForgotten'
import CacheHit from './Events/CacheHit'
import Utils from './Utils'

/**
 * Repository class that will call the appropriate
 * store methods.
 *
 * @export
 * @class Repository
 * @implements {RepositoryContract<CacheStoreContract>}
 */
export default class Repository<Name extends keyof CacheStoresList>
  implements RepositoryContract<Name>
{
  /*
   * Default expiration time `ttl` = 1 hour expressed in seconds.
   */
  public static readonly DEFAULT_TTL = 60 * 60

  private _config: CacheConfig

  private _driverConfig: CacheStoreConfig

  private event: EmitterContract

  private emitter: CacheEvent

  constructor(protected _store: CacheStoreContract, private prefix: string) {}

  public get config(): CacheConfig {
    return this._config
  }

  public get driverConfig(): CacheStoreConfig {
    return this._driverConfig
  }

  public get getTTL(): number {
    return this._config.ttl || Repository.DEFAULT_TTL
  }

  public get store(): CacheStoreContract {
    return this._store
  }

  public setConfig(config: CacheConfig, driverConfig: CacheStoreConfig): void {
    this._config = config
    this._driverConfig = driverConfig
    this._store.setPrefix(this.prefix)
  }

  public setEventDispatcher(_emitter: EmitterContract): void {
    this.event = _emitter
    this.emitter = new CacheEvent(this._config, _emitter)
  }

  public async get<T = any>(key: string, fallback?: T | AsyncFunction<T>): Promise<T | null> {
    let value = await this._store.get<T>(await this.itemKey(key))

    if (this.isNull(value)) {
      this.emitter.emit(new CacheMissed(key))

      if (fallback) {
        value = await this.resolveFallback(fallback)
      }
    } else {
      this.emitter.emit(new CacheHit(key, value))
    }

    return value
  }

  public async many<T extends Record<string, any>>(keys: Array<string>): Promise<T> {
    const records = await this._store.many<T>(keys)

    for (const [key, value] of Object.entries(records)) {
      if (this.isNull(value)) {
        this.emitter.emit(new CacheMissed(key))
      } else {
        this.emitter.emit(new CacheHit(key, value))
      }
    }

    return records
  }

  public async has(key: string): Promise<boolean> {
    return (await this._store.has(await this.itemKey(key))) === true
  }

  public async missing(key: string): Promise<boolean> {
    return !(await this.has(key))
  }

  public async pull<T = any>(key: string): Promise<T | null> {
    const value = await this.get<T>(key)

    if (!this.isNull(value)) {
      await this.forget(key)
    }

    return value
  }

  public async put<T = any>(key: string, value: T, ttl?: number | null): Promise<boolean> {
    const expiration = this.calculateTTL(ttl)

    const result = await this._store.put(await this.itemKey(key), value, expiration)

    if (result) {
      this.emitter.emit(new CacheKeyWritten(key, value, expiration))
    }

    return result
  }

  public async add<T = any>(key: string, value: T, ttl?: number | null): Promise<boolean> {
    if (typeof this._store['add'] === 'function') {
      const expiration = this.calculateTTL(ttl)
      const result = await this._store.add(await this.itemKey(key), value, expiration)

      if (result) {
        this.emitter.emit(new CacheKeyWritten(key, value, expiration))
      }

      return result
    }

    const cachedValue = await this.get(key)

    if (this.isNull(cachedValue)) {
      return await this.put(key, value, ttl)
    }

    return false
  }

  public async set<T = any>(key: string, value: T, ttl?: number | null): Promise<boolean> {
    return await this.put<T>(key, value, ttl)
  }

  public async increment(key: string, value: number = 1): Promise<number | boolean> {
    return await this._store.increment(await this.itemKey(key), value)
  }

  public async decrement(key: string, value: number = 1): Promise<number | boolean> {
    return await this._store.decrement(await this.itemKey(key), value)
  }

  public async putMany(list: Record<string, unknown>, ttl?: number): Promise<PutManyResult> {
    const expiration = this.calculateTTL(ttl)
    const results = await this._store.putMany(list, expiration)

    let result: PutManyResult = {}

    for (let i = 0; i < results.length; ++i) {
      const key = Object.keys(list)[i]

      if (results[i] === true) {
        result[key] = true

        this.emitter.emit(new CacheKeyWritten(key, Object.values(list)[i], expiration))
      } else {
        result[key] = false
      }
    }

    return result
  }

  public async putManyForever(list: Record<string, unknown>): Promise<PutManyResult> {
    const results = await this._store.putManyForever(list)

    let result: PutManyResult = {}

    for (let i = 0; i < results.length; ++i) {
      const key = Object.keys(list)[i]

      if (results[i] === true) {
        result[key] = true

        this.emitter.emit(new CacheKeyWritten(key, Object.values(list)[i], 0))
      } else {
        result[key] = false
      }
    }

    return result
  }

  public async forever<T = any>(key: string, value: T): Promise<boolean> {
    return await this._store.forever(await this.itemKey(key), value)
  }

  public async forget(key: string): Promise<boolean> {
    const result = await this._store.forget(await this.itemKey(key))

    if (result) {
      this.emitter.emit(new CacheKeyForgotten(key))
    }

    return result
  }

  public async forgetMultiple(keys: Array<string>): Promise<Record<string, boolean>> {
    let result = {}

    for (const key of keys) {
      result[key] = await this.forget(key)
    }

    return result
  }

  public async remember<T = any>(
    key: string,
    ttl: number | null,
    closure: AsyncFunction<T>
  ): Promise<T | undefined> {
    if (this.checkClosure(closure)) {
      let value = await this.get(key)

      if (!this.isNull(value)) {
        return value
      }

      value = await closure()

      await this.put(key, value, ttl)

      return value
    }
  }

  public async sear<T = any>(key: string, closure: AsyncFunction<T>): Promise<T | undefined> {
    return await this.rememberForever<T>(key, closure)
  }

  public async rememberForever<T = any>(
    key: string,
    closure: AsyncFunction<T>
  ): Promise<T | undefined> {
    if (this.checkClosure(closure)) {
      let value = await this.get(key)

      if (!this.isNull(value)) {
        return value
      }

      value = await closure()

      await this.forever(key, value)

      return value
    }
  }

  public async flush(): Promise<boolean> {
    return await this._store.flush()
  }

  public async clear(): Promise<boolean> {
    return await this.flush()
  }

  public tags(names: string | Array<string>): TaggedCacheContract {
    if (!('tags' in this._store)) {
      throw new Exception('This cache store does not support tagging')
    }

    const taggedCache = (this._store as TaggableStoreContract).tags(
      Array.isArray(names) ? names : [names]
    )
    taggedCache.setConfig(this._config, this._driverConfig)
    taggedCache.setEventDispatcher(this.event)

    return taggedCache
  }

  protected async itemKey(key: string): Promise<string> {
    return key
  }

  private calculateTTL(ttl: number | null | undefined): number {
    if (ttl && ttl < 0) {
      throw new Exception('Expiration time (TTL) cannot be negative')
    }

    const ttlInMilliseconds = Number(string.toMs(`${ttl ?? this.getTTL}s`))

    return this._store.calculateTTL!(ttlInMilliseconds)
  }

  private checkClosure(closure: unknown): boolean {
    if (!Utils.isFunction(closure)) {
      throw new Exception('Closure must be a function')
    }

    return true
  }

  private isNull(value: any): boolean {
    return value === null || value === undefined
  }

  private async resolveFallback<T = any>(fallback: T | AsyncFunction<T>): Promise<T> {
    let fallbackValue: T = Utils.isFunction(fallback) ? await fallback() : fallback

    return fallbackValue
  }
}
