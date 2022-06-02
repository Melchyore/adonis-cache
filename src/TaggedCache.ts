import type { CacheStoreContract, TaggedCacheContract } from '@ioc:Adonis/Addons/Cache'

import TagSet from './TagSet'
import Repository from './Repository'
import Utils from './Utils'

export default class TaggedCache extends Repository implements TaggedCacheContract {
  constructor(_store: CacheStoreContract, protected _tags: TagSet, protected _prefix: string) {
    super(_store, _prefix)
  }

  /*public setConfig (config: CacheConfig, driverConfig: CacheStoreConfig): void {
    super.setConfig(config, driverConfig)
  }

  public setEventDispatcher (emitter: EmitterContract): void {
    super.setEventDispatcher(emitter)
  }*/

  public async taggedItemKey(key: string) {
    return Utils.sha1(await this._tags.getNamespace()) + ':' + key
  }

  protected itemKey(key: string): Promise<string> {
    return this.taggedItemKey(key)
  }
}
