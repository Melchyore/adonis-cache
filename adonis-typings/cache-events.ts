declare module '@ioc:Adonis/Addons/Cache' {
  export type CacheEventPayload = {
    key: string
    value?: unknown
    expiration?: number
  }

  export type CacheEvents = import('../src/Enums/CacheEvents').default

  export interface CacheEventContract extends CacheEventPayload {
    EVENT: CacheEvents

    toJSON(): CacheEventPayload
  }

  export type CacheClearEventPayload = { store: keyof CacheStoresList }

  export type CacheEventsConfig = Record<CacheEvents, boolean>
}

declare module '@ioc:Adonis/Core/Event' {
  import type {
    CacheEventPayload,
    CacheClearEventPayload,
    CacheEvents
  } from '@ioc:Adonis/Addons/Cache'

  type Events = {
    [E in 'CacheEvents']: CacheEventPayload
  } & {
    'cache:clearing': CacheClearEventPayload
    'cache:cleared': CacheClearEventPayload
  }

  export interface EventsList extends Events {}
}
