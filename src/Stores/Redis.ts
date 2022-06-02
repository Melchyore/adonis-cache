import type { CacheStoreContract, TaggedCacheContract } from '@ioc:Adonis/Addons/Cache'
import type {
  RedisManagerContract,
  RedisConnectionsList,
  RedisConnectionContract
} from '@ioc:Adonis/Addons/Redis'

import BaseStore from './BaseStore'
import RedisTaggedCache from '../RedisTaggedCache'
import TagSet from '../TagSet'

export default class Redis extends BaseStore implements CacheStoreContract {
  constructor(
    private redis: RedisManagerContract,
    private _connection: keyof RedisConnectionsList
  ) {
    super()

    this.setConnection(_connection)
  }

  public async get<T = any>(key: string): Promise<T | null> {
    const value = await this.connection().get(this.buildKey(key))

    if (value) {
      return this.deserialize<T>(value)
    }

    return null
  }

  public async many<T extends Record<string, any>>(keys: Array<string>): Promise<T> {
    const records = {}

    for (const key of keys) {
      records[key] = await this.get(key)
    }

    return records as T
  }

  public async has(key: string): Promise<boolean> {
    return (await this.connection().exists(this.buildKey(key))) > 0
  }

  public async put<T = any>(key: string, value: T, ttl: number): Promise<boolean> {
    return (await this.connection().psetex(this.buildKey(key), ttl, this.serialize(value))) === 'OK'
  }

  public async add<T = any>(key: string, value: T, ttl: number): Promise<boolean> {
    const lua =
      'return redis.call("exists",KEYS[1])<1 and redis.call("psetex",KEYS[1],ARGV[2],ARGV[1])'

    return (
      (await this.connection().eval(lua, 1, this.buildKey(key), this.serialize(value), ttl)) ===
      'OK'
    )
  }

  public async putMany(list: Record<string, unknown>, ttl: number): Promise<Array<boolean>> {
    const promiseArray: Array<any> = []

    for (const [key, value] of Object.entries(list)) {
      promiseArray.push(this.put(key, value, ttl))
    }

    return Promise.all(promiseArray)
  }

  public async increment(key: string, value: number): Promise<number | boolean> {
    return this.incrementOrDecrement(
      key,
      async () => await this.connection().incrby(this.buildKey(key), value)
    )
  }

  public async decrement(key: string, value: number): Promise<number | boolean> {
    return this.incrementOrDecrement(
      key,
      async () => await this.connection().decrby(this.buildKey(key), value)
    )
  }

  public async putManyForever(list: Record<string, unknown>): Promise<Array<boolean>> {
    const promiseArray: Array<any> = []

    for (const [key, value] of Object.entries(list)) {
      promiseArray.push(this.forever(key, value))
    }

    return Promise.all(promiseArray)
  }

  public async forever<T = any>(key: string, value: T): Promise<boolean> {
    try {
      await this.connection().set(this.buildKey(key), this.serialize(value))
    } catch {
      return false
    }

    return true
  }

  public async forget(key: string): Promise<boolean> {
    return (await this.connection().del(this.buildKey(key))) > 0
  }

  public async flush(): Promise<boolean> {
    return (await this.connection().flushdb()) === 'OK'
  }

  public tags(names: Array<string>): TaggedCacheContract {
    const tagSet = new TagSet(this, names)
    const tagged = new RedisTaggedCache(this, tagSet, this.prefix)

    return tagged
  }

  public connection(): RedisConnectionContract {
    return this.redis.connection(this._connection) as unknown as RedisConnectionContract
  }

  private setConnection(connection: keyof RedisConnectionsList): void {
    this._connection = connection
  }

  private async incrementOrDecrement(
    key: string,
    callback: () => Promise<number | boolean>
  ): Promise<number | boolean> {
    try {
      if (await this.get(key)) {
        return await callback()
      }

      return false
    } catch {
      return false
    }
  }
}
