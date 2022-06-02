import type { AsyncFunction } from '@ioc:Adonis/Addons/Cache'

import crypto from 'crypto'

export default class Utils {
  public static isFunction(value: unknown): value is AsyncFunction {
    return typeof value === 'function'
  }

  public static sha1(str: string): string {
    return crypto.createHash('sha1').update(str).digest('hex')
  }

  public static chunks(str: string, length: number): Array<string> {
    return str.match(new RegExp(`.{1,${length}}`, 'g')) ?? []
  }
}
