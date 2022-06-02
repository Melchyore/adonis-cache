import type { CacheEventContract } from '@ioc:Adonis/Addons/Cache'

import CacheEvents from '../Enums/CacheEvents'

export default class CacheKeyForgotten implements CacheEventContract {
  public EVENT = CacheEvents.KeyForgotten

  constructor(public key: string) {}

  public toJSON() {
    return {
      key: this.key
    }
  }
}
