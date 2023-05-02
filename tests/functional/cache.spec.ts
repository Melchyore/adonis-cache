import type { CacheStoreConfig } from '@ioc:Adonis/Addons/Cache'

import { test } from '@japa/runner'

import { sleep } from '../../test-helpers/utils'
import {
  getCacheConfig,
  setup,
  fs,
  getDummyStore,
  getTaggableDummyStore,
  getCache
} from '../../bin/test/config'

import CacheManager from '../../src/CacheManager'
import BaseStore from '../../src/Stores/BaseStore'
import TaggableStore from '../../src/Stores/TaggableStore'
import InMemory from '../../src/Stores/InMemory'
import Memcached from '../../src/Stores/Memcached'
import Redis from '../../src/Stores/Redis'

const cacheConfig = getCacheConfig()

test.group('Cache Manager', (group) => {
  group.each.teardown(async () => {
    await fs.cleanup()
  })

  test('get default store', async ({ expect }) => {
    const app = await setup('test', {})
    const Cache = new CacheManager(app, cacheConfig)

    expect(Cache.use().driverConfig.driver).toStrictEqual(cacheConfig.store)
    expect(Cache.use().store).toBeInstanceOf(InMemory)
  })

  test('use another store', async ({ expect }) => {
    const app = await setup('test', {})
    const Cache = new CacheManager(app, cacheConfig)

    const MemcachedCache = Cache.use('memcached')
    const RedisCache = Cache.use('redis')

    expect(MemcachedCache.driverConfig.driver).toStrictEqual('memcached')
    expect(MemcachedCache.store).toBeInstanceOf(Memcached)

    expect(RedisCache.driverConfig.driver).toStrictEqual('redis')
    expect(RedisCache.store).toBeInstanceOf(Redis)
  })

  test('extend by adding a new store should throw exception if config is not provided', async ({
    expect
  }) => {
    const app = await setup('test', {})

    const Cache = new CacheManager(app, cacheConfig)

    const DummyStore = getDummyStore(BaseStore)

    Cache.extend('dummy', () => {
      // @ts-ignore
      return Cache.repository(null, new DummyStore())
    })

    expect(() => Cache.use('dummy')).toThrowError(
      'You must provide the driver configuration as first argument'
    )
  })

  test('extend by adding a new store', async ({ expect }) => {
    const app = await setup('test', {})

    const Cache = new CacheManager(app, cacheConfig)

    const DummyStore = getDummyStore(BaseStore)

    Cache.extend('dummy', (_, __, config: CacheStoreConfig) => {
      return Cache.repository(config, new DummyStore())
    })

    const Dummy = Cache.use('dummy')

    expect(Dummy.store).toBeInstanceOf(DummyStore)
  })

  test('extend by adding a new taggable store', async ({ expect }) => {
    const app = await setup('test', {})

    const Cache = new CacheManager(app, cacheConfig)

    const DummyStore = getTaggableDummyStore(TaggableStore)

    Cache.extend('dummy', (_, __, config: CacheStoreConfig) => {
      return Cache.repository(config, new DummyStore())
    })

    const Dummy = Cache.use('dummy')

    expect(Dummy.store).toBeInstanceOf(DummyStore)
  })
})

test.group('Cache Manager - Database store', (group) => {
  group.each.teardown(async () => {
    await fs.cleanup()
  })

  test('add method', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    expect(await Cache.add(key, value)).toBeTruthy()
    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('set method', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.set(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('put method', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    expect(await Cache.put(key, value)).toBeTruthy()
    expect(await Cache.get(key)).toStrictEqual(value)
  }).disableTimeout()

  test('put method with customm ttl', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    expect(await Cache.put(key, value, 30)).toBeTruthy()

    await sleep(4)

    expect(await Cache.get(key)).toStrictEqual(value)
  }).disableTimeout()

  test('put method should throw exception if ttl is nagative', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'

    expect(async () => await Cache.put(key, 'John Doe', -1000)).rejects.toThrowError(
      'Expiration time (TTL) cannot be negative'
    )
  })

  test('putMany method should cache all the values', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    const result = await Cache.putMany(list)

    expect(Object.values(result).every(Boolean)).toBeTruthy()

    for (const [key, value] of Object.entries(list)) {
      expect(await Cache.has(key)).toBeTruthy()
      expect(await Cache.get(key)).toStrictEqual(value)
    }
  })

  test('putMany method should cache all the values with custom ttl', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    await Cache.putMany(list, 60 * 60 * 24)

    await sleep(3000)

    for (const [key, value] of Object.entries(list)) {
      expect(await Cache.get(key)).toStrictEqual(value)
    }
  }).disableTimeout()

  test('putManyForever method should cache all the values without ttl', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    await Cache.putManyForever(list)

    await sleep(3000)

    for (const [key, value] of Object.entries(list)) {
      expect(await Cache.get(key)).toStrictEqual(value)
    }
  }).disableTimeout()

  test('get method', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('get method should delete cached value if it is called and has expired', async ({
    expect
  }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe', 3)

    await sleep(4000)

    const value = await Cache.get<null>(key)

    expect(await Cache.has(key)).toBeFalsy()
    expect(value).toBeNull()
  }).disableTimeout()

  test('get method should return value if key not found and fallback defined as a raw value', async ({
    expect
  }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    expect(await Cache.get(key, value)).toStrictEqual(value)
    expect(await Cache.has(key)).toBeFalsy()
  })

  test('get method should return value if key not found and fallback defined as a closure', async ({
    expect
  }) => {
    const Cache = await getCache('database', cacheConfig)

    const data = [
      {
        name: 'John Doe'
      },
      {
        name: 'Anna'
      }
    ]

    const value = await Cache.get('test', async () => {
      await sleep(500)

      return data
    })

    expect(value).toStrictEqual(data)
  })

  test('get method should not cache value if key not found and fallback defined', async ({
    expect
  }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'

    await Cache.get(key, 'John Doe')

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('get method should return cached value using forever method', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.forever(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('has method should return true if key is found', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe')

    expect(await Cache.has(key)).toBeTruthy()
  })

  test('has method should return false if key is not found', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    expect(await Cache.has('test')).toBeFalsy()
  })

  test('increment method should increment the value of an existing record and return the new value', async ({
    expect
  }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'
    const value = 5

    await Cache.put(key, value)

    expect(await Cache.increment(key, 2)).toStrictEqual(7)
    expect(await Cache.get(key)).toStrictEqual(7)
  })

  test('increment method should not change value if it is not a number and return false', async ({
    expect
  }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.increment(key, 2)).toBeFalsy()
    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('increment method should return false if key not found', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    expect(await Cache.increment('test', 1)).toBeFalsy()
  })

  test('decrement method should decrement the value of an existing record and return the new value', async ({
    expect
  }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'
    const value = 5

    await Cache.put(key, value)

    expect(await Cache.decrement(key, 2)).toStrictEqual(3)
    expect(await Cache.get(key)).toStrictEqual(3)
  })

  test('decrement method should not change value if it is not a number and return false', async ({
    expect
  }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.decrement(key, 2)).toBeFalsy()
    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('decrement method should return false if key not found', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    expect(await Cache.decrement('test', 1)).toBeFalsy()
  })

  test('forever method should cache a value without expiration', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'

    await Cache.forever(key, 'John Doe')

    await sleep(3000)

    expect(await Cache.has(key)).toBeTruthy()
  }).disableTimeout()

  test('pull method should retrieve cached item and delete it from cache', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    const pulled = await Cache.pull(key)

    expect(await Cache.has(key)).toBeFalsy()
    expect(pulled).toStrictEqual(value)
  })

  test('forget method should delete cached value using put method', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe')

    expect(await Cache.has(key)).toBeTruthy()

    await Cache.forget(key)

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('forget method should delete cached value using put method with custom ttl', async ({
    expect
  }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe', 60 * 60 * 24)

    expect(await Cache.has(key)).toBeTruthy()

    await Cache.forget(key)

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('forget method should delete cached value using forever method', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'

    await Cache.forever(key, 'John Doe')

    expect(await Cache.has(key)).toBeTruthy()

    await Cache.forget(key)

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('forgetMultiple method should delete all cached value by keys', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key1 = 'test'
    const key2 = 'foo'

    const records = {
      [key1]: 'John Doe',
      [key2]: 'Anna'
    }

    await Cache.putMany(records)

    expect(await Cache.many(Object.keys(records))).toStrictEqual(records)

    await Cache.forgetMultiple(Object.keys(records))

    expect(await Cache.many(Object.keys(records))).toStrictEqual({
      [key1]: null,
      [key2]: null
    })
  })

  test('remember method should return cached value using put method', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'
    const value = 'John Doe'
    const fallbackValue = 'Anna'

    await Cache.put(key, value)

    const cachedValue = await Cache.remember(key, null, async () => fallbackValue)

    expect(cachedValue).toStrictEqual(value)
  })

  test('remember method should cache fallback value and return it if key not found', async ({
    expect
  }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'
    const fallbackValue = 'Anna'

    const cachedValue = await Cache.remember(key, null, async () => {
      await sleep(500)

      return fallbackValue
    })

    expect(await Cache.has(key)).toBeTruthy()
    expect(await Cache.get(key)).toStrictEqual(fallbackValue)
    expect(cachedValue).toStrictEqual(fallbackValue)
  })

  test('remember method should throw exception if closure is not a function', async ({
    expect
  }) => {
    const Cache = await getCache('database', cacheConfig)

    expect(
      // @ts-ignore
      async () => await Cache.remember('test', null, null)
    ).rejects.toThrowError('Closure must be a function')
  })

  test('remember method should throw exception if ttl is negative', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    expect(
      async () => await Cache.remember('test', -200, async () => 'John Doe')
    ).rejects.toThrowError('Expiration time (TTL) cannot be negative')
  })

  test('sear method should cache an item forever', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    const cachedValue = await Cache.sear(key, async () => value)

    expect(await Cache.has(key)).toBeTruthy()
    expect(cachedValue).toStrictEqual(value)
  })

  test('rememberForever method should return cached value using put method', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'
    const value = 'John Doe'
    const fallbackValue = 'Anna'

    await Cache.put(key, value)

    const cachedValue = await Cache.rememberForever(key, async () => fallbackValue)

    expect(cachedValue).toStrictEqual(value)
  })

  test('rememberForever method should return 0 as a valid value', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'

    await Cache.rememberForever(key, async () => 0)

    const cachedValue = await Cache.rememberForever(key, async () => 1)

    expect(cachedValue).toStrictEqual(0)
  })

  test('rememberForever method should cache fallback value and return it if key not found', async ({
    expect
  }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'
    const fallbackValue = 'Anna'

    const cachedValue = await Cache.rememberForever(key, async () => {
      await sleep(500)

      return fallbackValue
    })

    expect(await Cache.has(key)).toBeTruthy()
    expect(await Cache.get(key)).toStrictEqual(fallbackValue)
    expect(cachedValue).toStrictEqual(fallbackValue)
  })

  test('rememberForever method should throw exception if closure is not a function', async ({
    expect
  }) => {
    const Cache = await getCache('database', cacheConfig)

    expect(
      // @ts-ignore
      async () => await Cache.rememberForever('test', null)
    ).rejects.toThrowError('Closure must be a function')
  })

  test('many method should return an object of key-value if keys are found', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key1 = 'test'
    const value1 = 'John Doe'
    const key2 = 'foo'
    const value2 = 'Anna'

    await Cache.put(key1, value1)
    await Cache.put(key2, value2)

    const records = await Cache.many([key1, key2])

    expect(records).toEqual({
      [key1]: value1,
      [key2]: value2
    })
  })

  test('flush method should delete all records from the current cache store', async ({
    expect
  }) => {
    const Cache = await getCache('database', cacheConfig)

    const records = {
      test: 'John Doe',
      foo: 'Anna',
      bar: 'Lorem'
    }

    await Cache.putMany(records)

    expect(await Cache.many(Object.keys(records))).toStrictEqual(records)

    await Cache.flush()

    Object.keys(records).forEach(async (key) => {
      expect(await Cache.has(key)).toBeFalsy()
    })
  })

  test('clear method should delete all records from the current cache store', async ({
    expect
  }) => {
    const Cache = await getCache('database', cacheConfig)

    const records = {
      test: 'John Doe',
      foo: 'Anna',
      bar: 'Lorem'
    }

    await Cache.putMany(records)

    expect(await Cache.many(Object.keys(records))).toStrictEqual(records)

    await Cache.clear()

    Object.keys(records).forEach(async (key) => {
      expect(await Cache.has(key)).toBeFalsy()
    })
  })

  test('missing method should return true if key is not found', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    expect(await Cache.missing('test')).toBeTruthy()
  })

  test('missing method should return false if key is found', async ({ expect }) => {
    const Cache = await getCache('database', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe')

    expect(await Cache.missing(key)).toBeFalsy()

    await Cache.clear()
  })
})

test.group('Cache Manager - DynamoDB', (group) => {
  group.teardown(async () => {
    await fs.cleanup()
  })

  test('add method', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.add(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  }).disableTimeout()

  test('set method', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.set(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  }).disableTimeout()

  test('put method', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  }).disableTimeout()

  test('put method with custom ttl', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe', 3)
    await sleep(4000)

    expect(await Cache.get(key)).toStrictEqual(null)
  }).disableTimeout()

  test('put method should throw exception if ttl is nagative', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'

    expect(async () => await Cache.put(key, 'John Doe', -200)).rejects.toThrowError(
      'Expiration time (TTL) cannot be negative'
    )
  }).disableTimeout()

  test('putMany method should cache all the values', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    const result = await Cache.putMany(list)

    expect(Object.values(result).every(Boolean)).toBeTruthy()

    for (const [key, value] of Object.entries(list)) {
      expect(await Cache.has(key)).toBeTruthy()
      expect(await Cache.get(key)).toStrictEqual(value)
    }
  }).disableTimeout()

  test('putMany method should cache all the values with custom ttl', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    await Cache.putMany(list, 4000)

    await sleep(3000)

    expect(await Cache.get('test')).toStrictEqual(list.test)
    expect(await Cache.get('foo')).toStrictEqual(list.foo)
  }).disableTimeout()

  test('putManyForever method should cache all the values without ttl', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    await Cache.putManyForever(list)

    await sleep(3000)

    expect(await Cache.get('test')).toStrictEqual(list.test)
    expect(await Cache.get('foo')).toStrictEqual(list.foo)
  }).disableTimeout()

  test('get method should find cached value by key', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  }).disableTimeout()

  test('get method should delete cached value if it is called and has expired', async ({
    expect
  }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe', 3)

    await sleep(4000)

    const value = await Cache.get<null>(key)

    expect(await Cache.has(key)).toBeFalsy()
    expect(value).toBeNull()
  }).disableTimeout()

  test('get method should return value if key not found and fallback defined as a raw value', async ({
    expect
  }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    expect(await Cache.get(key, value)).toStrictEqual(value)
    expect(await Cache.has(key)).toBeFalsy()
  }).disableTimeout()

  test('get method should return value if key not found and fallback defined as a closure', async ({
    expect
  }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const data = [
      {
        name: 'John Doe'
      },
      {
        name: 'Anna'
      }
    ]

    const key = 'test'
    const value = await Cache.get(key, async () => {
      await sleep(500)

      return data
    })

    expect(value).toStrictEqual(data)
  }).disableTimeout()

  test('get method should not cache value if key not found and fallback defined', async ({
    expect
  }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'

    await Cache.get(key, 'John Doe')

    expect(await Cache.has(key)).toBeFalsy()
  }).disableTimeout()

  test('get method should return cached value using forever method', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.forever(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  }).disableTimeout()

  test('has method should return true if key is found', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe')

    expect(await Cache.has(key)).toBeTruthy()
  }).disableTimeout()

  test('has method should return false if key is not found', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'

    expect(await Cache.has(key)).toBeFalsy()
  }).disableTimeout()

  test('increment method should increment the value of an existing record and return the new value', async ({
    expect
  }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'
    const value = 5

    await Cache.put(key, value)

    expect(await Cache.increment(key, 2)).toStrictEqual(7)
    expect(await Cache.get(key)).toStrictEqual(7)
  }).disableTimeout()

  test('increment method should not change value if it is not a number and return false', async ({
    expect
  }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.increment(key, 2)).toBeFalsy()
    expect(await Cache.get(key)).toStrictEqual(value)
  }).disableTimeout()

  test('increment method should return false if key not found', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    expect(await Cache.increment('test', 1)).toBeFalsy()
  }).disableTimeout()

  test('decrement method should decrement the value of an existing record and return the new value', async ({
    expect
  }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'
    const value = 5

    await Cache.put(key, value)

    expect(await Cache.decrement(key, 2)).toStrictEqual(3)
    expect(await Cache.get(key)).toStrictEqual(3)
  }).disableTimeout()

  test('decrement method should not change value if it is not a number and return false', async ({
    expect
  }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.decrement(key, 2)).toBeFalsy()
    expect(await Cache.get(key)).toStrictEqual(value)
  }).disableTimeout()

  test('decrement method should return false if key not found', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    expect(await Cache.decrement('test', 1)).toBeFalsy()
  }).disableTimeout()

  test('forever method should cache a value without expiration', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'

    await Cache.forever(key, 'John Doe')

    await sleep(3000)

    expect(await Cache.has(key)).toBeTruthy()
  }).disableTimeout()

  test('pull method should retrieve cached item and delete it from cache', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    const pulled = await Cache.pull(key)

    expect(await Cache.has(key)).toBeFalsy()
    expect(pulled).toStrictEqual(value)
  }).disableTimeout()

  test('forget method should delete cached value using put method', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe')

    expect(await Cache.has(key)).toBeTruthy()

    await Cache.forget(key)

    expect(await Cache.has(key)).toBeFalsy()
  }).disableTimeout()

  test('forget method should delete cached value using put method with custom ttl', async ({
    expect
  }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe', 60 * 60 * 24)

    expect(await Cache.has(key)).toBeTruthy()

    await Cache.forget(key)

    expect(await Cache.has(key)).toBeFalsy()
  }).disableTimeout()

  test('forget method should delete cached value using forever method', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'

    await Cache.forever(key, 'John Doe')

    expect(await Cache.has(key)).toBeTruthy()

    await Cache.forget(key)

    expect(await Cache.has(key)).toBeFalsy()
  }).disableTimeout()

  test('forgetMultiple method should delete all cached value by keys', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key1 = 'test'
    const key2 = 'foo'

    const records = {
      [key1]: 'John Doe',
      [key2]: 'Anna'
    }

    await Cache.putMany(records)

    expect(await Cache.many(Object.keys(records))).toStrictEqual(records)

    await Cache.forgetMultiple(Object.keys(records))

    expect(await Cache.many(Object.keys(records))).toStrictEqual({
      [key1]: null,
      [key2]: null
    })
  }).disableTimeout()

  test('remember method should return cached value using put method', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'
    const value = 'John Doe'
    const fallbackValue = 'Anna'

    await Cache.put(key, value)

    const cachedValue = await Cache.remember(key, null, async () => fallbackValue)

    expect(cachedValue).toStrictEqual(value)
  }).disableTimeout()

  test('remember method should cache fallback value and return it if key not found', async ({
    expect
  }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'
    const fallbackValue = 'Anna'

    const cachedValue = await Cache.remember(key, null, async () => {
      await sleep(500)

      return fallbackValue
    })

    expect(await Cache.has(key)).toBeTruthy()
    expect(await Cache.get(key)).toStrictEqual(fallbackValue)
    expect(cachedValue).toStrictEqual(fallbackValue)
  }).disableTimeout()

  test('remember method should throw exception if closure is not a function', async ({
    expect
  }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    expect(
      // @ts-ignore
      async () => await Cache.remember('test', null, null)
    ).rejects.toThrowError('Closure must be a function')
  }).disableTimeout()

  test('remember method should throw exception if ttl is negative', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    expect(
      async () => await Cache.remember('test', -200, async () => 'John Doe')
    ).rejects.toThrowError('Expiration time (TTL) cannot be negative')
  }).disableTimeout()

  test('sear method should cache an item forever', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    const cachedValue = await Cache.sear(key, async () => value)

    expect(await Cache.has(key)).toBeTruthy()
    expect(cachedValue).toStrictEqual(value)
  }).disableTimeout()

  test('rememberForever method should return cached value using put method', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'
    const value = 'John Doe'
    const fallbackValue = 'Anna'

    await Cache.put(key, value)

    const cachedValue = await Cache.rememberForever(key, async () => fallbackValue)

    expect(cachedValue).toStrictEqual(value)
  }).disableTimeout()

  test('rememberForever method should return 0 as a valid value', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'

    await Cache.rememberForever(key, async () => 0)

    const cachedValue = await Cache.rememberForever(key, async () => 1)

    expect(cachedValue).toStrictEqual(0)
  }).disableTimeout()

  test('rememberForever method should cache fallback value and return it if key not found', async ({
    expect
  }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'
    const fallbackValue = 'Anna'

    const cachedValue = await Cache.rememberForever(key, async () => {
      await sleep(500)

      return fallbackValue
    })

    expect(await Cache.has(key)).toBeTruthy()
    expect(await Cache.get(key)).toStrictEqual(fallbackValue)
    expect(cachedValue).toStrictEqual(fallbackValue)
  }).disableTimeout()

  test('rememberForever method should throw exception if closure is not a function', async ({
    expect
  }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    expect(
      // @ts-ignore
      async () => await Cache.rememberForever('test', null)
    ).rejects.toThrowError('Closure must be a function')
  }).disableTimeout()

  test('many method should return an object of key-value if keys are found', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key1 = 'test'
    const value1 = 'John Doe'
    const key2 = 'foo'
    const value2 = 'Anna'

    await Cache.put(key1, value1)
    await Cache.put(key2, value2)

    const records = await Cache.many([key1, key2])

    expect(records).toEqual({
      [key1]: value1,
      [key2]: value2
    })

    await Cache.forget(key1)
    await Cache.forget(key2)
  }).disableTimeout()

  test('flush method should throw an exception', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    expect(async () => await Cache.flush()).rejects.toThrowError(
      'DynamoDb does not support flushing an entire table. Please delete then create the cache table'
    )
  })

  test('clear method should throw an exception', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    expect(async () => await Cache.clear()).rejects.toThrowError(
      'DynamoDb does not support flushing an entire table. Please delete then create the cache table'
    )
  })

  test('missing method should return true if key is not found', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    expect(await Cache.missing('test')).toBeTruthy()
  })

  test('missing method should return false if key is found', async ({ expect }) => {
    const Cache = await getCache('dynamodb', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe')

    expect(await Cache.missing(key)).toBeFalsy()

    await Cache.forget(key)
  })
})

test.group('Cache Manager - File', (group) => {
  group.teardown(async () => {
    await fs.cleanup()
  })

  test('add method', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.add(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('put method', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('put method with custom ttl', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe', 3)
    await sleep(4000)

    expect(await Cache.get(key)).toStrictEqual(null)
  }).disableTimeout()

  test('put method should throw exception if ttl is nagative', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'

    expect(async () => await Cache.put(key, 'John Doe', -200)).rejects.toThrowError(
      'Expiration time (TTL) cannot be negative'
    )
  })

  test('putMany method should cache all the values', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    const result = await Cache.putMany(list)

    expect(Object.values(result).every(Boolean)).toBeTruthy()

    for (const [key, value] of Object.entries(list)) {
      expect(await Cache.has(key)).toBeTruthy()
      expect(await Cache.get(key)).toStrictEqual(value)
    }
  })

  test('putMany method should cache all the values with custom ttl', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    await Cache.putMany(list, 60 * 60 * 24)

    await sleep(3000)

    for (const [key, value] of Object.entries(list)) {
      expect(await Cache.get(key)).toStrictEqual(value)
    }
  }).disableTimeout()

  test('putManyForever method should cache all the values without ttl', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    await Cache.putManyForever(list)

    await sleep(3000)

    for (const [key, value] of Object.entries(list)) {
      expect(await Cache.get(key)).toStrictEqual(value)
    }
  }).disableTimeout()

  test('get method should find cached value by key', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('get method should delete cached value if it is called and has expired', async ({
    expect
  }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe', 3)

    await sleep(4000)

    const value = await Cache.get<null>(key)

    expect(await Cache.has(key)).toBeFalsy()
    expect(value).toBeNull()
  }).disableTimeout()

  test('get method should return value if key not found and fallback defined as a raw value', async ({
    expect
  }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    expect(await Cache.get(key, value)).toStrictEqual(value)
    expect(await Cache.has(key)).toBeFalsy()
  })

  test('get method should return value if key not found and fallback defined as a closure', async ({
    expect
  }) => {
    const Cache = await getCache('file', cacheConfig)

    const data = [
      {
        name: 'John Doe'
      },
      {
        name: 'Anna'
      }
    ]

    const value = await Cache.get('test', async () => {
      await sleep(500)

      return data
    })

    expect(value).toStrictEqual(data)
  })

  test('get method should not cache value if key not found and fallback defined', async ({
    expect
  }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'

    await Cache.get(key, 'John Doe')

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('get method should return cached value using forever method', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.forever(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('has method should return true if key is found', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe')

    expect(await Cache.has(key)).toBeTruthy()
  })

  test('has method should return false if key is not found', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    expect(await Cache.has('test')).toBeFalsy()
  })

  test('increment method should increment the value of an existing record and return the new value', async ({
    expect
  }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'
    const value = 5

    await Cache.put(key, value)

    expect(await Cache.increment(key, 2)).toStrictEqual(7)
    expect(await Cache.get(key)).toStrictEqual(7)
  })

  test('increment method should not change value if it is not a number and return false', async ({
    expect
  }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.increment(key, 2)).toBeFalsy()
    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('increment method should return false if key not found', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    expect(await Cache.increment('test', 1)).toBeFalsy()
  })

  test('decrement method should decrement the value of an existing record and return the new value', async ({
    expect
  }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'
    const value = 5

    await Cache.put(key, value)

    expect(await Cache.decrement(key, 2)).toStrictEqual(3)
    expect(await Cache.get(key)).toStrictEqual(3)
  })

  test('decrement method should not change value if it is not a number and return false', async ({
    expect
  }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.decrement(key, 2)).toBeFalsy()
    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('decrement method should return false if key not found', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    expect(await Cache.decrement('test', 1)).toBeFalsy()
  })

  test('forever method should cache a value without expiration', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'

    await Cache.forever(key, 'John Doe')

    await sleep(3000)

    expect(await Cache.has(key)).toBeTruthy()
  }).disableTimeout()

  test('forget method should delete cached value using put method', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe')

    expect(await Cache.has(key)).toBeTruthy()

    await Cache.forget(key)

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('forget method should delete cached value using put method with custom ttl', async ({
    expect
  }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe', 60 * 60 * 24)

    expect(await Cache.has(key)).toBeTruthy()

    await Cache.forget(key)

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('forget method should delete cached value using forever method', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'

    await Cache.forever(key, 'John Doe')

    expect(await Cache.has(key)).toBeTruthy()

    await Cache.forget(key)

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('remember method should return cached value using put method', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'
    const value = 'John Doe'
    const fallbackValue = 'Anna'

    await Cache.put(key, value)

    const cachedValue = await Cache.remember(key, null, async () => fallbackValue)

    expect(cachedValue).toStrictEqual(value)
  })

  test('remember method should cache fallback value and return it if key not found', async ({
    expect
  }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'
    const fallbackValue = 'Anna'

    const cachedValue = await Cache.remember(key, null, async () => {
      await sleep(500)

      return fallbackValue
    })

    expect(await Cache.has(key)).toBeTruthy()
    expect(await Cache.get(key)).toStrictEqual(fallbackValue)
    expect(cachedValue).toStrictEqual(fallbackValue)
  })

  test('remember method should throw exception if closure is not a function', async ({
    expect
  }) => {
    const Cache = await getCache('file', cacheConfig)

    expect(
      // @ts-ignore
      async () => await Cache.remember('test', null, null)
    ).rejects.toThrowError('Closure must be a function')
  })

  test('remember method should throw exception if ttl is negative', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    expect(
      async () => await Cache.remember('test', -200, async () => 'John Doe')
    ).rejects.toThrowError('Expiration time (TTL) cannot be negative')
  })

  test('rememberForever method should return cached value using put method', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'
    const value = 'John Doe'
    const fallbackValue = 'Anna'

    await Cache.put(key, value)

    const cachedValue = await Cache.rememberForever(key, async () => fallbackValue)

    expect(cachedValue).toStrictEqual(value)
  })

  test('rememberForever method should return 0 as a valid value', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'

    await Cache.rememberForever(key, async () => 0)

    const cachedValue = await Cache.rememberForever(key, async () => 1)

    expect(cachedValue).toStrictEqual(0)
  })

  test('rememberForever method should cache fallback value and return it if key not found', async ({
    expect
  }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'
    const fallbackValue = 'Anna'

    const cachedValue = await Cache.rememberForever(key, async () => {
      await sleep(500)

      return fallbackValue
    })

    expect(await Cache.has(key)).toBeTruthy()
    expect(await Cache.get(key)).toStrictEqual(fallbackValue)
    expect(cachedValue).toStrictEqual(fallbackValue)
  })

  test('rememberForever method should throw exception if closure is not a function', async ({
    expect
  }) => {
    const Cache = await getCache('file', cacheConfig)

    expect(
      // @ts-ignore
      async () => await Cache.rememberForever('test', null)
    ).rejects.toThrowError('Closure must be a function')
  })

  test('many method should return an object of key-value if keys are found', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key1 = 'test'
    const value1 = 'John Doe'
    const key2 = 'foo'
    const value2 = 'Anna'

    await Cache.put(key1, value1)
    await Cache.put(key2, value2)

    const records = await Cache.many([key1, key2])

    expect(records).toEqual({
      [key1]: value1,
      [key2]: value2
    })
  })

  test('flush method should delete all records from the current cache store', async ({
    expect
  }) => {
    const Cache = await getCache('file', cacheConfig)
    const records = {
      test: 'John Doe',
      foo: 'Anna',
      bar: 'Lorem'
    }

    await Cache.putMany(records)

    expect(await Cache.many(Object.keys(records))).toStrictEqual(records)

    await Cache.flush()

    Object.keys(records).forEach(async (key) => {
      expect(await Cache.has(key)).toBeFalsy()
    })
  })

  test('forgetMultiple method should delete all cached value by keys', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key1 = 'test'
    const key2 = 'foo'

    const records = {
      [key1]: 'John Doe',
      [key2]: 'Anna'
    }

    await Cache.putMany(records)

    expect(await Cache.many(Object.keys(records))).toStrictEqual(records)

    await Cache.forgetMultiple(Object.keys(records))

    expect(await Cache.many(Object.keys(records))).toStrictEqual({
      [key1]: null,
      [key2]: null
    })
  })

  test('sear method should cache an item forever', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    const cachedValue = await Cache.sear(key, async () => value)

    expect(await Cache.has(key)).toBeTruthy()
    expect(cachedValue).toStrictEqual(value)
  })

  test('pull method should retrieve cached item and delete it from cache', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    const pulled = await Cache.pull(key)

    expect(await Cache.has(key)).toBeFalsy()
    expect(pulled).toStrictEqual(value)
  })

  test('set method', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.set(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('clear method should delete all records from the current cache store', async ({
    expect
  }) => {
    const Cache = await getCache('file', cacheConfig)
    const records = {
      test: 'John Doe',
      foo: 'Anna',
      bar: 'Lorem'
    }

    await Cache.putMany(records)

    expect(await Cache.many(Object.keys(records))).toStrictEqual(records)

    await Cache.clear()

    Object.keys(records).forEach(async (key) => {
      expect(await Cache.has(key)).toBeFalsy()
    })
  })

  test('missing method should return true if key is not found', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    expect(await Cache.missing('test')).toBeTruthy()
  })

  test('missing method should return false if key is found', async ({ expect }) => {
    const Cache = await getCache('file', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe')

    expect(await Cache.missing(key)).toBeFalsy()

    await Cache.clear()
  })
})

test.group('Cache Manager - InMemory', (group) => {
  group.teardown(async () => {
    await fs.cleanup()
  })

  test('add method', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.add(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('set method', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.set(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('put method', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'foo'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('put method with custom ttl', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe', 3)
    await sleep(4000)

    expect(await Cache.get(key)).toStrictEqual(null)
  }).disableTimeout()

  test('put method should throw exception if ttl is nagative', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'

    expect(async () => await Cache.put(key, 'John Doe', -200)).rejects.toThrowError(
      'Expiration time (TTL) cannot be negative'
    )
  })

  test('putMany method should cache all the values', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    const result = await Cache.putMany(list)

    expect(Object.values(result).every(Boolean)).toBeTruthy()

    for (const [key, value] of Object.entries(list)) {
      expect(await Cache.has(key)).toBeTruthy()
      expect(await Cache.get(key)).toStrictEqual(value)
    }
  })

  test('putMany method should cache all the values with custom ttl', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    await Cache.putMany(list, 60 * 60 * 24)

    await sleep(1500)

    for (const [key, value] of Object.entries(list)) {
      expect(await Cache.get(key)).toStrictEqual(value)
    }
  })

  test('putManyForever method should cache all the values without ttl', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    await Cache.putManyForever(list)

    await sleep(1500)

    for (const [key, value] of Object.entries(list)) {
      expect(await Cache.get(key)).toStrictEqual(value)
    }
  })

  test('get method should find cached value by key', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('get method should delete cached value if it is called and has expired', async ({
    expect
  }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe', 3)

    await sleep(4000)

    const value = await Cache.get<null>(key)

    expect(await Cache.has(key)).toBeFalsy()
    expect(value).toBeNull()
  }).disableTimeout()

  test('get method should return value if key not found and fallback defined as a raw value', async ({
    expect
  }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    expect(await Cache.get(key, value)).toStrictEqual(value)
    expect(await Cache.has(key)).toBeFalsy()
  })

  test('get method should return value if key not found and fallback defined as a closure', async ({
    expect
  }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const data = [
      {
        name: 'John Doe'
      },
      {
        name: 'Anna'
      }
    ]

    const value = await Cache.get('test', async () => {
      await sleep(500)

      return data
    })

    expect(value).toStrictEqual(data)
  })

  test('get method should not cache value if key not found and fallback defined', async ({
    expect
  }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'

    await Cache.get(key, 'John Doe')

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('get method should return cached value using forever method', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.forever(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('has method should return true if key is found', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe')

    expect(await Cache.has(key)).toBeTruthy()
  })

  test('has method should return false if key is not found', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    expect(await Cache.has('test')).toBeFalsy()
  })

  test('missing method should return true if key is not found', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    expect(await Cache.missing('test')).toBeTruthy()
  })

  test('missing method should return false if key is found', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe')

    expect(await Cache.missing(key)).toBeFalsy()
  })

  test('increment method should increment the value of an existing record and return the new value', async ({
    expect
  }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'
    const value = 5

    await Cache.put(key, value)

    expect(await Cache.increment(key, 2)).toStrictEqual(7)
    expect(await Cache.get(key)).toStrictEqual(7)
  })

  test('increment method should not change value if it is not a number and return false', async ({
    expect
  }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.increment(key, 2)).toBeFalsy()
    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('increment method should return false if key not found', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    expect(await Cache.increment('test', 1)).toBeFalsy()
  })

  test('decrement method should decrement the value of an existing record and return the new value', async ({
    expect
  }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'
    const value = 5

    await Cache.put(key, value)

    expect(await Cache.decrement(key, 2)).toStrictEqual(3)
    expect(await Cache.get(key)).toStrictEqual(3)
  })

  test('decrement method should not change value if it is not a number and return false', async ({
    expect
  }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.decrement(key, 2)).toBeFalsy()
    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('decrement method should return false if key not found', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    expect(await Cache.decrement('test', 1)).toBeFalsy()
  })

  test('forever method should cache a value without expiration', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'

    await Cache.forever(key, 'John Doe')

    await sleep(1500)

    expect(await Cache.has(key)).toBeTruthy()
  })

  test('pull method should retrieve cached item and delete it from cache', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    const pulled = await Cache.pull(key)

    expect(await Cache.has(key)).toBeFalsy()
    expect(pulled).toStrictEqual(value)
  })

  test('forget method should delete cached value using put method', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe')

    expect(await Cache.has(key)).toBeTruthy()

    await Cache.forget(key)

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('forget method should delete cached value using put method with custom ttl', async ({
    expect
  }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe', 60 * 60 * 24)

    expect(await Cache.has(key)).toBeTruthy()

    await Cache.forget(key)

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('forget method should delete cached value using forever method', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'

    await Cache.forever(key, 'John Doe')

    expect(await Cache.has(key)).toBeTruthy()

    await Cache.forget(key)

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('forgetMultiple method should delete all cached value by keys', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key1 = 'test'
    const key2 = 'foo'

    const records = {
      [key1]: 'John Doe',
      [key2]: 'Anna'
    }

    await Cache.putMany(records)

    expect(await Cache.many(Object.keys(records))).toStrictEqual(records)

    await Cache.forgetMultiple(Object.keys(records))

    expect(await Cache.many(Object.keys(records))).toStrictEqual({
      [key1]: null,
      [key2]: null
    })
  })

  test('remember method should return cached value using put method', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'
    const value = 'John Doe'
    const fallbackValue = 'Anna'

    await Cache.put(key, value)

    const cachedValue = await Cache.remember(key, null, async () => fallbackValue)

    expect(cachedValue).toStrictEqual(value)
  })

  test('remember method should cache fallback value and return it if key not found', async ({
    expect
  }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'
    const fallbackValue = 'Anna'

    const cachedValue = await Cache.remember(key, null, async () => {
      await sleep(500)

      return fallbackValue
    })

    expect(await Cache.has(key)).toBeTruthy()
    expect(await Cache.get(key)).toStrictEqual(fallbackValue)
    expect(cachedValue).toStrictEqual(fallbackValue)
  })

  test('remember method should throw exception if closure is not a function', async ({
    expect
  }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    expect(
      // @ts-ignore
      async () => await Cache.remember('test', null, null)
    ).rejects.toThrowError('Closure must be a function')
  })

  test('remember method should throw exception if ttl is negative', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    expect(
      async () => await Cache.remember('test', -200, async () => 'John Doe')
    ).rejects.toThrowError('Expiration time (TTL) cannot be negative')
  })

  test('sear method should cache an item forever', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    const cachedValue = await Cache.sear(key, async () => value)

    expect(await Cache.has(key)).toBeTruthy()
    expect(cachedValue).toStrictEqual(value)
  })

  test('rememberForever method should return cached value using put method', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'
    const value = 'John Doe'
    const fallbackValue = 'Anna'

    await Cache.put(key, value)

    const cachedValue = await Cache.rememberForever(key, async () => fallbackValue)

    expect(cachedValue).toStrictEqual(value)
  })

  test('rememberForever method should return 0 as a valid value', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'

    await Cache.rememberForever(key, async () => 0)

    const cachedValue = await Cache.rememberForever(key, async () => 1)

    expect(cachedValue).toStrictEqual(0)
  })

  test('rememberForever method should cache fallback value and return it if key not found', async ({
    expect
  }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key = 'test'
    const fallbackValue = 'Anna'

    const cachedValue = await Cache.rememberForever(key, async () => {
      await sleep(500)

      return fallbackValue
    })

    expect(await Cache.has(key)).toBeTruthy()
    expect(await Cache.get(key)).toStrictEqual(fallbackValue)
    expect(cachedValue).toStrictEqual(fallbackValue)
  })

  test('rememberForever method should throw exception if closure is not a function', async ({
    expect
  }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    expect(
      // @ts-ignore
      async () => await Cache.rememberForever('test', null)
    ).rejects.toThrowError('Closure must be a function')
  })

  test('many method should return an object of key-value if keys are found', async ({ expect }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const key1 = 'test'
    const value1 = 'John Doe'
    const key2 = 'foo'
    const value2 = 'Anna'

    await Cache.put(key1, value1)
    await Cache.put(key2, value2)

    const records = await Cache.many([key1, key2])

    expect(records).toEqual({
      [key1]: value1,
      [key2]: value2
    })
  })

  test('flush method should delete all records from the current cache store', async ({
    expect
  }) => {
    const Cache = await getCache('in_memory', cacheConfig)
    const records = {
      test: 'John Doe',
      foo: 'Anna',
      bar: 'Lorem'
    }

    await Cache.putMany(records)

    expect(await Cache.many(Object.keys(records))).toStrictEqual(records)

    await Cache.flush()

    Object.keys(records).forEach(async (key) => {
      expect(await Cache.has(key)).toBeFalsy()
    })
  })

  test('clear method should delete all records from the current cache store', async ({
    expect
  }) => {
    const Cache = await getCache('in_memory', cacheConfig)

    const records = {
      test: 'John Doe',
      foo: 'Anna',
      bar: 'Lorem'
    }

    await Cache.putMany(records)

    expect(await Cache.many(Object.keys(records))).toStrictEqual(records)

    await Cache.clear()

    Object.keys(records).forEach(async (key) => {
      expect(await Cache.has(key)).toBeFalsy()
    })
  })
})

test.group('Cache Manager - Memcached', (group) => {
  group.teardown(async () => {
    await fs.cleanup()
  })

  test('add method', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.add(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('set method', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.set(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('put method', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('put method with custom ttl', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe', 3)
    await sleep(4000)

    expect(await Cache.get(key)).toStrictEqual(null)
  }).disableTimeout()

  test('put method should throw exception if ttl is nagative', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'

    expect(async () => await Cache.put(key, 'John Doe', -1000)).rejects.toThrowError(
      'Expiration time (TTL) cannot be negative'
    )
  })

  test('putMany method should cache all the values', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    const result = await Cache.putMany(list)

    expect(Object.values(result).every(Boolean)).toBeTruthy()

    for (const [key, value] of Object.entries(list)) {
      expect(await Cache.has(key)).toBeTruthy()
      expect(await Cache.get(key)).toStrictEqual(value)
    }
  })

  test('putMany method should cache all the values with custom ttl', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    await Cache.putMany(list, 60 * 60 * 24)

    await sleep(1500)

    for (const [key, value] of Object.entries(list)) {
      expect(await Cache.get(key)).toStrictEqual(value)
    }
  })

  test('putManyForever method should cache all the values without ttl', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    await Cache.putManyForever(list)

    await sleep(3000)

    for (const [key, value] of Object.entries(list)) {
      expect(await Cache.get(key)).toStrictEqual(value)
    }
  }).disableTimeout()

  test('get method should find cached value by key', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('get method should not find cached value if it has expired', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe', 3)

    await sleep(4000)

    const value = await Cache.get<null>(key)

    expect(await Cache.has(key)).toBeFalsy()
    expect(value).toBeNull()
  }).disableTimeout()

  test('get method should return value if key not found and fallback defined as a raw value', async ({
    expect
  }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    expect(await Cache.get('test', value)).toStrictEqual(value)
    expect(await Cache.has(key)).toBeFalsy()
  })

  test('get method should return value if key not found and fallback defined as a closure', async ({
    expect
  }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const data = [
      {
        name: 'John Doe'
      },
      {
        name: 'Anna'
      }
    ]

    const value = await Cache.get('test', async () => {
      await sleep(500)

      return data
    })

    expect(value).toStrictEqual(data)

    await Cache.flush()
  })

  test('get method should not cache value if key not found and fallback defined', async ({
    expect
  }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'

    await Cache.get(key, 'John Doe')

    expect(await Cache.has(key)).toBeFalsy()

    await Cache.flush()
  })

  test('get method should return cached value using forever method', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.forever(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('has method should return true if key is found', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe')

    expect(await Cache.has(key)).toBeTruthy()
  })

  test('has method should return false if key is not found', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    expect(await Cache.has('test')).toBeFalsy()
  })

  test('missing method should return true if key is not found', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    expect(await Cache.missing('test')).toBeTruthy()
  })

  test('missing method should return false if key is found', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe')

    expect(await Cache.missing(key)).toBeFalsy()
  })

  test('increment method should increment the value of an existing record and return the new value', async ({
    expect
  }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'
    const value = 5

    await Cache.put(key, value)

    expect(await Cache.increment(key, 2)).toStrictEqual(7)
    expect(await Cache.get(key)).toStrictEqual(7)

    await Cache.flush()
  })

  test('increment method should not change value if it is not a number and return false', async ({
    expect
  }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.increment(key, 2)).toBeFalsy()
    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('increment method should return false if key not found', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    expect(await Cache.increment('test', 1)).toBeFalsy()
  })

  test('decrement method should decrement the value of an existing record and return the new value', async ({
    expect
  }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'
    const value = 5

    await Cache.put(key, value)

    expect(await Cache.decrement(key, 2)).toStrictEqual(3)
    expect(await Cache.get(key)).toStrictEqual(3)

    await Cache.flush()
  })

  test('decrement method should not change value if it is not a number and return false', async ({
    expect
  }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.decrement(key, 2)).toBeFalsy()
    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('decrement method should return false if key not found', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    expect(await Cache.decrement('test', 1)).toBeFalsy()
  })

  test('forever method should cache a value without expiration', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'

    await Cache.forever(key, 'John Doe')

    await sleep(3000)

    expect(await Cache.has(key)).toBeTruthy()
  }).disableTimeout()

  test('pull method should retrieve cached item and delete it from cache', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    const pulled = await Cache.pull(key)

    expect(await Cache.has(key)).toBeFalsy()
    expect(pulled).toStrictEqual(value)
  })

  test('forget method should delete cached value using put method', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe')

    expect(await Cache.has(key)).toBeTruthy()

    await Cache.forget(key)

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('forget method should delete cached value using put method with custom ttl', async ({
    expect
  }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe', 60 * 60 * 24)

    expect(await Cache.has(key)).toBeTruthy()

    await Cache.forget(key)

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('forget method should delete cached value using forever method', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'

    await Cache.forever(key, 'John Doe')

    expect(await Cache.has(key)).toBeTruthy()

    await Cache.forget(key)

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('forgetMultiple method should delete all cached value by keys', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key1 = 'test'
    const key2 = 'foo'

    const records = {
      [key1]: 'John Doe',
      [key2]: 'Anna'
    }

    await Cache.putMany(records)

    expect(await Cache.many(Object.keys(records))).toStrictEqual(records)

    await Cache.forgetMultiple(Object.keys(records))

    expect(await Cache.many(Object.keys(records))).toStrictEqual({
      [key1]: null,
      [key2]: null
    })
  })

  test('remember method should return cached value using put method', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'
    const value = 'John Doe'
    const fallbackValue = 'Anna'

    await Cache.put(key, value)

    const cachedValue = await Cache.remember(key, null, async () => fallbackValue)

    expect(cachedValue).toStrictEqual(value)
  })

  test('remember method should cache fallback value and return it if key not found', async ({
    expect
  }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'
    const fallbackValue = 'Anna'

    const cachedValue = await Cache.remember(key, null, async () => {
      await sleep(500)

      return fallbackValue
    })

    expect(await Cache.has(key)).toBeTruthy()
    expect(await Cache.get(key)).toStrictEqual(fallbackValue)
    expect(cachedValue).toStrictEqual(fallbackValue)
  })

  test('remember method should throw exception if closure is not a function', async ({
    expect
  }) => {
    const Cache = await getCache('memcached', cacheConfig)

    expect(
      // @ts-ignore
      async () => await Cache.remember('test', null, null)
    ).rejects.toThrowError('Closure must be a function')
  })

  test('remember method should throw exception if ttl is negative', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    expect(
      async () => await Cache.remember('test', -200, async () => 'John Doe')
    ).rejects.toThrowError('Expiration time (TTL) cannot be negative')
  })

  test('sear method should cache an item forever', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    const cachedValue = await Cache.sear(key, async () => value)

    expect(await Cache.has(key)).toBeTruthy()
    expect(cachedValue).toStrictEqual(value)
  })

  test('rememberForever method should return cached value using put method', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'
    const value = 'John Doe'
    const fallbackValue = 'Anna'

    await Cache.put(key, value)

    const cachedValue = await Cache.rememberForever(key, async () => fallbackValue)

    expect(cachedValue).toStrictEqual(value)
  })

  test('rememberForever method should return 0 as a valid value', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'

    await Cache.rememberForever(key, async () => 0)

    const cachedValue = await Cache.rememberForever(key, async () => 1)

    expect(cachedValue).toStrictEqual(0)
  })

  test('rememberForever method should cache fallback value and return it if key not found', async ({
    expect
  }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key = 'test'
    const fallbackValue = 'Anna'

    const cachedValue = await Cache.rememberForever(key, async () => {
      await sleep(500)

      return fallbackValue
    })

    expect(await Cache.has(key)).toBeTruthy()
    expect(await Cache.get(key)).toStrictEqual(fallbackValue)
    expect(cachedValue).toStrictEqual(fallbackValue)
  })

  test('rememberForever method should throw exception if closure is not a function', async ({
    expect
  }) => {
    const Cache = await getCache('memcached', cacheConfig)

    expect(
      // @ts-ignore
      async () => await Cache.rememberForever('test', null)
    ).rejects.toThrowError('Closure must be a function')
  })

  test('many method should return an object of key-value if keys are found', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const key1 = 'test'
    const value1 = 'John Doe'
    const key2 = 'foo'
    const value2 = 'Anna'

    await Cache.put(key1, value1)
    await Cache.put(key2, value2)

    const records = await Cache.many([key1, key2])

    expect(records).toEqual({
      [key1]: value1,
      [key2]: value2
    })
  })

  test('flush method should delete all records from the current cache store', async ({
    expect
  }) => {
    const Cache = await getCache('memcached', cacheConfig)
    const records = {
      test: 'John Doe',
      foo: 'Anna',
      bar: 'Lorem'
    }

    await Cache.putMany(records)

    expect(await Cache.many(Object.keys(records))).toStrictEqual(records)

    await Cache.flush()

    Object.keys(records).forEach(async (key) => {
      expect(await Cache.has(key)).toBeFalsy()
    })
  })

  test('tags should cache value using put method', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)
    const tags = ['tag1', 'tag2']
    const key = 'test'

    await Cache.tags(tags).put(key, 'John Doe')

    expect(await Cache.tags(tags).has(key)).toBeTruthy()
  })

  test('tags should cache value using forever method', async ({ expect }) => {
    const Cache = await getCache('memcached', cacheConfig)
    const tags = ['tag1', 'tag2']
    const key = 'test'

    await Cache.tags(tags).forever(key, 'John Doe')

    await sleep(2000)

    expect(await Cache.tags(tags).has(key)).toBeTruthy()
  }).disableTimeout()

  test('clear method should delete all records from the current cache store', async ({
    expect
  }) => {
    const Cache = await getCache('memcached', cacheConfig)

    const records = {
      test: 'John Doe',
      foo: 'Anna',
      bar: 'Lorem'
    }

    await Cache.putMany(records)

    expect(await Cache.many(Object.keys(records))).toStrictEqual(records)

    await Cache.clear()

    Object.keys(records).forEach(async (key) => {
      expect(await Cache.has(key)).toBeFalsy()
    })
  })
})

test.group('Cache Manager - Redis', (group) => {
  group.teardown(async () => {
    await fs.cleanup()
  })

  test('add method', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.add(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('set method', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.set(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('put method', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('put method with custom ttl', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe', 2)

    expect(await Cache.has(key)).toBeTruthy()

    await sleep(3000)

    expect(await Cache.has(key)).toBeFalsy()
    expect(await Cache.get(key)).toStrictEqual(null)
  }).disableTimeout()

  test('put method should throw exception if ttl is nagative', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'foo'

    expect(async () => await Cache.put(key, 'bar', -200)).rejects.toThrowError(
      'Expiration time (TTL) cannot be negative'
    )
  })

  test('putMany method should cache all the values', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    const result = await Cache.putMany(list)

    expect(Object.values(result).every(Boolean)).toBeTruthy()

    for (const [key, value] of Object.entries(list)) {
      expect(await Cache.has(key)).toBeTruthy()
      expect(await Cache.get(key)).toStrictEqual(value)
    }
  })

  test('putMany method should cache all the values with custom ttl', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    await Cache.putMany(list, 60 * 60 * 24)

    await sleep(3000)

    for (const [key, value] of Object.entries(list)) {
      expect(await Cache.get(key)).toStrictEqual(value)
    }
  }).disableTimeout()

  test('putManyForever method should cache all the values without ttl', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    await Cache.putManyForever(list)

    await sleep(3000)

    for (const [key, value] of Object.entries(list)) {
      expect(await Cache.get(key)).toStrictEqual(value)
    }
  }).disableTimeout()

  test('get method should find cached value by key', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('get method should delete cached value if it is called and has expired', async ({
    expect
  }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe', 2)

    await sleep(3000)

    const value = await Cache.get<null>(key)

    expect(await Cache.has(key)).toBeFalsy()
    expect(value).toBeNull()
  }).disableTimeout()

  test('get method should return value if key not found and fallback defined as a raw value', async ({
    expect
  }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    expect(await Cache.get('test', value)).toStrictEqual(value)
    expect(await Cache.has(key)).toBeFalsy()
  })

  test('get method should return value if key not found and fallback defined as a closure', async ({
    expect
  }) => {
    const Cache = await getCache('redis', cacheConfig)

    const data = [
      {
        name: 'John Doe'
      },
      {
        name: 'Anna'
      }
    ]

    const value = await Cache.get('test', async () => {
      await sleep(500)

      return data
    })

    expect(value).toStrictEqual(data)
  })

  test('get method should not cache value if key not found and fallback defined', async ({
    expect
  }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'

    await Cache.get(key, 'John Doe')

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('get method should return cached value using forever method', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.forever(key, value)

    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('has method should return true if key is found', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe')

    expect(await Cache.has(key)).toBeTruthy()
  })

  test('has method should return false if key is not found', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    expect(await Cache.has('test')).toBeFalsy()
  })

  test('missing method should return true if key is not found', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    expect(await Cache.missing('test')).toBeTruthy()
  })

  test('missing method should return false if key is found', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe')

    expect(await Cache.missing(key)).toBeFalsy()
  })

  test('increment method should increment the value of an existing record and return the new value', async ({
    expect
  }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'
    const value = 5

    await Cache.put(key, value)

    expect(await Cache.increment(key, 2)).toStrictEqual(7)
    expect(await Cache.get(key)).toStrictEqual(7)
  })

  test('increment method should not change value if it is not a number and return false', async ({
    expect
  }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.increment(key, 2)).toBeFalsy()
    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('increment method should return false if key not found', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    expect(await Cache.increment('test', 1)).toBeFalsy()
  })

  test('decrement method should decrement the value of an existing record and return the new value', async ({
    expect
  }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'
    const value = 5

    await Cache.put(key, value)

    expect(await Cache.decrement(key, 2)).toStrictEqual(3)
    expect(await Cache.get(key)).toStrictEqual(3)
  })

  test('decrement method should not change value if it is not a number and return false', async ({
    expect
  }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    expect(await Cache.decrement(key, 2)).toBeFalsy()
    expect(await Cache.get(key)).toStrictEqual(value)
  })

  test('decrement method should return false if key not found', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    expect(await Cache.decrement('test', 1)).toBeFalsy()
  })

  test('forever method should cache a value without expiration', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'

    await Cache.forever(key, 'John Doe')

    await sleep(3000)

    expect(await Cache.has(key)).toBeTruthy()
  }).disableTimeout()

  test('pull method should retrieve cached item and delete it from cache', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    await Cache.put(key, value)

    const pulled = await Cache.pull(key)

    expect(await Cache.has(key)).toBeFalsy()
    expect(pulled).toStrictEqual(value)
  })

  test('forget method should delete cached value using put method', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe')

    expect(await Cache.has(key)).toBeTruthy()

    await Cache.forget(key)

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('forget method should delete cached value using put method with custom ttl', async ({
    expect
  }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'

    await Cache.put(key, 'John Doe', 60 * 60 * 24)

    expect(await Cache.has(key)).toBeTruthy()

    await Cache.forget(key)

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('forget method should delete cached value using forever method', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'

    await Cache.forever(key, 'John Doe')

    expect(await Cache.has(key)).toBeTruthy()

    await Cache.forget(key)

    expect(await Cache.has(key)).toBeFalsy()
  })

  test('forgetMultiple method should delete all cached value by keys', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key1 = 'test'
    const key2 = 'foo'

    const records = {
      [key1]: 'John Doe',
      [key2]: 'Anna'
    }

    await Cache.putMany(records)

    expect(await Cache.many(Object.keys(records))).toStrictEqual(records)

    await Cache.forgetMultiple(Object.keys(records))

    expect(await Cache.many(Object.keys(records))).toStrictEqual({
      [key1]: null,
      [key2]: null
    })
  })

  test('remember method should return cached value using put method', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'
    const value = 'John Doe'
    const fallbackValue = 'Anna'

    await Cache.put(key, value)

    const cachedValue = await Cache.remember(key, null, async () => fallbackValue)

    expect(cachedValue).toStrictEqual(value)
  })

  test('remember method should cache fallback value and return it if key not found', async ({
    expect
  }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'
    const fallbackValue = 'Anna'

    const cachedValue = await Cache.remember(key, null, async () => {
      await sleep(500)

      return fallbackValue
    })

    expect(await Cache.has(key)).toBeTruthy()
    expect(await Cache.get(key)).toStrictEqual(fallbackValue)
    expect(cachedValue).toStrictEqual(fallbackValue)
  })

  test('remember method should throw exception if closure is not a function', async ({
    expect
  }) => {
    const Cache = await getCache('redis', cacheConfig)

    expect(
      // @ts-ignore
      async () => await Cache.remember('test', null, null)
    ).rejects.toThrowError('Closure must be a function')
  })

  test('remember method should throw exception if ttl is negative', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    expect(
      async () => await Cache.remember('test', -200, async () => 'John Doe')
    ).rejects.toThrowError('Expiration time (TTL) cannot be negative')
  })

  test('sear method should cache an item forever', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'
    const value = 'John Doe'

    const cachedValue = await Cache.sear(key, async () => value)

    expect(await Cache.has(key)).toBeTruthy()
    expect(cachedValue).toStrictEqual(value)
  })

  test('rememberForever method should return cached value using put method', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'
    const value = 'John Doe'
    const fallbackValue = 'Anna'

    await Cache.put(key, value)

    const cachedValue = await Cache.rememberForever(key, async () => fallbackValue)

    expect(cachedValue).toStrictEqual(value)
  })

  test('rememberForever method should return 0 as a valid value', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'

    await Cache.rememberForever(key, async () => 0)

    const cachedValue = await Cache.rememberForever(key, async () => 1)

    expect(cachedValue).toStrictEqual(0)
  })

  test('rememberForever method should cache fallback value and return it if key not found', async ({
    expect
  }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key = 'test'
    const fallbackValue = 'Anna'

    const cachedValue = await Cache.rememberForever(key, async () => {
      await sleep(500)

      return fallbackValue
    })

    expect(await Cache.has(key)).toBeTruthy()
    expect(await Cache.get(key)).toStrictEqual(fallbackValue)
    expect(cachedValue).toStrictEqual(fallbackValue)
  })

  test('rememberForever method should throw exception if closure is not a function', async ({
    expect
  }) => {
    const Cache = await getCache('redis', cacheConfig)

    expect(
      // @ts-ignore
      async () => await Cache.rememberForever('test', null)
    ).rejects.toThrowError('Closure must be a function')
  })

  test('many method should return an object of key-value if keys are found', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)

    const key1 = 'test'
    const value1 = 'John Doe'
    const key2 = 'foo'
    const value2 = 'Anna'

    await Cache.put(key1, value1)
    await Cache.put(key2, value2)

    const records = await Cache.many([key1, key2])

    expect(records).toEqual({
      [key1]: value1,
      [key2]: value2
    })
  })

  test('flush method should delete all records from the current cache store', async ({
    expect
  }) => {
    const Cache = await getCache('redis', cacheConfig)
    const records = {
      test: 'John Doe',
      foo: 'Anna',
      bar: 'Lorem'
    }

    await Cache.putMany(records)

    expect(await Cache.many(Object.keys(records))).toStrictEqual(records)

    await Cache.flush()

    Object.keys(records).forEach(async (key) => {
      expect(await Cache.has(key)).toBeFalsy()
    })
  })

  test('tags should cache value using put method', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)
    const tags = ['tag1', 'tag2']
    const key = 'test'

    await Cache.tags(tags).put(key, 'John Doe')

    expect(await Cache.tags(tags).has(key)).toBeTruthy()
  })

  test('tags should cache value using forever method', async ({ expect }) => {
    const Cache = await getCache('redis', cacheConfig)
    const tags = ['tag1', 'tag2']
    const key = 'test'

    await Cache.tags(tags).forever(key, 'John Doe')

    await sleep(3000)

    expect(await Cache.tags(tags).has(key)).toBeTruthy()
  }).disableTimeout()

  test('clear method should delete all records from the current cache store', async ({
    expect
  }) => {
    const Cache = await getCache('redis', cacheConfig)

    const records = {
      test: 'John Doe',
      foo: 'Anna',
      bar: 'Lorem'
    }

    await Cache.putMany(records)

    expect(await Cache.many(Object.keys(records))).toStrictEqual(records)

    await Cache.clear()

    Object.keys(records).forEach(async (key) => {
      expect(await Cache.has(key)).toBeFalsy()
    })
  })
})
