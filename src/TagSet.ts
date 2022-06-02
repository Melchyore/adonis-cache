import type { CacheStoreContract } from '@ioc:Adonis/Addons/Cache'

import crypto from 'crypto'

export default class TagSet {
  constructor(private store: CacheStoreContract, private names: Array<string> = []) {}

  public async reset(): Promise<void> {
    for (let name of this.names) {
      await this.resetTag(name)
    }
  }

  public async resetTag(name: string): Promise<string> {
    const id = crypto.randomBytes(8).toString('hex')

    await this.store.forever(this.tagKey(name), id)

    return id
  }

  public async flush(): Promise<void> {
    for (let name of this.names) {
      await this.flushTag(name)
    }
  }

  public async flushTag(name: string): Promise<void> {
    await this.store.forget(this.tagKey(name))
  }

  public tagKey(name: string): string {
    return 'tag:' + name + ':key'
  }

  public async getNamespace(): Promise<string> {
    return (await this._tagIds()).join('|')
  }

  public async tagId(name: string): Promise<string> {
    const id = await this.store.get<string>(this.tagKey(name))

    return id || this.resetTag(name)
  }

  private _tagIds(): Promise<Array<string>> {
    return Promise.all(this.names.map((name) => this.tagId(name)))
  }
}
