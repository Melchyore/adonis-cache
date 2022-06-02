import type { RedisStoreContract } from '@ioc:Adonis/Addons/Cache'

import crypto from 'crypto'

import TaggedCache from './TaggedCache'

export default class RedisTaggedCache extends TaggedCache {
  public static readonly REFERENCE_KEY_FOREVER = 'forever_ref'

  public static readonly REFERENCE_KEY_STANDARD = 'standard_ref'

  /*constructor (_store: CacheStoreContract, _tags: TagSet) {
    super(_store, _tags)
  }*/

  public async put<T = any>(key: string, value: T, ttl?: number): Promise<boolean> {
    this.pushStandardKeys(await this._tags.getNamespace(), key)

    return await super.put(key, value, ttl)
  }

  public async forever<T = any>(key: string, value: T): Promise<boolean> {
    this.pushStandardKeys(await this._tags.getNamespace(), key)

    return await super.forever(key, value)
  }

  private pushStandardKeys(namespace: string, key: string): void {
    this.pushKeys(namespace, key, RedisTaggedCache.REFERENCE_KEY_STANDARD)
  }

  private async pushKeys(namespace: string, key: string, reference: string): Promise<void> {
    const fullKey =
      this.store.prefix + crypto.createHash('sha1').update(namespace).digest('hex') + ':' + key

    for (const segment of namespace.split('|')) {
      await (this._store as RedisStoreContract)
        .connection()
        .sadd(this.referenceKey(segment, reference), fullKey)
    }
  }

  private referenceKey(segment: string, suffix: string): string {
    return this.store.prefix + segment + ':' + suffix
  }
}
