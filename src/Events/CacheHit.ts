import type { CacheEventContract } from '@ioc:Adonis/Addons/Cache'

import CacheEvents from '../Enums/CacheEvents'

export default class CacheHit implements CacheEventContract {
  public EVENT = CacheEvents.Hit

  constructor(public key: string, public value: unknown) {}

  public toJSON() {
    return {
      key: this.key,
      value: this.value
    }
  }
}
