import type { DriverContract } from '@ioc:Adonis/Core/Drive'
import type { CacheStoreContract } from '@ioc:Adonis/Addons/Cache'

import { DateTime } from 'luxon'
import { join } from 'path'

import BaseStore from './BaseStore'
import Utils from '../Utils'

export default class File extends BaseStore implements CacheStoreContract {
  constructor(private drive: DriverContract) {
    super()
  }

  public async get<T = any>(key: string): Promise<T | null> {
    try {
      return (await this.getPayload<T>(key))!.value
    } catch {
      return null
    }
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
    return (await this.get(key)) && (await this.drive.exists(this.path(key)))
  }

  public async put<T = any>(key: string, value: T, ttl: number): Promise<boolean> {
    try {
      await this.drive.put(
        this.path(key),
        String(DateTime.now().toMillis() + ttl) + this.serialize(value)
      )

      return true
    } catch (e) {
      console.error(e)

      return false
    }
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

  public async putManyForever(list: Record<string, unknown>): Promise<Array<boolean>> {
    const promiseArray: Array<Promise<boolean>> = []

    for (const [key, value] of Object.entries(list)) {
      promiseArray.push(this.forever(key, value))
    }

    return Promise.all(promiseArray)
  }

  public async forever<T = any>(key: string, value: T): Promise<boolean> {
    return await this.put(key, value, DateTime.now().plus({ years: 5 }).toMillis())
  }

  public async forget(_key: string): Promise<boolean> {
    const key = this.path(_key)

    if (await this.drive.exists(key)) {
      await this.drive.delete(key)

      return true
    }

    return false
  }

  public async flush(): Promise<boolean> {
    const path = './cache'

    if (await this.drive.exists(path)) {
      await this.drive.delete(path)

      return true
    }

    return false
  }

  private async getPayload<T>(key: string): Promise<{ expiration: number; value: T } | null> {
    const contents = (await this.drive.get(this.path(key))).toString()
    const expiration = parseInt(contents.substring(0, 13))

    if (this.isStaleRecord({ value: contents, expiration })) {
      await this.forget(key)

      return null
    }

    return {
      expiration,
      value: this.deserialize<T>(contents.substring(13, contents.length))
    }
  }

  private async incrementOrDecrement(
    key: string,
    callback: (value: number) => number
  ): Promise<number | boolean> {
    try {
      const record = await this.getPayload(key)

      if (record) {
        const currentValue = parseInt(this.deserialize(record.value as string))

        if (isNaN(currentValue)) {
          return false
        }

        const newValue = callback(currentValue)

        await this.drive.put(this.path(key), String(record.expiration) + this.serialize(newValue))

        return newValue
      }

      return false
    } catch {
      return false
    }
  }

  private path(key: string): string {
    const hash = Utils.sha1(this.buildKey(key))
    const parts = Utils.chunks(hash, 2).slice(0, 2)

    return join('cache', ...parts, hash)
  }
}
