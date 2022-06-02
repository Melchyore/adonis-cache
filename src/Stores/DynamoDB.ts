import type { TableDescription } from 'aws-sdk/clients/dynamodb'
import type { CacheStoreContract, DyanmoDBTable } from '@ioc:Adonis/Addons/Cache'
import type { DynamoDBContract, Table } from '@ioc:Adonis/Addons/DynamoDB'

import { Exception } from '@poppinss/utils'
import { DateTime } from 'luxon'

import DynamoDBModel from '../Models/DynamoDB'
import BaseStore from './BaseStore'

export default class DynamoDB extends BaseStore implements CacheStoreContract {
  private store: ReturnType<typeof DynamoDBModel> & DyanmoDBTable

  constructor(private client: DynamoDBContract, private tableName: string) {
    super()

    this.store = DynamoDBModel(this.client, this.tableName) as ReturnType<typeof DynamoDBModel> &
      DyanmoDBTable
  }

  /**
   * In DynamoDB, TTL is expressed in seconds.
   */
  public calculateTTL(ttlInMilliseconds: number): number {
    return ttlInMilliseconds / 1000
  }

  public async get<T = any>(key: string): Promise<T | null> {
    try {
      //const record = await this.store.primaryKey.get(this.buildKey(key))
      const record = await this.store.primaryKey.query({
        Key: this.buildKey(key),
        ExpiresAt: ['>=', DateTime.now().toSeconds()]
      })

      if (record.length > 0) {
        const serializedRecord = record[0].toJSON()

        /*const expiration = serializedRecord.ExpiresAt

        if (DateTime.now().toSeconds() >= expiration) {
          await this.forget(key)

          return null
        }*/

        return this.deserialize<T>(serializedRecord.Value)
      }
    } catch {}

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
    return (
      (
        await this.store.primaryKey.query({
          Key: this.buildKey(key),
          ExpiresAt: ['>=', DateTime.now().toSeconds()]
        })
      ).length > 0
    )
  }

  public async put<T = any>(key: string, value: T, ttl: number): Promise<boolean> {
    try {
      await this.store
        .new({
          Key: this.buildKey(key),
          Value: this.serialize(value),
          ExpiresAt: DateTime.now().toSeconds() + ttl
        })
        .save()

      return true
    } catch {
      return false
    }
  }

  public async add<T = any>(key: string, value: T, ttl: number): Promise<boolean> {
    try {
      await this.store
        .new({
          Key: this.buildKey(key),
          Value: this.serialize(value),
          ExpiresAt: DateTime.now().toSeconds() + ttl
        })
        .save({
          conditions: {
            Key: ['not exists']
          }
        })

      return true
    } catch {
      return false
    }
  }

  public async putMany(list: Record<string, unknown>, ttl: number): Promise<Array<boolean>> {
    const records: Array<Table> = []

    try {
      for (const [key, value] of Object.entries(list)) {
        records.push(
          this.store.new({
            Key: this.buildKey(key),
            Value: this.serialize(value),
            ExpiresAt: DateTime.now().toSeconds() + ttl
          })
        )
      }

      await this.store.documentClient.batchPut(records)
    } catch {
      return Object.keys(list).map(() => false)
    }

    return Object.keys(list).map(() => true)
  }

  public async increment(key: string, value: number): Promise<number | boolean> {
    return await this.incrementOrDecrement(key, (currentValue: number) => {
      return currentValue + value
    })
  }

  public async decrement(key: string, value: number): Promise<number | boolean> {
    return await this.incrementOrDecrement(key, (currentValue: number) => {
      return currentValue - value
    })
  }

  public async putManyForever(list: Record<string, unknown>): Promise<Array<boolean>> {
    const results: Array<Promise<boolean>> = []

    for (const [key, value] of Object.entries(list)) {
      results.push(this.forever(key, value))
    }

    return Promise.all(results)
  }

  public async forever<T = any>(key: string, value: T): Promise<boolean> {
    return this.put(key, value, 60 * 60 * 24 * 365 * 5)
  }

  public async forget(key: string): Promise<boolean> {
    try {
      await this.store.primaryKey.delete(this.buildKey(key))

      return true
    } catch {
      return false
    }
  }

  public async flush(): Promise<boolean> {
    throw new Exception(
      'DynamoDb does not support flushing an entire table. Please delete then create the cache table'
    )
  }

  public async createTable(tableName: string = 'Cache'): Promise<TableDescription | null> {
    const model = DynamoDBModel(this.client, tableName)

    try {
      await model.describeTable()

      return null
    } catch {
      try {
        return await model.createTable()
      } catch (e) {
        throw new Exception(e)
      }
    }
  }

  private async incrementOrDecrement(
    key: string,
    callback: (value: number) => number
  ): Promise<number | boolean> {
    try {
      const previousValue = await this.get(key)

      if (previousValue) {
        const currentValue = parseInt(previousValue)

        if (isNaN(currentValue)) {
          return false
        }

        const newValue = callback(currentValue)

        await this.store.primaryKey
          .fromKey(this.buildKey(key))
          .set('Value', newValue.toString())
          .save({
            operator: 'update'
          })

        return newValue
      }

      return false
    } catch {
      return false
    }
  }
}
