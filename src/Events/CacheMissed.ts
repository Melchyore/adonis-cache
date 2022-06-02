import type { CacheEventContract } from '@ioc:Adonis/Addons/Cache'

import CacheEvents from '../Enums/CacheEvents'

export default class CacheMissed implements CacheEventContract {
  public EVENT = CacheEvents.Missed

  constructor(public key: string) {}

  public toJSON() {
    return {
      key: this.key
    }
  }
}
