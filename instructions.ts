import type { ApplicationContract } from '@ioc:Adonis/Core/Application'
import type { CacheStores } from '@ioc:Adonis/Addons/Cache'

import * as sinkStatic from '@adonisjs/sink'
import { join } from 'path'

type InstructionsState = {
  store: string
  cacheTableName: string
  dynamoDBCacheTableName: string
  disk: string
  stores: {
    [x in keyof Omit<CacheStores, 'dummy'>]: boolean
  }
}

const CONFIG_PARTIALS_BASE = './config/partials'

const STORE_PROMPT_CHOICES = [
  {
    name: 'database',
    message: 'Database',
    hint: '(Use a database table as cache store)'
  },
  {
    name: 'redis',
    message: 'Redis',
    hint: '(Use a Redis as cache store)'
  },
  {
    name: 'memcached',
    message: 'Memcached',
    hint: '(Use a memcached server as cache store)'
  },
  {
    name: 'in_memory',
    message: 'InMemory',
    hint: '(Use memory as cache store)'
  },
  {
    name: 'dyanmodb',
    message: 'DynamoDB',
    hint: '(Use a DynamoDB table as cache store)'
  },
  {
    name: 'file',
    message: 'File',
    hint: '(Use files as cache store)'
  }
]

async function getStore(sink: typeof sinkStatic): Promise<keyof CacheStores> {
  return sink
    .getPrompt()
    .choice(
      'Select which store you want to use for Cache (select using space)',
      STORE_PROMPT_CHOICES,
      {
        validate(choice) {
          return choice ? true : 'Select at least one store'
        }
      }
    )
}

function getStub(...paths: string[]) {
  return join(__dirname, 'templates', ...paths)
}

function makeConfig(
  projectRoot: string,
  app: ApplicationContract,
  sink: typeof sinkStatic,
  state: InstructionsState
) {
  const store = state.store
  const configDirectory = app.directoriesMap.get('config') || 'config'
  const configPath = join(configDirectory, 'cache.ts')

  const template = new sink.files.MustacheFile(
    projectRoot,
    configPath,
    getStub('config/config.txt')
  )
  template.overwrite = true

  const partial = getStub(CONFIG_PARTIALS_BASE, `${store.replace('_', '-')}-store.txt`)

  template
    .apply(state)
    .partials({ [`${store}_store`]: partial })
    .commit()
  sink.logger.action('create').succeeded(configPath)
}

function makeCacheMigration(
  projectRoot: string,
  app: ApplicationContract,
  sink: typeof sinkStatic,
  state: InstructionsState
) {
  const migrationsDirectory = app.directoriesMap.get('migrations') || 'database'
  const migrationPath = join(migrationsDirectory, `${Date.now()}_${state.cacheTableName}.ts`)

  const template = new sink.files.MustacheFile(projectRoot, migrationPath, getStub('migration.txt'))

  if (template.exists()) {
    sink.logger.action('create').skipped(`${migrationPath} file already exists`)

    return
  }

  template.apply(state).commit()
  sink.logger.action('create').succeeded(migrationPath)
}

function makeContract(projectRoot: string, app: ApplicationContract, sink: typeof sinkStatic) {
  const contractsDirectory = app.directoriesMap.get('contracts') || 'contracts'
  const contractPath = join(contractsDirectory, 'cache.ts')

  const template = new sink.files.MustacheFile(
    projectRoot,
    contractPath,
    getStub('contract/contract.txt')
  )
  template.overwrite = true

  template.commit()
  sink.logger.action('create').succeeded(contractPath)
}

async function getCacheTableName(sink: typeof sinkStatic): Promise<string> {
  return sink.getPrompt().ask('Enter the cache table name', {
    default: 'cache',
    validate(value) {
      return !!value.trim().length
    }
  })
}

async function getDynamoDBCacheTableName(sink: typeof sinkStatic): Promise<string> {
  return sink.getPrompt().ask('Enter the DynamoDB cache table name', {
    default: 'Cache',
    validate(value) {
      return !!value.trim().length
    }
  })
}

async function getCacheDisk(sink: typeof sinkStatic): Promise<string> {
  return sink.getPrompt().ask('Enter the disk cache name', {
    default: 'cache',
    validate(value) {
      return !!value.trim().length
    }
  })
}

async function getMigrationConsent(sink: typeof sinkStatic, tableName: string): Promise<boolean> {
  return sink
    .getPrompt()
    .confirm(`Create migration for the ${sink.logger.colors.underline(tableName)} table?`)
}

export default async function instructions(
  projectRoot: string,
  app: ApplicationContract,
  sink: typeof sinkStatic
) {
  const state: InstructionsState = {
    store: '',
    cacheTableName: '',
    dynamoDBCacheTableName: '',
    disk: '',
    stores: {
      database: false,
      redis: false,
      in_memory: false,
      memcached: false,
      dynamodb: false,
      file: false
    }
  }

  state.store = await getStore(sink)
  state.stores[state.store] = true

  const stores = {
    async database() {
      state.cacheTableName = await getCacheTableName(sink)

      const cacheMigrationConsent = await getMigrationConsent(sink, state.cacheTableName)

      if (cacheMigrationConsent) {
        makeCacheMigration(projectRoot, app, sink, state)
      }
    },

    async dynamodb() {
      state.dynamoDBCacheTableName = await getDynamoDBCacheTableName(sink)
    },

    async file() {
      state.disk = await getCacheDisk(sink)
    }
  }

  if (Object.keys(stores).includes(state.store)) {
    await stores[state.store]()
  }

  makeContract(projectRoot, app, sink)
  makeConfig(projectRoot, app, sink, state)
}
