declare module '@ioc:Adonis/Core/Application' {
  import Cache, {
    AbstractCtor,
    Constructor,
    BaseStoreContract,
    TaggableStoreContract
  } from '@ioc:Adonis/Addons/Cache'

  export interface ContainerBindings {
    'Adonis/Addons/Cache': typeof Cache
    'Adonis/Addons/Cache/Stores': {
      BaseCacheStore: Constructor<BaseStoreContract>
      TaggableStore: AbstractCtor<TaggableStoreContract>
    }
  }
}
