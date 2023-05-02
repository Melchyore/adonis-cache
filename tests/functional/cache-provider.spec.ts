import { test } from '@japa/runner'

import { getCacheConfig, fs, setup } from '../../bin/test/config'
import CacheManager from '../../src/CacheManager'

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
})
