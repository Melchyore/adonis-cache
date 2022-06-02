import { cacheConfig } from '../../config'

export default cacheConfig({
  prefix: 'cache_',
  store: 'in_memory',
  stores: {
    in_memory: {
      driver: 'in_memory',
      prefix: 'test_'
    },
    redis: {
      driver: 'redis',
      connection: 'primary'
    },
    memcached: {
      driver: 'memcached'
    },
    dynamodb: {
      driver: 'dynamodb',
      table: 'Cache'
    },
    database: {
      driver: 'database',
      connection: 'mysql',
      table: 'cache'
    },
    file: {
      driver: 'file',
      disk: 'cache'
    },
    dummy: {
      driver: 'dummy'
    }
  },
  ttl: 2,
  events: {
    'cache:hit': true,
    'cache:missed': true,
    'cache:key_written': true,
    'cache:key_forgotten': true
  }
})
