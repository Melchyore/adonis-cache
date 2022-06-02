import type { CacheEventContract } from '@ioc:Adonis/Addons/Cache'

import CacheEvents from '../Enums/CacheEvents'

export default class CacheKeyWritten implements CacheEventContract {
  public EVENT = CacheEvents.KeyWritten

  constructor(public key: string, public value: unknown, public expiration: number) {}

  public toJSON() {
    return {
      key: this.key,
      value: this.value,
      expiration: this.expiration
    }
  }
}
