import { Expect } from '@japa/expect'
import { Assert } from '@japa/assert'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

declare module '@japa/runner' {
  interface TestContext {
    // notify TypeScript about custom context properties
    expect: Expect,
    assert: Assert,
    app: ApplicationContract
  }

  /*interface Test<Context, TestData> {
    // notify TypeScript about custom test properties
  }*/
}
