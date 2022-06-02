import type { CacheRecord } from '@ioc:Adonis/Addons/Cache'

import { DateTime } from 'luxon'

export default class BaseStore {
  private prefixKey: string

  constructor() {}

  public setPrefix(prefix: string): void {
    this.prefixKey = prefix
  }

  public get prefix(): string {
    return this.prefixKey
  }

  public calculateTTL(ttlInMilliseconds: number): number {
    return ttlInMilliseconds
  }

  /*protected removePrefixFromKey (key: string): string {
    if (key.startsWith(this.prefixKey)) {
      return key.replace(this.prefixKey, '')
    }

    return key
  }*/

  protected buildKey(key: string): string {
    return `${this.prefix}${key}`
  }

  protected serialize(value: unknown): string {
    return JSON.stringify(value)
  }

  protected deserialize<T>(value: string): T {
    return JSON.parse(value) as T
  }

  protected isStaleRecord(record: CacheRecord): boolean {
    const expiration = record.expiration

    if (expiration) {
      if (typeof expiration === 'number') {
        return expiration !== 0 && DateTime.now().toMillis() >= expiration
      } else {
        return DateTime.now().toMillis() >= DateTime.fromJSDate(expiration).toMillis()
      }
    }

    return false
  }
}
