import type { CacheStoreConfig } from '@ioc:Adonis/Addons/Cache'

import { test } from '@japa/runner'

import { getCacheConfig, fs, setup, getDummyStore } from '../bin/test/config'
import CacheManager from '../src/CacheManager'

const cacheConfig = getCacheConfig()

test.group('Cache Provider', (group) => {
  group.each.teardown(async () => {
    await fs.cleanup()
  })

  test('register cache provider', async ({ expect }) => {
    const app = await setup('test', cacheConfig)
    const Cache = app.container.use('Adonis/Addons/Cache')

    expect(Cache).toBeInstanceOf(CacheManager)
  })

  test('raise error when config is missing', async ({ expect }) => {
    const app = await setup('test', {})

    expect(() => app.container.use('Adonis/Addons/Cache')).toThrowError(
      'Invalid "cache" config. Missing value for "store". Make sure to set it inside the "config/cache" file'
    )
  })

  test('extend by adding a new store', async ({ expect }) => {
    const app = await setup('test', cacheConfig)
    const Cache = app.container.use('Adonis/Addons/Cache')
    const { BaseCacheStore } = app.container.use('Adonis/Addons/Cache/Stores')

    const DummyStore = getDummyStore(BaseCacheStore)

    Cache.extend('dummy', (_, __, config: CacheStoreConfig) => {
      return Cache.repository(config, new DummyStore())
    })

    const Dummy = Cache.use('dummy')

    expect(Dummy.store).toBeInstanceOf(DummyStore)
    expect(Dummy.driverConfig.driver).toStrictEqual('dummy')
  })
})
