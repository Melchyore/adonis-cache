import { CacheStores, CacheEventsConfig } from '@ioc:Adonis/Addons/Cache'

/**
 * Expected shape of the config accepted by the "cacheConfig"
 * method
 */
type CacheConfig = {
  prefix: string
  stores: {
    [name: string]: {
      [K in keyof CacheStores]: CacheStores[K]['config'] & { driver: K }
    }[keyof CacheStores]
  }
  ttl: number
  events: CacheEventsConfig
}

/**
 * Define config for cache
 */
export function cacheConfig<T extends CacheConfig & { store: keyof T['stores'] }>(config: T): T {
  return config
}

/**
 * Pull stores from the config defined inside the "config/cache.ts"
 * file
 */
export type InferStoresFromConfig<T extends CacheConfig> = {
  [K in keyof T['stores']]: CacheStores[T['stores'][K]['driver']]
}
