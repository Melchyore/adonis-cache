import type { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import type { CacheStoreContract, CacheRecord } from '@ioc:Adonis/Addons/Cache'

import { DateTime } from 'luxon'

import BaseStore from './BaseStore'

export default class Database extends BaseStore implements CacheStoreContract {
  constructor(private connection: QueryClientContract, private table: string) {
    super()
  }

  public async get<T = any>(key: string): Promise<T | null> {
    try {
      const record = (await this.connection
        .from(this.table)
        .where('key', this.buildKey(key))
        .firstOrFail()) as CacheRecord

      if (this.isStaleRecord(record)) {
        await this.forget(key)

        return null
      }

      return this.deserialize<T>(record.value)
    } catch {
      return null
    }
  }

  public async many<T extends Record<string, any>>(keys: Array<string>): Promise<T> {
    const records = await this.connection
      .from(this.table)
      .whereIn(
        'key',
        keys.map((key) => this.buildKey(key))
      )
      .andWhere('expiration', '>', DateTime.now().toISO())
      .orWhereNull('expiration')

    const values = records.reduce((accumulator, record) => {
      accumulator[record.key.replace(this.prefix, '')] = this.deserialize<T>(record.value)

      return accumulator
    }, {})

    const result = {}

    keys.forEach((key) => {
      result[key] = values[key] ?? null
    })

    return result as T
  }

  public async has(key: string): Promise<boolean> {
    try {
      const record = await this.connection
        .from(this.table)
        .where('key', this.buildKey(key))
        .firstOrFail()

      if (this.isStaleRecord(record)) {
        await this.forget(key)

        return false
      }

      return true
    } catch {
      return false
    }
  }

  public async put<T = any>(key: string, value: T, ttl: number): Promise<boolean> {
    return (
      (await this.insert<T>(key, value, DateTime.now().plus({ milliseconds: ttl }).toISO())) >= 1
    )
  }

  /**
   * Store a new item in the cache if the key doesn't exist.
   * Otherwise, update a stale item with a value and a new TTL.
   */
  public async add<T = any>(_key: string, value: T, ttl: number): Promise<boolean> {
    const key = this.buildKey(_key)
    const val = this.serialize(value)
    const expiration = DateTime.now().plus({ milliseconds: ttl }).toISO()

    let result: Array<unknown> = []

    try {
      result = await this.connection.table(this.table).insert({
        key,
        value: val,
        expiration
      })
    } catch {
      result = await this.connection
        .from(this.table)
        .where('key', key)
        .andWhere('expiration', '<', DateTime.now().toISO())
        .update({
          value: val,
          expiration
        })
    }

    return this.getResultNumber(result) >= 1
  }

  public async putMany(list: Record<string, unknown>, ttl: number): Promise<Array<boolean>> {
    const promiseArray: Array<Promise<boolean>> = []

    for (const [key, value] of Object.entries(list)) {
      promiseArray.push(this.put(key, value, ttl))
    }

    return Promise.all(promiseArray)
  }

  public async increment(key: string, value: number): Promise<number | boolean> {
    return await this.incrementValue(key, value)
  }

  public async decrement(key: string, value: number): Promise<number | boolean> {
    return await this.decrementValue(key, value)
  }

  public async putManyForever(list: Record<string, unknown>): Promise<Array<boolean>> {
    const promiseArray: Array<Promise<boolean>> = []

    for (const [key, value] of Object.entries(list)) {
      promiseArray.push(this.forever(key, value))
    }

    return Promise.all(promiseArray)
  }

  public async forever<T = any>(key: string, value: T): Promise<boolean> {
    return (await this.insert<T>(key, value)) === 1
  }

  public async forget(key: string): Promise<boolean> {
    return (
      this.getResultNumber(
        await this.connection.from(this.table).where('key', this.buildKey(key)).delete()
      ) > 0
    )
  }

  public async flush(): Promise<boolean> {
    await this.connection.from(this.table).delete()

    return true
  }

  private async insert<T = any>(_key: string, val: T, expiration?: string) {
    const key = this.buildKey(_key)
    const value = this.serialize(val)
    let result: Array<unknown>

    try {
      result = await this.connection.table(this.table).insert({
        key,
        value,
        expiration
      })
    } catch {
      result = await this.connection.from(this.table).where('key', key).update({
        value,
        expiration
      })
    }

    return this.getResultNumber(result)
  }

  private async incrementValue(_key: string, value: number): Promise<number | boolean> {
    const key = this.buildKey(_key)

    const incrementedValue = await this.connection.transaction(async (trx) => {
      try {
        const record = await trx.from(this.table).where('key', key).firstOrFail()
        const previousValue = this.deserialize<number>(record.value)

        if (isNaN(previousValue)) {
          return false
        }

        const newValue = previousValue + value

        await trx.from(this.table).where('key', key).update({
          value: newValue
        })

        return newValue
      } catch {
        return false
      }
    })

    return incrementedValue
  }

  private async decrementValue(_key: string, value: number): Promise<number | boolean> {
    const key = this.buildKey(_key)

    const decrementedValue = await this.connection.transaction(async (trx) => {
      try {
        const record = await trx.from(this.table).where('key', key).firstOrFail()
        const previousValue = this.deserialize<number>(record.value)

        if (isNaN(previousValue)) {
          return false
        }

        const newValue = previousValue - value

        await trx.from(this.table).where('key', key).update({
          value: newValue
        })

        return newValue
      } catch {
        return false
      }
    })

    return decrementedValue
  }

  /**
   * Check if query result is an Array or a number.
   * If it's an array, return its length.
   */
  private getResultNumber(result: Array<unknown> | number): number {
    if (Array.isArray(result)) {
      return result.length
    }

    return result
  }
}
