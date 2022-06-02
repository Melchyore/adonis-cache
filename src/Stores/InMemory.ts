import type { CacheStoreContract, InMemoryValue } from '@ioc:Adonis/Addons/Cache'

import BaseStore from './BaseStore'

import { DateTime } from 'luxon'

export default class InMemory extends BaseStore implements CacheStoreContract {
  constructor(private store = new Map<string, InMemoryValue<any>>()) {
    super()
  }

  public async get<T = any>(key: string): Promise<T | null> {
    const record = this.store.get(this.buildKey(key))

    if (record) {
      if (this.isStaleRecord(record)) {
        await this.forget(key)

        return null
      }

      return this.deserialize<T>(record.value)
    }

    return null
  }

  public async many<T extends Record<string, any>>(keys: Array<string>): Promise<T> {
    const records = {}

    const values = await Promise.all(keys.map((key) => this.get<T>(key)))

    for (let i = 0; i < values.length; ++i) {
      const value = values[i]

      records[keys[i]] = value ? value : null
    }

    return records as T
  }

  public async has(key: string): Promise<boolean> {
    return (await this.get(key)) && this.store.has(this.buildKey(key))
  }

  public async put<T = any>(key: string, value: T, ttl: number): Promise<boolean> {
    return this.set<T>(key, value, DateTime.local().toMillis() + ttl)
  }

  public async putMany(list: Record<string, unknown>, ttl: number): Promise<Array<boolean>> {
    const promiseArray: Array<Promise<boolean>> = []

    for (const [key, value] of Object.entries(list)) {
      promiseArray.push(this.put(key, value, ttl))
    }

    return Promise.all(promiseArray)
  }

  public async increment(key: string, value: number): Promise<number | boolean> {
    return await this.incrementOrDecrement(key, (currentValue: number) => {
      return currentValue + value
    })
  }

  public async decrement(key: string, value: number): Promise<number | boolean> {
    return this.incrementOrDecrement(key, (currentValue: number) => {
      return currentValue - value
    })
  }

  public async forever<T = any>(key: string, value: T): Promise<boolean> {
    return this.set<T>(key, value, 0)
  }

  public async putManyForever(list: Record<string, unknown>): Promise<Array<boolean>> {
    const promiseArray: Array<Promise<boolean>> = []

    for (const [key, value] of Object.entries(list)) {
      promiseArray.push(this.forever(key, value))
    }

    return Promise.all(promiseArray)
  }

  public async forget(_key: string): Promise<boolean> {
    const key = this.buildKey(_key)

    if (this.store.has(key)) {
      this.store.delete(key)

      return true
    }

    return false
  }

  public async flush(): Promise<boolean> {
    this.store.clear()

    return true
  }

  private async incrementOrDecrement(
    _key: string,
    callback: (value: number) => number
  ): Promise<number | boolean> {
    if (await this.get(_key)) {
      const key = this.buildKey(_key)
      const record = this.store.get(key)

      if (record) {
        const currentValue = parseInt(this.deserialize(record.value))

        if (isNaN(currentValue)) {
          return false
        }

        const newValue = callback(currentValue)
        record.value = this.serialize(newValue)
        this.store.set(key, record)

        return newValue
      }
    }

    return false
  }

  private set<T = any>(key: string, value: T, ttl: number): boolean {
    this.store.set(this.buildKey(key), {
      expiration: ttl,
      value: this.serialize(value)
    })

    return true
  }
}
