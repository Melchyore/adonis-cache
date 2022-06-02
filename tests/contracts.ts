import type { FileStoreConfig } from '@ioc:Adonis/Addons/Cache'
import type { InferStoresFromConfig } from '../config'

import cacheConfig from './config/cache'

declare module '@ioc:Adonis/Addons/Cache' {
  export interface RepositoryContract {
    readonly config: CacheConfig

    readonly driverConfig: CacheStoreConfig

    readonly store: CacheStoreContract
  }

  export interface CacheStores {
    dummy: {
      implementation: any
      config: {
        driver: 'dummy'
      }
    }
  }

  export interface CacheStoresList extends InferStoresFromConfig<typeof cacheConfig> {}
}

declare module '@ioc:Adonis/Core/Drive' {
  export interface DisksList {
    cache: {
      config: FileStoreConfig
      implementation: LocalDriverContract
    }
  }
}

declare module '@ioc:Adonis/Addons/Redis' {
  export interface RedisConnectionsList {
    primary: RedisConnectionConfig
  }
}
