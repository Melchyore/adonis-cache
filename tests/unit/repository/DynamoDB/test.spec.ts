import type { EmitterContract } from '@ioc:Adonis/Core/Event'

import { test } from '@japa/runner'

import { getCacheConfig, createRepository, fs, setup } from '../../../../bin/test/config'
import { sleep } from '../../../../test-helpers/utils'
import DynamoDB from '../../../../src/Stores/DynamoDB'

const cacheConfig = getCacheConfig('dynamodb')

let Event: EmitterContract

async function getRepository() {
  const app = await setup('test', cacheConfig)
  const DynamoDBClient = app.container.use('Adonis/Addons/DynamoDB').DynamoDB
  const { Event: event, Repository } = await createRepository(
    app,
    cacheConfig,
    { driver: cacheConfig.store },
    new DynamoDB(DynamoDBClient, cacheConfig.stores.dynamodb.table)
  )

  await Repository.store.createTable!()

  Event = event

  return Repository
}

test.group('Repository - DynamoDB', (group) => {
  group.teardown(async () => {
    Event.restore()

    await fs.cleanup()
  })

  test('add method', async ({ expect }) => {
    const repository = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    await repository.add(key, value)

    expect(await repository.get(key)).toStrictEqual(value)

    await repository.forget(key)
  }).disableTimeout()

  test('set method', async ({ expect }) => {
    const repository = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    await repository.set(key, value)

    expect(await repository.get(key)).toStrictEqual(value)

    await repository.forget(key)
  }).disableTimeout()

  test('put method', async ({ expect }) => {
    const repository = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    await repository.put(key, value)

    expect(await repository.get(key)).toStrictEqual(value)

    await repository.forget(key)
  }).disableTimeout()

  test('put method with custom ttl', async ({ expect }) => {
    const repository = await getRepository()

    const key = 'test'

    await repository.put(key, 'John Doe', 3)
    await sleep(4000)

    expect(await repository.get(key)).toStrictEqual(null)

    await repository.forget(key)
  }).disableTimeout()

  test('put method should throw exception if ttl is nagative', async ({ expect }) => {
    const repository = await getRepository()

    const key = 'test'

    expect(async () => await repository.put(key, 'John Doe', -200)).rejects.toThrowError(
      'Expiration time (TTL) cannot be negative'
    )

    await repository.forget(key)
  }).disableTimeout()

  test('putMany method should cache all the values', async ({ expect }) => {
    const repository = await getRepository()

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    const result = await repository.putMany(list)

    expect(Object.values(result).every(Boolean)).toBeTruthy()

    for (const [key, value] of Object.entries(list)) {
      expect(await repository.has(key)).toBeTruthy()
      expect(await repository.get(key)).toStrictEqual(value)

      await repository.forget(key)
    }
  }).disableTimeout()

  test('putMany method should cache all the values with custom ttl', async ({ expect }) => {
    const repository = await getRepository()

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    await repository.putMany(list, 4000)

    await sleep(3000)

    expect(await repository.get('test')).toStrictEqual(list.test)
    expect(await repository.get('foo')).toStrictEqual(list.foo)

    Object.keys(list).forEach(async (key) => {
      await repository.forget(key)
    })
  }).disableTimeout()

  test('putManyForever method should cache all the values without ttl', async ({ expect }) => {
    const repository = await getRepository()

    const list = {
      test: 'John Doe',
      foo: 'Anna'
    }

    await repository.putManyForever(list)

    await sleep(3000)

    expect(await repository.get('test')).toStrictEqual(list.test)
    expect(await repository.get('foo')).toStrictEqual(list.foo)

    Object.keys(list).forEach(async (key) => {
      await repository.forget(key)
    })
  }).disableTimeout()

  test('get method should find cached value by key', async ({ expect }) => {
    const repository = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    await repository.put(key, value)

    expect(await repository.get(key)).toStrictEqual(value)

    await repository.forget(key)
  }).disableTimeout()

  test('get method should delete cached value if it is called and has expired', async ({
    expect
  }) => {
    const repository = await getRepository()

    const key = 'test'

    await repository.put(key, 'John Doe', 3)

    await sleep(4000)

    const value = await repository.get<null>(key)

    expect(await repository.has(key)).toBeFalsy()
    expect(value).toBeNull()

    await repository.forget(key)
  }).disableTimeout()

  test('get method should return value if key not found and fallback defined as a raw value', async ({
    expect
  }) => {
    const repository = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    expect(await repository.get(key, value)).toStrictEqual(value)
    expect(await repository.has(key)).toBeFalsy()

    await repository.forget(key)
  }).disableTimeout()

  test('get method should return value if key not found and fallback defined as a closure', async ({
    expect
  }) => {
    const repository = await getRepository()

    const data = [
      {
        name: 'John Doe'
      },
      {
        name: 'Anna'
      }
    ]

    const key = 'test'
    const value = await repository.get(key, async () => {
      await sleep(500)

      return data
    })

    expect(value).toStrictEqual(data)

    await repository.forget(key)
  }).disableTimeout()

  test('get method should not cache value if key not found and fallback defined', async ({
    expect
  }) => {
    const repository = await getRepository()

    const key = 'test'

    await repository.get(key, 'John Doe')

    expect(await repository.has(key)).toBeFalsy()

    await repository.forget(key)
  }).disableTimeout()

  test('get method should return cached value using forever method', async ({ expect }) => {
    const repository = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    await repository.forever(key, value)

    expect(await repository.get(key)).toStrictEqual(value)

    await repository.forget(key)
  }).disableTimeout()

  test('has method should return true if key is found', async ({ expect }) => {
    const repository = await getRepository()

    const key = 'test'

    await repository.put(key, 'John Doe')

    expect(await repository.has(key)).toBeTruthy()

    await repository.forget(key)
  }).disableTimeout()

  test('has method should return false if key is not found', async ({ expect }) => {
    const repository = await getRepository()

    const key = 'test'

    expect(await repository.has(key)).toBeFalsy()

    await repository.forget(key)
  }).disableTimeout()

  test('missing method should return true if key is not found', async ({ expect }) => {
    const repository = await getRepository()

    expect(await repository.missing('test')).toBeTruthy()
  }).disableTimeout()

  test('missing method should return false if key is found', async ({ expect }) => {
    const repository = await getRepository()

    const key = 'test'

    await repository.put(key, 'John Doe')

    expect(await repository.missing(key)).toBeFalsy()

    await repository.forget(key)
  }).disableTimeout()

  test('increment method should increment the value of an existing record and return the new value', async ({
    expect
  }) => {
    const repository = await getRepository()

    const key = 'test'
    const value = 5

    await repository.put(key, value)

    expect(await repository.increment(key, 2)).toStrictEqual(7)
    expect(await repository.get(key)).toStrictEqual(7)

    await repository.forget(key)
  }).disableTimeout()

  test('increment method should not change value if it is not a number and return false', async ({
    expect
  }) => {
    const repository = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    await repository.put(key, value)

    expect(await repository.increment(key, 2)).toBeFalsy()
    expect(await repository.get(key)).toStrictEqual(value)

    await repository.forget(key)
  }).disableTimeout()

  test('increment method should return false if key not found', async ({ expect }) => {
    const repository = await getRepository()

    expect(await repository.increment('test', 1)).toBeFalsy()
  }).disableTimeout()

  test('decrement method should decrement the value of an existing record and return the new value', async ({
    expect
  }) => {
    const repository = await getRepository()

    const key = 'test'
    const value = 5

    await repository.put(key, value)

    expect(await repository.decrement(key, 2)).toStrictEqual(3)
    expect(await repository.get(key)).toStrictEqual(3)

    await repository.forget(key)
  }).disableTimeout()

  test('decrement method should not change value if it is not a number and return false', async ({
    expect
  }) => {
    const repository = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    await repository.put(key, value)

    expect(await repository.decrement(key, 2)).toBeFalsy()
    expect(await repository.get(key)).toStrictEqual(value)

    await repository.forget(key)
  }).disableTimeout()

  test('decrement method should return false if key not found', async ({ expect }) => {
    const repository = await getRepository()

    expect(await repository.decrement('test', 1)).toBeFalsy()
  }).disableTimeout()

  test('forever method should cache a value without expiration', async ({ expect }) => {
    const repository = await getRepository()

    const key = 'test'

    await repository.forever(key, 'John Doe')

    await sleep(3000)

    expect(await repository.has(key)).toBeTruthy()

    await repository.forget(key)
  }).disableTimeout()

  test('pull method should retrieve cached item and delete it from cache', async ({ expect }) => {
    const repository = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    await repository.put(key, value)

    const pulled = await repository.pull(key)

    expect(await repository.has(key)).toBeFalsy()
    expect(pulled).toStrictEqual(value)
  }).disableTimeout()

  test('forget method should delete cached value using put method', async ({ expect }) => {
    const repository = await getRepository()

    const key = 'test'

    await repository.put(key, 'John Doe')

    expect(await repository.has(key)).toBeTruthy()

    await repository.forget(key)

    expect(await repository.has(key)).toBeFalsy()
  }).disableTimeout()

  test('forget method should delete cached value using put method with custom ttl', async ({
    expect
  }) => {
    const repository = await getRepository()

    const key = 'test'

    await repository.put(key, 'John Doe', 60 * 60 * 24)

    expect(await repository.has(key)).toBeTruthy()

    await repository.forget(key)

    expect(await repository.has(key)).toBeFalsy()
  }).disableTimeout()

  test('forget method should delete cached value using forever method', async ({ expect }) => {
    const repository = await getRepository()

    const key = 'test'

    await repository.forever(key, 'John Doe')

    expect(await repository.has(key)).toBeTruthy()

    await repository.forget(key)

    expect(await repository.has(key)).toBeFalsy()
  }).disableTimeout()

  test('forgetMultiple method should delete all cached value by keys', async ({ expect }) => {
    const repository = await getRepository()

    const key1 = 'test'
    const key2 = 'foo'

    const records = {
      [key1]: 'John Doe',
      [key2]: 'Anna'
    }

    await repository.putMany(records)

    expect(await repository.many(Object.keys(records))).toStrictEqual(records)

    await repository.forgetMultiple(Object.keys(records))

    expect(await repository.many(Object.keys(records))).toStrictEqual({
      [key1]: null,
      [key2]: null
    })
  }).disableTimeout()

  test('remember method should return cached value using put method', async ({ expect }) => {
    const repository = await getRepository()

    const key = 'test'
    const value = 'John Doe'
    const fallbackValue = 'Anna'

    await repository.put(key, value)

    const cachedValue = await repository.remember(key, null, async () => fallbackValue)

    expect(cachedValue).toStrictEqual(value)

    await repository.forget(key)
  }).disableTimeout()

  test('rememberForever method should return 0 as a valid value', async ({ expect }) => {
    const repository = await getRepository()

    const key = 'test'

    await repository.rememberForever(key, async () => 0)

    const cachedValue = await repository.rememberForever(key, async () => 1)

    expect(cachedValue).toStrictEqual(0)

    await repository.forget(key)
  }).disableTimeout()

  test('remember method should cache fallback value and return it if key not found', async ({
    expect
  }) => {
    const repository = await getRepository()

    const key = 'test'
    const fallbackValue = 'Anna'

    const cachedValue = await repository.remember(key, null, async () => {
      await sleep(500)

      return fallbackValue
    })

    expect(await repository.has(key)).toBeTruthy()
    expect(await repository.get(key)).toStrictEqual(fallbackValue)
    expect(cachedValue).toStrictEqual(fallbackValue)

    await repository.forget(key)
  }).disableTimeout()

  test('remember method should throw exception if closure is not a function', async ({
    expect
  }) => {
    const repository = await getRepository()

    expect(
      // @ts-ignore
      async () => await repository.remember('test', null, null)
    ).rejects.toThrowError('Closure must be a function')
  }).disableTimeout()

  test('remember method should throw exception if ttl is negative', async ({ expect }) => {
    const repository = await getRepository()

    expect(
      async () => await repository.remember('test', -200, async () => 'John Doe')
    ).rejects.toThrowError('Expiration time (TTL) cannot be negative')
  }).disableTimeout()

  test('sear method should cache an item forever', async ({ expect }) => {
    const repository = await getRepository()

    const key = 'test'
    const value = 'John Doe'

    const cachedValue = await repository.sear(key, async () => value)

    expect(await repository.has(key)).toBeTruthy()
    expect(cachedValue).toStrictEqual(value)

    await repository.forget(key)
  }).disableTimeout()

  test('rememberForever method should return cached value using put method', async ({ expect }) => {
    const repository = await getRepository()

    const key = 'test'
    const value = 'John Doe'
    const fallbackValue = 'Anna'

    await repository.put(key, value)

    const cachedValue = await repository.rememberForever(key, async () => fallbackValue)

    expect(cachedValue).toStrictEqual(value)

    await repository.forget(key)
  }).disableTimeout()

  test('rememberForever method should cache fallback value and return it if key not found', async ({
    expect
  }) => {
    const repository = await getRepository()

    const key = 'test'
    const fallbackValue = 'Anna'

    const cachedValue = await repository.rememberForever(key, async () => {
      await sleep(500)

      return fallbackValue
    })

    expect(await repository.has(key)).toBeTruthy()
    expect(await repository.get(key)).toStrictEqual(fallbackValue)
    expect(cachedValue).toStrictEqual(fallbackValue)

    await repository.forget(key)
  }).disableTimeout()

  test('rememberForever method should throw exception if closure is not a function', async ({
    expect
  }) => {
    const repository = await getRepository()

    expect(
      // @ts-ignore
      async () => await repository.rememberForever('test', null)
    ).rejects.toThrowError('Closure must be a function')
  }).disableTimeout()

  test('many method should return an object of key-value if keys are found', async ({ expect }) => {
    const repository = await getRepository()

    const key1 = 'test'
    const value1 = 'John Doe'
    const key2 = 'foo'
    const value2 = 'Anna'

    await repository.put(key1, value1)
    await repository.put(key2, value2)

    const records = await repository.many([key1, key2])

    expect(records).toEqual({
      [key1]: value1,
      [key2]: value2
    })

    await repository.forget(key1)
    await repository.forget(key2)
  }).disableTimeout()

  test('flush method should throw an exception', async ({ expect }) => {
    const repository = await getRepository()

    expect(async () => await repository.flush()).rejects.toThrowError(
      'DynamoDb does not support flushing an entire table. Please delete then create the cache table'
    )
  }).disableTimeout()

  test('tags method should throw an exception', async ({ expect }) => {
    const repository = await getRepository()

    expect(() => repository.tags('test')).toThrowError('This cache store does not support tagging')
  }).disableTimeout()
})
