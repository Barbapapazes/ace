/*
 * @adonisjs/ace
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { Kernel } from '../../src/kernel.js'
import { args } from '../../src/decorators/args.js'
import { flags } from '../../src/decorators/flags.js'
import { ListLoader } from '../../src/loaders/list_loader.js'
import { BaseCommand } from '../../src/commands/base.js'

test.group('List command', () => {
  test('show list of all the registered commands', async ({ assert }) => {
    const kernel = new Kernel()
    kernel.ui.switchMode('raw')

    class Serve extends BaseCommand {
      static commandName: string = 'serve'
      static description: string = 'Start the AdonisJS HTTP server'
    }

    class MakeController extends BaseCommand {
      @args.string({ description: 'Name of the controller' })
      name!: string

      @flags.boolean({ description: 'Add resourceful methods', default: false })
      resource!: boolean

      static aliases: string[] = ['mc']
      static commandName: string = 'make:controller'
      static description: string = 'Make a new HTTP controller'
    }

    kernel.addLoader(new ListLoader([Serve, MakeController]))
    const command = await kernel.exec('list', [])

    assert.equal(command.exitCode, 0)
    assert.deepEqual(kernel.ui.logger.getLogs(), [
      {
        message: '',
        stream: 'stdout',
      },
      {
        message: 'yellow(Available commands:)',
        stream: 'stdout',
      },
      {
        message: [
          '  green(list)                       dim(View list of available commands)',
          '  green(serve)                      dim(Start the AdonisJS HTTP server)',
        ].join('\n'),
        stream: 'stdout',
      },
      {
        message: '',
        stream: 'stdout',
      },
      {
        message: 'yellow(make)',
        stream: 'stdout',
      },
      {
        message: '  green(make:controller) dim((mc))  dim(Make a new HTTP controller)',
        stream: 'stdout',
      },
    ])
  })

  test('show list of all the registered commands for a namespace', async ({ assert }) => {
    const kernel = new Kernel()
    kernel.ui.switchMode('raw')

    class Serve extends BaseCommand {
      static commandName: string = 'serve'
      static description: string = 'Start the AdonisJS HTTP server'
    }

    class MakeController extends BaseCommand {
      @args.string({ description: 'Name of the controller' })
      name!: string

      @flags.boolean({ description: 'Add resourceful methods', default: false })
      resource!: boolean

      static aliases: string[] = ['mc']
      static commandName: string = 'make:controller'
      static description: string = 'Make a new HTTP controller'
    }

    kernel.addLoader(new ListLoader([Serve, MakeController]))
    const command = await kernel.exec('list', ['make'])

    assert.equal(command.exitCode, 0)
    assert.deepEqual(kernel.ui.logger.getLogs(), [
      {
        message: '',
        stream: 'stdout',
      },
      {
        message: 'yellow(make)',
        stream: 'stdout',
      },
      {
        message: '  green(make:controller) dim((mc))  dim(Make a new HTTP controller)',
        stream: 'stdout',
      },
    ])
  })

  test('display error when namespace is invalid', async ({ assert }) => {
    const kernel = new Kernel()
    kernel.ui.switchMode('raw')

    class Serve extends BaseCommand {
      static commandName: string = 'serve'
      static description: string = 'Start the AdonisJS HTTP server'
    }

    class MakeController extends BaseCommand {
      @args.string({ description: 'Name of the controller' })
      name!: string

      @flags.boolean({ description: 'Add resourceful methods', default: false })
      resource!: boolean

      static aliases: string[] = ['mc']
      static commandName: string = 'make:controller'
      static description: string = 'Make a new HTTP controller'
    }

    kernel.addLoader(new ListLoader([Serve, MakeController]))
    const command = await kernel.exec('list', ['foo'])

    assert.equal(command.exitCode, 1)
    assert.deepEqual(kernel.ui.logger.getLogs(), [
      {
        message: 'red(Namespace "foo" is not defined)',
        stream: 'stderr',
      },
    ])
  })

  test('show list of all kernel global flags', async ({ assert }) => {
    const kernel = new Kernel()
    kernel.ui.switchMode('raw')

    class Serve extends BaseCommand {
      static commandName: string = 'serve'
      static description: string = 'Start the AdonisJS HTTP server'
    }

    class MakeController extends BaseCommand {
      @args.string({ description: 'Name of the controller' })
      name!: string

      @flags.boolean({ description: 'Add resourceful methods', default: false })
      resource!: boolean

      static aliases: string[] = ['mc']
      static commandName: string = 'make:controller'
      static description: string = 'Make a new HTTP controller'
    }

    kernel.addLoader(new ListLoader([Serve, MakeController]))
    kernel.defineFlag('help', { type: 'boolean', description: 'View help of a given command' })
    const command = await kernel.exec('list', [])

    assert.equal(command.exitCode, 0)
    assert.deepEqual(kernel.ui.logger.getLogs(), [
      {
        message: '',
        stream: 'stdout',
      },
      {
        message: 'yellow(Options:)',
        stream: 'stdout',
      },
      {
        message: '  green(--help)                     dim(View help of a given command)',
        stream: 'stdout',
      },
      {
        message: '',
        stream: 'stdout',
      },
      {
        message: 'yellow(Available commands:)',
        stream: 'stdout',
      },
      {
        message: [
          '  green(list)                       dim(View list of available commands)',
          '  green(serve)                      dim(Start the AdonisJS HTTP server)',
        ].join('\n'),
        stream: 'stdout',
      },
      {
        message: '',
        stream: 'stdout',
      },
      {
        message: 'yellow(make)',
        stream: 'stdout',
      },
      {
        message: '  green(make:controller) dim((mc))  dim(Make a new HTTP controller)',
        stream: 'stdout',
      },
    ])
  })
})