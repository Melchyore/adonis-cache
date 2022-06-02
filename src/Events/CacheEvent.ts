import type { EmitterContract } from '@ioc:Adonis/Core/Event'
import type { CacheConfig, CacheEventContract } from '@ioc:Adonis/Addons/Cache'

export default class CacheEvent {
  constructor(private config: CacheConfig, private emitter: EmitterContract) {}

  public emit(data: CacheEventContract): void {
    const event = data.EVENT

    if (this.config.events[event]) {
      this.emitter.emit(event, data.toJSON())
    }
  }
}
