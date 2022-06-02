import type { CacheStoreContract, TaggedCacheContract } from '@ioc:Adonis/Addons/Cache'

import BaseStore from '../Stores/BaseStore'
import TaggedCache from '../TaggedCache'
import TagSet from '../TagSet'

export default abstract class TaggableStore extends BaseStore {
  constructor() {
    super()
  }

  public tags(names: Array<string>): TaggedCacheContract {
    const self = this as unknown as CacheStoreContract
    const tagSet = new TagSet(self, names)

    return new TaggedCache(self, tagSet, this.prefix)
  }
}
