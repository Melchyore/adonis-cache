import type {
  CacheStoreContract,
  TaggedCacheContract,
  CacheStoresList
} from '@ioc:Adonis/Addons/Cache'

import TagSet from './TagSet'
import Repository from './Repository'
import Utils from './Utils'

export default class TaggedCache
  extends Repository<keyof CacheStoresList>
  implements TaggedCacheContract
{
  constructor(_store: CacheStoreContract, protected _tags: TagSet, protected _prefix: string) {
    super(_store, _prefix)
  }

  public async taggedItemKey(key: string) {
    return Utils.sha1(await this._tags.getNamespace()) + ':' + key
  }

  protected itemKey(key: string): Promise<string> {
    return this.taggedItemKey(key)
  }
}
