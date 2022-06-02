declare module '@ioc:Adonis/Addons/Cache' {
  export type CacheEventPayload = {
    key: string
    value?: unknown
    expiration?: number
  }

  export enum CacheEvents {
    Hit = 'cache:hit',
    Missed = 'cache:missed',
    KeyWritten = 'cache:key_written',
    KeyForgotten = 'cache:key_forgotten'
  }

  export interface CacheEventContract extends CacheEventPayload {
    EVENT: CacheEvents

    toJSON(): CacheEventPayload
  }

  export type CacheClearEventPayload = { store: keyof CacheStoresList }

  export type CacheEventsConfig = Record<CacheEvents, boolean>
}

declare module '@ioc:Adonis/Core/Event' {
  import type { CacheEventPayload, CacheClearEventPayload } from '@ioc:Adonis/Addons/Cache'

  export interface EventsList {
    'cache:hit': CacheEventPayload
    'cache:missed': CacheEventPayload
    'cache:key_written': CacheEventPayload
    'cache:key_forgotten': CacheEventPayload
    'cache:clearing': CacheClearEventPayload
    'cache:cleared': CacheClearEventPayload
  }
}
