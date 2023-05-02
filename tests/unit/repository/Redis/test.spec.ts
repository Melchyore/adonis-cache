import type { EmitterContract } from '@ioc:Adonis/Core/Event'

import { test } from '@japa/runner'

import { getCacheConfig, fs, setup, createRepository } from '../../../../bin/test/config'
import { sleep } from '../../../../test-helpers/utils'
import Redis from '../../../../src/Stores/Redis'

const cacheConfig = getCacheConfig('redis')

let Event: EmitterContract

async function getRepository() {
  const app = await setup('test', cacheConfig)
  const RedisManager = app.container.use('Adonis/Addons/Redis')
  const { Event: event, Repository } = await createRepository(
    app,
    cacheConfig,
    { driver: cacheConfig.store },
    new Redis(RedisManager, 'primary')
  )

  Event = event

  return {
    Repository,
    RedisManager
  }
}

test.group('Repository - Redis', (group) => {
  group.teardown(async () => {
    Event.restore()

    await fs.cleanup()
  })

  test('add method', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    await Repository.add(key, value)

    expect(await Repository.get(key)).toStrictEqual(value)

    await RedisManager.flushall()
  })

  test('set method', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    await Repository.set(key, value)

    expect(await Repository.get(key)).toStrictEqual(value)

    await RedisManager.flushall()
  })

  test('put method', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    await Repository.put(key, value)

    expect(await Repository.get(key)).toStrictEqual(value)

    await RedisManager.flushall()
  })

  test('put method with custom ttl', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'

    await Repository.put(key, 'John Doe', 2)

    expect(await Repository.has(key)).toBeTruthy()

    await sleep(3000)

    expect(await Repository.has(key)).toBeFalsy()
    expect(await Repository.get(key)).toStrictEqual(null)

    await RedisManager.flushall()
  }).disableTimeout()

  test('put method should throw exception if ttl is nagative', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'foo'

    expect(async () => await Repository.put(key, 'bar', -200)).rejects.toThrowError(
      'Expiration time (TTL) cannot be negative'
    )

    await RedisManager.flushall()
  })

  test('putMany method should cache all the values', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    const result = await Repository.putMany(list)

    expect(Object.values(result).every(Boolean)).toBeTruthy()

    for (const [key, value] of Object.entries(list)) {
      expect(await Repository.has(key)).toBeTruthy()
      expect(await Repository.get(key)).toStrictEqual(value)
    }

    await RedisManager.flushall()
  })

  test('putMany method should cache all the values with custom ttl', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    await Repository.putMany(list, 60 * 60 * 24)

    await sleep(3000)

    for (const [key, value] of Object.entries(list)) {
      expect(await Repository.get(key)).toStrictEqual(value)
    }

    await RedisManager.flushall()
  }).disableTimeout()

  test('putManyForever method should cache all the values without ttl', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    await Repository.putManyForever(list)

    await sleep(3000)

    for (const [key, value] of Object.entries(list)) {
      expect(await Repository.get(key)).toStrictEqual(value)
    }

    await RedisManager.flushall()
  }).disableTimeout()

  test('get method should find cached value by key', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    await Repository.put(key, value)

    expect(await Repository.get(key)).toStrictEqual(value)

    await RedisManager.flushall()
  })

  test('get method should delete cached value if it is called and has expired', async ({
    expect
  }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'

    await Repository.put(key, 'John Doe', 2)

    await sleep(3000)

    const value = await Repository.get<null>(key)

    expect(await Repository.has(key)).toBeFalsy()
    expect(value).toBeNull()

    await RedisManager.flushall()
  }).disableTimeout()

  test('get method should return value if key not found and fallback defined as a raw value', async ({
    expect
  }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    expect(await Repository.get('test', value)).toStrictEqual(value)
    expect(await Repository.has(key)).toBeFalsy()

    await RedisManager.flushall()
  })

  test('get method should return value if key not found and fallback defined as a closure', async ({
    expect
  }) => {
    const { Repository, RedisManager } = await getRepository()

    const data = [
      {
        name: 'John Doe'
      },
      {
        name: 'Anna'
      }
    ]

    const value = await Repository.get('test', async () => {
      await sleep(500)

      return data
    })

    expect(value).toStrictEqual(data)

    await RedisManager.flushall()
  })

  test('get method should not cache value if key not found and fallback defined', async ({
    expect
  }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'

    await Repository.get(key, 'John Doe')

    expect(await Repository.has(key)).toBeFalsy()

    await RedisManager.flushall()
  })

  test('get method should return cached value using forever method', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    await Repository.forever(key, value)

    expect(await Repository.get(key)).toStrictEqual(value)

    await RedisManager.flushall()
  })

  test('has method should return true if key is found', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'

    await Repository.put(key, 'John Doe')

    expect(await Repository.has(key)).toBeTruthy()

    await RedisManager.flushall()
  })

  test('has method should return false if key is not found', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    expect(await Repository.has('test')).toBeFalsy()

    await RedisManager.flushall()
  })

  test('missing method should return true if key is not found', async ({ expect }) => {
    const { Repository } = await getRepository()

    expect(await Repository.missing('test')).toBeTruthy()
  })

  test('missing method should return false if key is found', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'

    await Repository.put(key, 'John Doe')

    expect(await Repository.missing(key)).toBeFalsy()

    await RedisManager.flushall()
  })

  test('increment method should increment the value of an existing record and return the new value', async ({
    expect
  }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'
    const value = 5

    await Repository.put(key, value)

    expect(await Repository.increment(key, 2)).toStrictEqual(7)
    expect(await Repository.get(key)).toStrictEqual(7)

    await RedisManager.flushall()
  })

  test('increment method should not change value if it is not a number and return false', async ({
    expect
  }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    await Repository.put(key, value)

    expect(await Repository.increment(key, 2)).toBeFalsy()
    expect(await Repository.get(key)).toStrictEqual(value)

    await RedisManager.flushall()
  })

  test('increment method should return false if key not found', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    expect(await Repository.increment('test', 1)).toBeFalsy()

    await RedisManager.flushall()
  })

  test('decrement method should decrement the value of an existing record and return the new value', async ({
    expect
  }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'
    const value = 5

    await Repository.put(key, value)

    expect(await Repository.decrement(key, 2)).toStrictEqual(3)
    expect(await Repository.get(key)).toStrictEqual(3)

    await RedisManager.flushall()
  })

  test('decrement method should not change value if it is not a number and return false', async ({
    expect
  }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    await Repository.put(key, value)

    expect(await Repository.decrement(key, 2)).toBeFalsy()
    expect(await Repository.get(key)).toStrictEqual(value)

    await RedisManager.flushall()
  })

  test('decrement method should return false if key not found', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    expect(await Repository.decrement('test', 1)).toBeFalsy()

    await RedisManager.flushall()
  })

  test('forever method should cache a value without expiration', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'

    await Repository.forever(key, 'John Doe')

    await sleep(3000)

    expect(await Repository.has(key)).toBeTruthy()

    await RedisManager.flushall()
  }).disableTimeout()

  test('pull method should retrieve cached item and delete it from cache', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    await Repository.put(key, value)

    const pulled = await Repository.pull(key)

    expect(await Repository.has(key)).toBeFalsy()
    expect(pulled).toStrictEqual(value)

    await RedisManager.flushall()
  })

  test('forget method should delete cached value using put method', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'

    await Repository.put(key, 'John Doe')

    expect(await Repository.has(key)).toBeTruthy()

    await Repository.forget(key)

    expect(await Repository.has(key)).toBeFalsy()

    await RedisManager.flushall()
  })

  test('forget method should delete cached value using put method with custom ttl', async ({
    expect
  }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'

    await Repository.put(key, 'John Doe', 60 * 60 * 24)

    expect(await Repository.has(key)).toBeTruthy()

    await Repository.forget(key)

    expect(await Repository.has(key)).toBeFalsy()

    await RedisManager.flushall()
  })

  test('forget method should delete cached value using forever method', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'

    await Repository.forever(key, 'John Doe')

    expect(await Repository.has(key)).toBeTruthy()

    await Repository.forget(key)

    expect(await Repository.has(key)).toBeFalsy()

    await RedisManager.flushall()
  })

  test('forgetMultiple method should delete all cached value by keys', async ({ expect }) => {
    const { Repository } = await getRepository()

    const key1 = 'test'
    const key2 = 'foo'

    const records = {
      [key1]: 'John Doe',
      [key2]: 'Anna'
    }

    await Repository.putMany(records)

    expect(await Repository.many(Object.keys(records))).toStrictEqual(records)

    await Repository.forgetMultiple(Object.keys(records))

    expect(await Repository.many(Object.keys(records))).toStrictEqual({
      [key1]: null,
      [key2]: null
    })
  })

  test('remember method should return cached value using put method', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'
    const value = 'John Doe'
    const fallbackValue = 'Anna'

    await Repository.put(key, value)

    const cachedValue = await Repository.remember(key, null, async () => fallbackValue)

    expect(cachedValue).toStrictEqual(value)

    await RedisManager.flushall()
  })

  test('remember method should cache fallback value and return it if key not found', async ({
    expect
  }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'
    const fallbackValue = 'Anna'

    const cachedValue = await Repository.remember(key, null, async () => {
      await sleep(500)

      return fallbackValue
    })

    expect(await Repository.has(key)).toBeTruthy()
    expect(await Repository.get(key)).toStrictEqual(fallbackValue)
    expect(cachedValue).toStrictEqual(fallbackValue)

    await RedisManager.flushall()
  })

  test('remember method should throw exception if closure is not a function', async ({
    expect
  }) => {
    const { Repository, RedisManager } = await getRepository()

    expect(
      // @ts-ignore
      async () => await Repository.remember('test', null, null)
    ).rejects.toThrowError('Closure must be a function')

    await RedisManager.flushall()
  })

  test('remember method should throw exception if ttl is negative', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    expect(
      async () => await Repository.remember('test', -200, async () => 'John Doe')
    ).rejects.toThrowError('Expiration time (TTL) cannot be negative')

    await RedisManager.flushall()
  })

  test('sear method should cache an item forever', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    const cachedValue = await Repository.sear(key, async () => value)

    expect(await Repository.has(key)).toBeTruthy()
    expect(cachedValue).toStrictEqual(value)

    await RedisManager.flushall()
  })

  test('rememberForever method should return cached value using put method', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'
    const value = 'John Doe'
    const fallbackValue = 'Anna'

    await Repository.put(key, value)

    const cachedValue = await Repository.rememberForever(key, async () => fallbackValue)

    expect(cachedValue).toStrictEqual(value)

    await RedisManager.flushall()
  })

  test('rememberForever method should return 0 as a valid value', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'

    await Repository.rememberForever(key, async () => 0)
    const cachedValue = await Repository.rememberForever(key, async () => 1)

    expect(cachedValue).toStrictEqual(0)

    await RedisManager.flushall()
  })

  test('rememberForever method should cache fallback value and return it if key not found', async ({
    expect
  }) => {
    const { Repository, RedisManager } = await getRepository()

    const key = 'test'
    const fallbackValue = 'Anna'

    const cachedValue = await Repository.rememberForever(key, async () => {
      await sleep(500)

      return fallbackValue
    })

    expect(await Repository.has(key)).toBeTruthy()
    expect(await Repository.get(key)).toStrictEqual(fallbackValue)
    expect(cachedValue).toStrictEqual(fallbackValue)

    await RedisManager.flushall()
  })

  test('rememberForever method should throw exception if closure is not a function', async ({
    expect
  }) => {
    const { Repository, RedisManager } = await getRepository()

    expect(
      // @ts-ignore
      async () => await Repository.rememberForever('test', null)
    ).rejects.toThrowError('Closure must be a function')

    await RedisManager.flushall()
  })

  test('many method should return an object of key-value if keys are found', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()

    const key1 = 'test'
    const value1 = 'John Doe'
    const key2 = 'foo'
    const value2 = 'Anna'

    await Repository.put(key1, value1)
    await Repository.put(key2, value2)

    const records = await Repository.many([key1, key2])

    expect(records).toEqual({
      [key1]: value1,
      [key2]: value2
    })

    await RedisManager.flushall()
  })

  test('flush method should delete all records from the current cache store', async ({
    expect
  }) => {
    const { Repository, RedisManager } = await getRepository()
    const records = {
      test: 'John Doe',
      foo: 'Anna',
      bar: 'Lorem'
    }

    await Repository.putMany(records)

    expect(await Repository.many(Object.keys(records))).toStrictEqual(records)

    await Repository.flush()

    Object.keys(records).forEach(async (key) => {
      expect(await Repository.has(key)).toBeFalsy()
    })

    await RedisManager.flushall()
  })

  test('tags should cache value using put method', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()
    const tags = ['tag1', 'tag2']
    const key = 'test'

    await Repository.tags(tags).put(key, 'John Doe')

    expect(await Repository.tags(tags).has(key)).toBeTruthy()

    await RedisManager.flushall()
  })

  test('tags should cache value using forever method', async ({ expect }) => {
    const { Repository, RedisManager } = await getRepository()
    const tags = ['tag1', 'tag2']
    const key = 'test'

    await Repository.tags(tags).forever(key, 'John Doe')

    await sleep(3000)

    expect(await Repository.tags(tags).has(key)).toBeTruthy()

    await RedisManager.flushall()
  }).disableTimeout()
})
