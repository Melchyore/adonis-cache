import type { CacheStoreContract } from '@ioc:Adonis/Addons/Cache'
import type { AdonisMemcachedClientContract } from '@ioc:Adonis/Addons/Adonis5-MemcachedClient'

import TaggableStore from './TaggableStore'

export default class Memcached extends TaggableStore implements CacheStoreContract {
  constructor(private client: AdonisMemcachedClientContract) {
    super()
  }

  /**
   * In Memcached, TTL is expressed in seconds.
   */
  public calculateTTL(ttlInMilliseconds: number): number {
    return ttlInMilliseconds / 1000
  }

  public async get<T = any>(key: string): Promise<T | null> {
    const value = await this.client.get(this.buildKey(key))

    return value ? this.deserialize<T>(value.toString()) : null
  }

  public async many<T extends Record<string, any>>(keys: Array<string>): Promise<T> {
    const records = {}

    const values = await this.client.getMulti(keys.map((key) => this.buildKey(key)))

    for (const key of keys) {
      const value = values[this.buildKey(key)]

      records[key] = value ? this.deserialize<T>(value.toString()) : null
    }

    return records as T
  }

  public async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null
  }

  public async put<T = any>(key: string, value: T, ttl: number): Promise<boolean> {
    return await this.client.set(this.buildKey(key), this.serialize(value), ttl)
  }

  public async add<T = any>(key: string, value: T, ttl: number): Promise<boolean> {
    return await this.client.add(this.buildKey(key), this.serialize(value), ttl)
  }

  public async putMany(list: Record<string, unknown>, ttl: number): Promise<Array<boolean>> {
    const results: Array<Promise<boolean>> = []

    for (const [key, value] of Object.entries(list)) {
      results.push(this.put(key, value, ttl))
    }

    return Promise.all(results)
  }

  public async increment(key: string, value: number): Promise<number | boolean> {
    return await this.incrementOrDecrement(
      key,
      async () => await this.client.incr(this.buildKey(key), value)
    )
  }

  public async decrement(key: string, value: number): Promise<number | boolean> {
    return await this.incrementOrDecrement(
      key,
      async () => await this.client.decr(this.buildKey(key), value)
    )
  }

  public async putManyForever(list: Record<string, unknown>): Promise<Array<boolean>> {
    const results: Array<Promise<boolean>> = []

    for (const [key, value] of Object.entries(list)) {
      results.push(this.forever(key, value))
    }

    return Promise.all(results)
  }

  public async forever<T = any>(key: string, value: T): Promise<boolean> {
    return await this.put(key, value, 0)
  }

  public async forget(key: string): Promise<boolean> {
    return await this.client.del(this.buildKey(key))
  }

  public async flush(): Promise<boolean> {
    return await this.client.flush()[0]
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
