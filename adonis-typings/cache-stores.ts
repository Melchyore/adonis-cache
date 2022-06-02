declare module '@ioc:Adonis/Addons/Cache/Stores' {
  import {
    Constructor,
    AbstractCtor,
    BaseStoreContract,
    TaggableStoreContract
  } from '@ioc:Adonis/Addons/Cache'

  export const BaseCacheStore: Constructor<BaseStoreContract>
  export const TaggableStore: AbstractCtor<TaggableStoreContract>
}
