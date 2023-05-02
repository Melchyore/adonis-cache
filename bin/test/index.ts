import { expect } from '@japa/expect'
import { assert } from '@japa/assert'
import { specReporter } from '@japa/spec-reporter'
import { runFailedTests } from '@japa/run-failed-tests'
import { processCliArgs, configure, run } from '@japa/runner'

/*
|--------------------------------------------------------------------------
| Configure tests
|--------------------------------------------------------------------------
|
| The configure method accepts the configuration to configure the Japa
| tests runner.
|
| The first method call "processCliArgs" process the command line arguments
| and turns them into a config object. Using this method is not mandatory.
|
| Please consult japa.dev/runner-config for the config docs.
*/
configure({
  ...processCliArgs(process.argv.slice(2)),
  ...{
    //files: ['tests/**/*.spec.ts'],
    suites: [
      {
        name: 'unit',
        files: ['tests/unit/**/*.spec(.ts|.js)']
      },
      {
        name: 'functional',
        files: ['tests/functional/**/*.spec(.ts|.js)'],
        configure(suite) {
          suite.onTest((test) => {
            test.retry(4)
          })

          suite.onGroup((group) => {
            group.tap((test) => {
              test.retry(4)
            })
          })
        }
      }
    ],
    plugins: [expect(), assert(), runFailedTests()],
    reporters: [specReporter()],
    importer: (filePath: string) => import(filePath),
    forceExit: true
  }
})

/**
 * Setup context
 */

/*
|--------------------------------------------------------------------------
| Run tests
|--------------------------------------------------------------------------
|
| The following "run" method is required to execute all the tests.
|
*/
run()
