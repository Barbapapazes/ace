/*
 * @adonisjs/ace
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import fs from 'fs-extra'
import { join } from 'node:path'
import { test } from '@japa/runner'
import { fileURLToPath } from 'node:url'

import { FsLoader } from '../../src/loaders/fs_loader.js'

const BASE_URL = new URL('./tmp/', import.meta.url)
const BASE_PATH = fileURLToPath(BASE_URL)

test.group('Loaders | fs', (group) => {
  group.each.setup(() => {
    return () => fs.remove(BASE_PATH)
  })

  test('raise error when commands directory does not exists', async ({ assert }) => {
    const loader = new FsLoader(join(BASE_PATH, './commands'))
    await assert.rejects(() => loader.getMetaData(), /ENOENT: no such file or directory/)
  })

  test('raise error when there is no default export in command file', async ({ assert }) => {
    await fs.outputFile(
      join(BASE_PATH, 'commands', 'make_controller_v_1.ts'),
      `
      export class MakeController {}
    `
    )

    const loader = new FsLoader(join(BASE_PATH, './commands'))
    await assert.rejects(
      () => loader.getMetaData(),
      'Missing "export default" in module "make_controller_v_1.js"'
    )
  })

  test('return commands metadata', async ({ assert }) => {
    await fs.outputFile(
      join(BASE_PATH, 'commands', 'make_controller_v_2.ts'),
      `
      export default class MakeController {
        static commandName = 'make:controller'
        static args = []
        static flags = []
        static aliases = []
        static options = {}
        static description = ''
        static namespace = 'make'

        static serialize() {
          return {
            commandName: this.commandName,
            description: this.description,
            namespace: this.namespace,
            args: this.args,
            flags: this.flags,
            options: this.options,
            aliases: this.aliases,
          }
        }
      }
    `
    )

    const loader = new FsLoader(join(BASE_PATH, './commands'))
    const commands = await loader.getMetaData()
    assert.deepEqual(commands, [
      {
        filePath: 'make_controller_v_2.js',
        commandName: 'make:controller',
        description: '',
        namespace: 'make',
        args: [],
        flags: [],
        options: {},
        aliases: [],
      },
    ])
  })

  test('load command from .js files', async ({ assert }) => {
    await fs.outputFile(
      join(BASE_PATH, 'commands', 'make_controller.js'),
      `
      export default class MakeController {
        static commandName = 'make:controller'
        static args = []
        static flags = []
        static aliases = []
        static options = {}
        static description = ''
        static namespace = 'make'

        static serialize() {
          return {
            commandName: this.commandName,
            description: this.description,
            namespace: this.namespace,
            args: this.args,
            flags: this.flags,
            options: this.options,
            aliases: this.aliases,
          }
        }
      }
    `
    )

    const loader = new FsLoader(join(BASE_PATH, './commands'))
    const commands = await loader.getMetaData()
    assert.deepEqual(commands, [
      {
        commandName: 'make:controller',
        filePath: 'make_controller.js',
        description: '',
        namespace: 'make',
        args: [],
        flags: [],
        options: {},
        aliases: [],
      },
    ])
  })

  test('ignore .json files', async ({ assert }) => {
    await fs.outputFile(
      join(BASE_PATH, 'commands', 'make_controller_v_3.ts'),
      `
      export default class MakeController {
        static commandName = 'make:controller'
        static args = []
        static flags = []
        static aliases = []
        static options = {}
        static description = ''
        static namespace = 'make'

        static serialize() {
          return {
            commandName: this.commandName,
            description: this.description,
            namespace: this.namespace,
            args: this.args,
            flags: this.flags,
            options: this.options,
            aliases: this.aliases,
          }
        }
      }
    `
    )

    await fs.outputFile(join(BASE_PATH, 'commands', 'foo.json'), `{}`)

    const loader = new FsLoader(join(BASE_PATH, './commands'))
    const commands = await loader.getMetaData()
    assert.deepEqual(commands, [
      {
        commandName: 'make:controller',
        filePath: 'make_controller_v_3.js',
        description: '',
        namespace: 'make',
        args: [],
        flags: [],
        options: {},
        aliases: [],
      },
    ])
  })

  test('get command constructor for a given command', async ({ assert }) => {
    await fs.outputFile(
      join(BASE_PATH, 'commands', 'make_controller_v_5.ts'),
      `
      export default class MakeController {
        static commandName = 'make:controller'
        static args = []
        static flags = []
        static aliases = []
        static options = {}
        static description = ''
        static namespace = 'make'

        static serialize() {
          return {
            commandName: this.commandName,
            description: this.description,
            namespace: this.namespace,
            args: this.args,
            flags: this.flags,
            options: this.options,
            aliases: this.aliases,
          }
        }
      }
    `
    )

    await fs.outputFile(join(BASE_PATH, 'commands', 'foo.json'), `{}`)

    const loader = new FsLoader(join(BASE_PATH, './commands'))
    const commands = await loader.getMetaData()
    const command = await loader.getCommand(commands[0])
    assert.isFunction(command)
  })

  test('return null when unable to lookup command', async ({ assert }) => {
    const loader = new FsLoader(join(BASE_PATH, './commands'))
    const command = await loader.getCommand({ commandName: 'make:model' } as any)
    assert.isNull(command)
  })

  test('load commands from nested directories', async ({ assert }) => {
    await fs.outputFile(
      join(BASE_PATH, 'commands', 'make', 'controller.ts'),
      `
      export default class MakeController {
        static commandName = 'make:controller'
        static args = []
        static flags = []
        static aliases = []
        static options = {}
        static description = ''
        static namespace = 'make'

        static serialize() {
          return {
            commandName: this.commandName,
            description: this.description,
            namespace: this.namespace,
            args: this.args,
            flags: this.flags,
            options: this.options,
            aliases: this.aliases,
          }
        }
      }
    `
    )

    const loader = new FsLoader(join(BASE_PATH, './commands'))
    const commands = await loader.getMetaData()
    assert.deepEqual(commands, [
      {
        commandName: 'make:controller',
        filePath: 'make/controller.js',
        description: '',
        namespace: 'make',
        args: [],
        flags: [],
        options: {},
        aliases: [],
      },
    ])
  })

  test('ignore commands by filename', async ({ assert }) => {
    await fs.outputFile(
      join(BASE_PATH, 'commands', 'make_controller_v_2.ts'),
      `
      export default class MakeController {
        static commandName = 'make:controller'
        static args = []
        static flags = []
        static aliases = []
        static options = {}
        static description = ''
        static namespace = 'make'

        static serialize() {
          return {
            commandName: this.commandName,
            description: this.description,
            namespace: this.namespace,
            args: this.args,
            flags: this.flags,
            options: this.options,
            aliases: this.aliases,
          }
        }
      }
    `
    )

    await fs.outputFile(
      join(BASE_PATH, 'commands', 'make', 'controller.ts'),
      `
      export default class MakeController {
        static commandName = 'make:controller'
        static args = []
        static flags = []
        static aliases = []
        static options = {}
        static description = ''
        static namespace = 'make'

        static serialize() {
          return {
            commandName: this.commandName,
            description: this.description,
            namespace: this.namespace,
            args: this.args,
            flags: this.flags,
            options: this.options,
            aliases: this.aliases,
          }
        }
      }
    `
    )

    const loader = new FsLoader(join(BASE_PATH, './commands'), ['make_controller_v_2.js'])
    const commands = await loader.getMetaData()
    assert.deepEqual(commands, [
      {
        commandName: 'make:controller',
        filePath: 'make/controller.js',
        description: '',
        namespace: 'make',
        args: [],
        flags: [],
        options: {},
        aliases: [],
      },
    ])
  })
})
