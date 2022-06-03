- [Adonis Cache](#adonis-cache)
- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Install](#install)
- [Config](#config)
- [Commands](#commands)
  * [Migration file](#migration-file)
  * [Remove an item](#remove-an-item)
  * [Clear/flush the cache](#clear-flush-the-cache)
- [REPL](#repl)
- [Views](#views)
- [Stores](#stores)
  * [Database](#database)
  * [DynamoDB](#dynamodb)
  * [File](#file)
  * [Memcached](#memcached)
  * [Redis](#redis)
- [Usage](#usage)
  * [Store items](#store-items)
    + [One item](#one-item)
    + [Store if not present](#store-if-not-present)
    + [Store items forever](#store-items-forever)
    + [Multiple items](#multiple-items)
  * [Retrieve items](#retrieve-items)
    + [One item](#one-item-1)
    + [Multiple items](#multiple-items-1)
    + [Retrieve and store](#retrieve-and-store)
    + [Retrieve and delete](#retrieve-and-delete)
  * [Checking for item existence](#checking-for-item-existence)
  * [Incrementing / Decrementing values](#incrementing---decrementing-values)
  * [Removing items from the cache](#removing-items-from-the-cache)
    + [One item](#one-item-2)
    + [Multiple items](#multiple-items-2)
    + [All the items](#all-the-items)
  * [Cache tags](#cache-tags)
    + [Store items using tags](#store-items-using-tags)
    + [Access items](#access-items)
    + [Remove items](#remove-items)
- [Switching between stores](#switching-between-stores)
- [Adding a custom cache driver](#adding-a-custom-cache-driver)
  * [Extending from outside in](#extending-from-outside-in)
  * [Informing TypeScript about the new driver](#informing-typescript-about-the-new-driver)
  * [Using the driver](#using-the-driver)
- [Run tests](#run-tests)
- [Author](#author)
- [Contributing](#contributing)
- [Show your support](#show-your-support)
- [License](#license)


# Adonis Cache

[![gh-workflow-image]][gh-workflow-url] [![coverage-image]][coverage-url] [![npm-image]][npm-url] [![license-image]][license-url] [![typescript-image]][typescript-url]

Cache package for AdonisJS V5

# Introduction
Caching refers to the practice of saving content created during (and even outside) the request-response cycle and reusing it when responding to similar requests.

Caching is often the most effective approach to improve the performance of an application. It can reduce the CPU usage and improve the response time of your server.

This package offers an unified API for many cache stores (Database, DynamoDB, File, InMemory, Memcached and Redis).

# Prerequisites

- @adonis/lucid >= 18.0.0
- @adonisjs/core >= 5.8.2

# Install

```sh
npm i @melchyore/adonis-cache
# or
yarn add @melchyore/adonis-cache
```

# Config

```sh
node ace configure @melchyore/adonis-cache

node ace generate:manifest
```

The configuration for the cache package is stored inside the `config/cache.ts` file. Inside this file, you can define multiple stores.

```ts
import { cacheConfig } from '@melchyore/adonis-cache/build/config'

export default cacheConfig({
  prefix: 'cache_',
  store: 'redis',
  stores: {
    redis: {
      driver: 'redis'
    },
    memcached: {
      driver: 'memcached'
    },
    database: {
      driver: 'database',
      table: 'cache'
    },
    dynamodb: {
      driver: 'dynamodb',
      table: 'Cache'
    },
    file: {
      driver: 'file',
      disk: 'cache'
    },
    in_memory: {
      driver: 'in_memory'
    }
  },
  ttl: 60,
  events: {
    'cache:hit': true,
    'cache:missed': true,
    'cache:key_written': true,
    'cache:key_forgotten': true
  }
})
```

#### prefix
The `prefix` property is used to prefix each key before storing it in the cache.

The default prefix is `cache_`. When you will store an item in the cache with a key, for example `await Cache.put('key')`, the key will be `cache_key`. You don't have to write the prefix when you retrieve an item, the package will do it for you.

---

#### store
The `store` property represents the default store to use for caching data.

---

#### stores
The `stores` objects defines the stores you want to use throughout your application. Each store must specify the driver it wants to use.

You can define a `prefix` property for each store driver. It will overwrite the global prefix.

```ts
{
  stores: {
    redis: {
      driver: 'redis',
      prefix: 'foo_',
    },
    memcached: {
      driver: 'memcached',
      prefix: 'bar_',
    }
  }
}
```

---

#### ttl (time to live)
The `ttl` defines the period of time **represented in seconds**, that data should exist in the cache before being removed.

`Redis`, `Memcached`, and `DynamoDB` all support automatic ttl, which means that stale records will be automatically deleted. For other stores, when you try to retrieve the items, the stale ones will be deleted for you.

The default value is 60 (1 minute). If the following methods (`put`, `putMany`, `add`, `set`, and `remember`) don't define a ttl, the default value will be used.

---

#### events
The `events` object represents the events that will be fired for each cache operation.

`cache:hit` is fired when an item has been retrieved from the cache.

`cache:missed` is fired when an item has not been retrieved from the cache.

`cache:key_written` is fired when a new item is stored in the cache.

`cache:key_forgotten` is fired when an item is deleted from the cache.

Do not delete an event from the list, if you choose to disable one of them, just set its value to `false` and it will not be fired.

# Commands

## Migration file
You can generate a migration file for the cache table using the following command.

```sh
node ace cache:table <tableName>
```

> **_NOTICE:_** tableName is an optional argument. If it's not provided, the default name `"cache"` will be used.

## DynamoDB table
If you didn't select DynamoDB as main store at package configuration and wish to use it later, you can create a table using the following command.

```sh
node ace cache:dynamodb <tableName>
```

> **_NOTICE:_** tableName is an optional argument. If it's not provided, the default name `"Cache"` will be used.

## Remove an item
If you wish to remove an item from the cache, you should run the below command.
```sh
node ace cache:forget <key> <store>
```

> **_NOTICE:_** store is an optional argument. If it's not provided, the item will be removed from the default cache store.

## Clear/flush the cache
```sh
node ace cache:forget <store>
```

When the cache is being cleared, the `cache:clearing` is fired.

After the clean operation, the `cache:cleared` is fired.

> **_NOTICE:_** store is an optional argument. If it's not provided, the default cache will be cleared.

# REPL
You can access to Cache module inside REPL.
```sh
node ace repl

loadCache()

# Loaded Cache module. You can access it using the "Cache" variable

await Cache.put('foo', 'bar')

await Cache.get('foo')
# 'bar'
```

# Views
The `cache` helper method grants you access to all the features provided by this package.

> **_NOTE_:** The `cache` helper is not registered when running in "test" environment.

```ts
// test.edge

{{ await cache.get('foo') }}
```

---

# Stores
Following is the list of the official drivers.

## Database

The `Database` store uses the default database connection from the environment variables. However, you can specify a custom connection (that is already defined inside `config/database.ts`). To do that, just open `config/cache.ts` file and add the `connection` property to the `database` driver object

```ts
{
  stores: {
    database: {
      driver: 'database',
      connection: 'connectionName',
      table: 'cache',
    }
  }
}
```

> **_NOTE:_** You may also use the `node ace cache:table` command with an optional argument `tableName` to generate a migration with the proper schema. If the `tableName` argument is not specified, the default name `cache` will be used.

> **_NOTE:_** Don't forget to run `node ace migration:run` command to create the table in the database.

## DynamoDB

In order to use the `DynamoDB` store, you will need to install and configure [adonis-dynamodb](https://github.com/Melchyore/adonis-dynamodb).

Then, open `config/cache.ts` and add the following content if it's not already present

```ts
dynamodb: {
  driver: 'dynamodb',
  table: 'Cache'
}
```

You can use whatever you want as table name. Conventionally, the name starts with an uppercase letter.

The first time you use it, you may notice that it takes a few seconds. This is perfectly normal as it needs some time to set up the table.

## File
***Items stored in the cache using the `File` store are NOT encrypted.***

The `File` store uses `Drive` under the hood. You must define a disk with the following configuration inside `config/drive.ts`

```ts
disks: {
  // Other disks

  diskName: {
    driver: 'local',
    visibility: 'private',
    root: './tmp', // You can change tmp by whatever you want.
  },
}
```
> **_NOTE:_** Only `local` driver is supported.

> **_NOTE:_** The `root` property must be a **RELATIVE** path.

Open `config/cache.ts` and add the following content if it's not already present

```ts
{
  stores: {
    // Other stores

    file: {
      driver: 'file',
      disk: 'diskName'
    },
  }
}
```

## Memcached

You need to install first [adonis5-memcached-client](https://github.com/VladyslavParashchenko/adonis5-memcached-client).
```sh
npm i adonis5-memcached-client
# or
yarn add adonis5-memcached-client
```

Configure provider
```sh
node ace configure adonis5-memcached-client
```

Add an environment variable for the Memcached server URL inside `.env`
```sh
MEMCACHED_SERVER_URL=host:port
```

You need to change the `host` and `port`. For example: `localhost:11211`

> **_NOTE:_** Memcached listens by default on port 11211.

You can run Memcached using the official docker image: https://hub.docker.com/_/memcached

Open `config/cache.ts` and add the following content if it's not already present
```ts
{
  stores: {
    // Other stores

    memcached: {
      driver: 'memcached'
    },
  }
}
```

## Redis
Install the official AdonisJs Redis package and configure it

```sh
npm i @adonisjs/redis
# or
yarn add @adonisjs/redis

# Configure the package
node ace configure @adonisjs/redis
```

```ts
{
  stores: {
    // Other stores

    redis: {
      driver: 'redis',

      /**
       * By default, it will use the default Redis
       * connection from the environment variables.
       * You can specify another connection
       * by adding the `connection` property.
      */
      connection: 'connectionName'
    },
  }
}
```

It is highly recommended to create a dedicated connection for caching, since calling `flush`/`clear` methods will delete **ALL** the records.

## InMemory
InMemory cache is usually used for development purposes.

```ts
{
  stores: {
    // Other stores

    in_memory: {
      driver: 'in_memory'
    },
  }
}
```

# Usage

## Store items

### One item
You may use the `put` method to store items in the cache.
```ts
import Cache from '@ioc:Adonis/Addons/Cache'

await Cache.put('town', 'New York', seconds | null)
```

You can also specify expiration time (aka TTL or Time to Live) expressed in seconds as third parameter.
```ts
import Cache from '@ioc:Adonis/Addons/Cache'

// Store for 20 seconds.
await Cache.put('town', 'New York', 20)
```

The `set` method is an alias of `put`.
```ts
import Cache from '@ioc:Adonis/Addons/Cache'

await Cache.set('town', 'New York', seconds | null)
```

### Store if not present
The `add` method will only add the item to the cache if it does not already exist in the cache store.
```ts
import Cache from '@ioc:Adonis/Addons/Cache'

await Cache.add('town', 'New York', seconds | null)
```

### Store items forever
The `forever` method may be used to store an item in the cache permanently. Since these items will not expire, they must be manually removed from the cache using the `forget` method.
```ts
import Cache from '@ioc:Adonis/Addons/Cache'

await Cache.forever('town', 'New York')
```

### Multiple items
The ```putMany``` method stores an object of items into the cache.
```ts
import Cache from '@ioc:Adonis/Addons/Cache'

const data = {
  town: 'New York',
  country: 'USA'
}

await Cache.putMany(data, seconds | null)

// Retrieve items
const town = await Cache.get('town') // 'New York'
const country = await Cache.get('country') // 'USA'
```

If you need to store multiple items permanently, you may use the `putManyForever` method.
```ts
import Cache from '@ioc:Adonis/Addons/Cache'

const data = {
  town: 'New York',
  country: 'USA'
}

await Cache.putManyForever(data)
```

## Retrieve items

### One item

```ts
import Cache from '@ioc:Adonis/Addons/Cache'

const item = await Cache.get<string>('town')
```

### Multiple items
```ts
import Cache from '@ioc:Adonis/Addons/Cache'

const items = await Cache.many<Record<string, any>>(['town', 'country'])
```

The `many` method will return an object with cache keys and their values. If a key is not found, the value will be `null`.

> **_NOTICE:_** It is not recommended to use this function a lot because not all drivers have the ability to get items in bulk.

```ts
import Cache from '@ioc:Adonis/Addons/Cache'

await Cache.put('town', 'New York')

const items = await Cache.many<Record<string, any>>(['town', 'country'])
```

`items` value will be:
```json
{
  "town": "test",
  "country": null
}
```

### Retrieve and store
Sometimes you may wish to retrieve an item from the cache, but also store a default value if the requested item doesn't exist. For example, you may wish to retrieve all posts from the cache or, if they don't exist, retrieve them from the database and add them to the cache. You may do this using the `remember` method.
```ts
import Cache from '@ioc:Adonis/Addons/Cache'

import Post from 'App/Models/Post'

const posts = await Cache.remember('posts', seconds | null, async () => await Post.all())
```
If the item does not exist in the cache, the closure passed to the `remember` method will be executed and its result will be placed in the cache.

If you wish to store the item with the default TTL, you need to pass `null` as second parameter.

You may use the `rememberForever` (or its alias `sear`) method to retrieve an item from the cache or store it forever if it does not exist. It accepts a closure as second parameter.
```ts
import Cache from '@ioc:Adonis/Addons/Cache'
import Post from 'App/Models/Post'

const posts = await Cache.rememberForever('posts', async () => await Post.all())
```

### Retrieve and delete
If you need to retrieve an item from the cache and then delete the item, you may use the `pull` method. Like the `get` method, `null` will be returned if the item does not exist in the cache.

```ts
import Cache from '@ioc:Adonis/Addons/Cache'

const value = await Cache.get('key')
```

## Checking for item existence
The `has` method may be used to determine if an item exists in the cache.

```ts
import Cache from '@ioc:Adonis/Addons/Cache'

const exists = await Cache.has('key') // true or false
```

You can also use the `missing` method. It will return `true` if the item does not exist in the cache.
```ts
import Cache from '@ioc:Adonis/Addons/Cache'

const exists = await Cache.missing('key') // true or false
```

## Incrementing / Decrementing values
To change the value of integer items in the cache, use the `increment` and `decrement` methods. Both of these methods accept an optional second parameter specifying the amount by which the item's value should be incremented or decremented.

```ts
import Cache from '@ioc:Adonis/Addons/Cache'

await Cache.increment('count') // Increment by 1
await Cache.increment('count', 5) // Increment by 5

await Cache.decrement('count') // Decrement by 1
await Cache.decrement('count', 5) // Decrement by 5
```

## Removing items from the cache

### One item
```ts
import Cache from '@ioc:Adonis/Addons/Cache'

await Cache.forget('town')
```

### Multiple items
```ts
import Cache from '@ioc:Adonis/Addons/Cache'

await Cache.forgetMultiple(['town', 'country'])
```

### All the items
```ts
import Cache from '@ioc:Adonis/Addons/Cache'

await Cache.flush()

// or

await Cache.clear()
```

## Cache tags
> **_NOTE:_** Cache tags are only supported when using `redis`, `memcached` or `dynamodb` drivers.

Cache tags can be used to store, access, and partially flush your cache using a given tag.

Think of tag as a namespace. If you store items using a tag (namespace), they will be accessed only using the tag.

If using multiple tags to store an item, tags list must **ALWAYS** be ordered. It means that storing items using `['tag_1', 'tag_2')]` and accessing them using `['tag_2', 'tag_1')]` will return `null`.

### Store items using tags

```ts
import Cache from '@ioc:Adonis/Addons/Cache'

await Cache.tags(['tag_1', 'tag_2']).put('town', 'New York', seconds | null)

await Cache.tags('tag_3').put('country', 'USA')
```

### Access items

```ts
import Cache from '@ioc:Adonis/Addons/Cache'

await Cache.tags(['tag_1', 'tag_2']).get('town') // Return New York
await Cache.tags(['tag_2', 'tag_1']).get('town') // Return null because tags list is not in the same order
await Cache.get('town') // Return NULL

await Cache.tags('tag_3').get('country') // Return USA
await Cache.get('country') // Return NULL
```

### Remove items
Using `flush` or `clear` method with tags allow you to remove only the items stored using the same tag.

```ts
import Cache from '@ioc:Adonis/Addons/Cache'

await Cache.tags(['tag_1', 'tag_2']).flush()

await Cache.tags('tag_3').flush()
```

# Switching between stores
```ts
import Cache from '@ioc:Adonis/Addons/Cache'

const Memcached = Cache.use('memcached')

await Memcached.put('town', 'New York')

const InMemory = Cache.use('in_memory')

await InMemory.put('town', 'Madrid')
```

# Adding a custom cache driver

The Cache exposes the API to add your custom drivers. Every driver must adhere to the [CacheStoreContract](CacheStoreContract).

```ts
export interface CacheStoreContract {
    get<T = any>(key: string): Promise<T | null>

    many<T extends Record<string, any>>(keys: Array<string>): Promise<T>

    put<T = any>(key: string, value: T, ttl: number): Promise<boolean>

    increment(key: string, value: number): Promise<number | boolean>

    decrement(key: string, value: number): Promise<number | boolean>

    putMany(list: Record<string, unknown>, ttl: number): Promise<Array<boolean>>

    putManyForever(list: Record<string, unknown>): Promise<Array<boolean>>

    has(key: string): Promise<boolean>

    forever<T = any>(key: string, value: T): Promise<boolean>

    forget(key: string): Promise<boolean>

    flush(): Promise<boolean>

    calculateTTL(ttlInMilliseconds: number): number

    add?<T = any>(key: string, value: T, ttl?: number): Promise<boolean>

    tags?(names: string | Array<string>): TaggedCacheContract
  }
```

#### get
Return the cached value or `null`.
___

#### many
Return an object with cached records. If a key is not present in the cache, it will have a `null` value.
___

#### put
Store an item in the cache for a given number of seconds. Return a boolean to indicate if the operation has succeed or not.
___

#### increment
Return the incremented value or `false` if operation has failed.
___

#### decrementcrement
Return the decremented value or `false` if operation has failed.
___

#### putMany
Store multiple items in the cache for a given number of seconds. Return an array of booleans.
___

#### putManyForever
Store multiple items in the cache permanently. Return an array of booleans.
___

#### has
Return a boolean to indicate if the key exists in the cache.
___

#### forever
Store an item in the cache permanently. Return of boolean.
___

#### forget
Delete an item from the cache. Return a boolean.
___

#### flush
Delete all items from the cache. Return a boolean.
___

#### calculateTTL (optional method)
Return the ttl passed as parameter expressed in milliseconds. If your store supports automatic ttl expressed in seconds for example (this is the case for [Memcached](https://github.com/Melchyore/adonis-cache/blob/master/src/Stores/Memcached.ts#L14) and [DynamoDB](https://github.com/Melchyore/adonis-cache/blob/master/src/Stores/DynamoDB.ts#L22)), you should return `ttlInMilliseconds / 1000`.
___

#### add (optional method)
Store an item in the cache if the key does not exist for a given number of seconds. Return a boolean.
___

#### tags (optional method)
Begin executing a new tags operation if the store supports it. The store must extend from `TaggableStore`.

```ts
import type { CacheStoreContract } from '@ioc:Adonis/Addons/Cache'

import { TaggableStore } from '@ioc:Adonis/Addons/Cache/Stores'

export class DummyStore extends TaggableStore implements CacheStoreContract {}
```

## Extending from outside in
For demonstration purposes, let's create a dummy store with no implementation.

```sh
mkdir providers/DummyStore
touch providers/DummyStore/index.ts
```

Open the `DummyStore/index.ts` file and paste the following contents inside it.

```ts
import type { CacheStoreContract } from '@ioc:Adonis/Addons/Cache'

import { BaseCacheStore } from '@ioc:Adonis/Addons/Cache/Stores'

export interface DummyStoreContract extends CacheStoreContract {}

export type DummyStoreConfig = {
  driver: 'dummy' // Driver name
  // ... other config options
}

export class DummyStore extends BaseCacheStore implements DummyStoreContract {
  // Implementation goes here
}
```

Next, you must register the driver with the Cache module. You must do it inside the boot method of a service provider. Open the pre-existing `providers/AppProvider.ts` file and paste the following code inside it.

```ts
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class AppProvider {
  constructor(protected app: ApplicationContract) {}

  public async boot() {
    const { DummyStore } = await import('./DummyStore')
    const Cache = this.app.container.use('Adonis/Addons/Cache')

    Cache.extend('dummy', (cache, store, config) => {
      return Cache.repository(config, new DummyStore())
    })
  }
}
```

## Informing TypeScript about the new driver
Before someone can reference this driver within the `config/cache.ts` file. You will have to inform TypeScript static compiler about its existence.

If you are creating a package, then you can write the following code inside your package main file, otherwise you can write it inside the `contracts/cache.ts` file.

```ts
import {
  DummyStoreConfig,
  DummyStoreContract
} from '../providers/DummyStore'

declare module '@ioc:Adonis/Addons/Cache' {
  interface CacheStores {
    dummy: {
      config: DummyStoreConfig
      implementation: DummyStoreContract
    }
  }
}
```

## Using the driver
Open `config/cache.ts` and add the following content

```ts
{
  stores: {
    dummy: {
      driver: 'dummy',
      // ... rest of the config
    }
  }
}
```

```ts
import Cache from '@ioc:Adonis/Addons/Cache'

const Dummy = Cache.use('dummy')

await Dummy.put('test', 'Test dummy driver')
await Dummy.get('test')
```

# Run tests

```sh
npm test
```

# Author

👤 **Oussama Benhamed**

* Twitter: [@Melchyore](https://twitter.com/Melchyore)
* Github: [@Melchyore](https://github.com/Melchyore)

# Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/Melchyore/adonis-cache/issues). 

# Show your support

Give a ⭐️ if this project helped you!

<a href="https://www.patreon.com/melchyore">
  <img src="https://c5.patreon.com/external/logo/become_a_patron_button@2x.png" width="160" />
</a>

<a href="https://www.buymeacoffee.com/melchyore" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="160" />
</a>

<a href="https://paypal.me/melchyore" target="_blank">
  <img src="https://assets.stickpng.com/images/580b57fcd9996e24bc43c530.png" width="160" >
</a>

# License

Copyright © 2022 [Oussama Benhamed](https://github.com/Melchyore).<br />
This project is [MIT](https://github.com/Melchyore/adonis-cache/blob/master/LICENSE.md) licensed.

[gh-workflow-image]: https://img.shields.io/github/workflow/status/Melchyore/adonis-cache/test?style=for-the-badge
[gh-workflow-url]: https://github.com/Melchyore/adonis-cache/actions/workflows/test.yml "Github action"

[coverage-image]: https://img.shields.io/coveralls/github/Melchyore/adonis-cache/master?style=for-the-badge
[coverage-url]: https://coveralls.io/github/Melchyore/adonis-cache "Coverage"

[npm-image]: https://img.shields.io/npm/v/@melchyore/adonis-cache.svg?style=for-the-badge&logo=npm
[npm-url]: https://npmjs.org/package/@melchyore/adonis-cache "npm"

[license-image]: https://img.shields.io/npm/l/@melchyore/adonis-cache?color=blueviolet&style=for-the-badge
[license-url]: LICENSE.md "license"

[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[typescript-url]:  "typescript"
