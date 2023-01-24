/*
 * @adonisjs/ace
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import string from '@poppinss/utils/string'
import lodash from '@poppinss/utils/lodash'
import type { Prompt } from '@poppinss/prompts'
import { defineStaticProperty, InvalidArgumentsException } from '@poppinss/utils'

import * as errors from '../errors.js'
import type { Kernel } from '../kernel.js'
import type {
  Flag,
  Argument,
  ParsedOutput,
  UIPrimitives,
  CommandOptions,
  CommandMetaData,
  FlagsParserOptions,
  ArgumentsParserOptions,
} from '../types.js'
import debug from '../debug.js'

/**
 * The base command sets the foundation for defining ace commands.
 * Every command should inherit from the base command.
 */
export class BaseCommand {
  static booted: boolean = false

  /**
   * Configuration options accepted by the command
   */
  static options: CommandOptions

  /**
   * A collection of aliases for the command
   */
  static aliases: string[]

  /**
   * The command name one can type to run the command
   */
  static commandName: string

  /**
   * The command description
   */
  static description: string

  /**
   * The help text for the command. Help text can be a multiline
   * string explaining the usage of command
   */
  static help?: string | string[]

  /**
   * Registered arguments
   */
  static args: Argument[]

  /**
   * Registered flags
   */
  static flags: Flag[]

  /**
   * Define static properties on the class. During inheritance, certain
   * properties must inherit from the parent.
   */
  static boot() {
    if (Object.hasOwn(this, 'booted') && this.booted === true) {
      return
    }

    this.booted = true
    defineStaticProperty(this, 'args', { initialValue: [], strategy: 'inherit' })
    defineStaticProperty(this, 'flags', { initialValue: [], strategy: 'inherit' })
    defineStaticProperty(this, 'aliases', { initialValue: [], strategy: 'define' })
    defineStaticProperty(this, 'commandName', { initialValue: '', strategy: 'define' })
    defineStaticProperty(this, 'description', { initialValue: '', strategy: 'define' })
    defineStaticProperty(this, 'help', { initialValue: '', strategy: 'define' })
    defineStaticProperty(this, 'options', {
      initialValue: { staysAlive: false, allowUnknownFlags: false },
      strategy: 'inherit',
    })
  }

  /**
   * Specify the argument the command accepts. The arguments via the CLI
   * will be accepted in the same order as they are defined.
   *
   * Mostly, you will be using the `@args` decorator to define the arguments.
   *
   * ```ts
   * Command.defineArgument('entity', { type: 'string' })
   * ```
   */
  static defineArgument(name: string, options: Partial<Argument> & { type: 'string' | 'spread' }) {
    this.boot()
    const arg = { name, argumentName: string.dashCase(name), required: true, ...options }
    const lastArg = this.args[this.args.length - 1]

    /**
     * Ensure the arg type is specified
     */
    if (!arg.type) {
      throw new InvalidArgumentsException(
        `Cannot define argument "${this.name}.${name}". Specify the argument type`
      )
    }

    /**
     * Ensure we are not adding arguments after a spread argument
     */
    if (lastArg && lastArg.type === 'spread') {
      throw new InvalidArgumentsException(
        `Cannot define argument "${this.name}.${name}" after spread argument "${this.name}.${lastArg.name}". Spread argument should be the last one`
      )
    }

    /**
     * Ensure we are not adding a required argument after an optional
     * argument
     */
    if (arg.required && lastArg && lastArg.required === false) {
      throw new InvalidArgumentsException(
        `Cannot define required argument "${this.name}.${name}" after optional argument "${this.name}.${lastArg.name}"`
      )
    }

    if (debug.enabled) {
      debug('defining arg %O, command: %O', arg, `[class: ${this.name}]`)
    }

    this.args.push(arg)
  }

  /**
   * Specify a flag the command accepts.
   *
   * Mostly, you will be using the `@flags` decorator to define a flag.
   *
   * ```ts
   * Command.defineFlag('connection', { type: 'string', required: true })
   * ```
   */
  static defineFlag(
    name: string,
    options: Partial<Flag> & { type: 'string' | 'boolean' | 'array' | 'number' }
  ) {
    this.boot()
    const flag = { name, flagName: string.dashCase(name), required: false, ...options }

    /**
     * Ensure the arg type is specified
     */
    if (!flag.type) {
      throw new InvalidArgumentsException(
        `Cannot define flag "${this.name}.${name}". Specify the flag type`
      )
    }

    if (debug.enabled) {
      debug('defining flag %O, command: %O', flag, `[class: ${this.name}]`)
    }

    this.flags.push(flag)
  }

  /**
   * Returns the options for parsing flags and arguments
   */
  static getParserOptions(options?: FlagsParserOptions): {
    flagsParserOptions: Required<FlagsParserOptions>
    argumentsParserOptions: ArgumentsParserOptions[]
  } {
    this.boot()

    const argumentsParserOptions: ArgumentsParserOptions[] = this.args.map((arg) => {
      return {
        type: arg.type,
        default: arg.default,
        parse: arg.parse,
      }
    })

    const flagsParserOptions: Required<FlagsParserOptions> = lodash.merge(
      {
        all: [],
        string: [],
        boolean: [],
        array: [],
        number: [],
        alias: {},
        count: [],
        coerce: {},
        default: {},
      },
      options
    )

    this.flags.forEach((flag) => {
      flagsParserOptions.all.push(flag.flagName)

      if (flag.alias) {
        flagsParserOptions.alias[flag.flagName] = flag.alias
      }
      if (flag.parse) {
        flagsParserOptions.coerce[flag.flagName] = flag.parse
      }
      if (flag.default !== undefined) {
        flagsParserOptions.default[flag.flagName] = flag.default
      }

      switch (flag.type) {
        case 'string':
          flagsParserOptions.string.push(flag.flagName)
          break
        case 'boolean':
          flagsParserOptions.boolean.push(flag.flagName)
          break
        case 'number':
          flagsParserOptions.number.push(flag.flagName)
          break
        case 'array':
          flagsParserOptions.array.push(flag.flagName)
          break
      }
    })

    return {
      flagsParserOptions,
      argumentsParserOptions,
    }
  }

  /**
   * Serializes the command to JSON. The return value satisfies the
   * {@link CommandMetaData}
   */
  static serialize(): CommandMetaData {
    this.boot()
    if (!this.commandName) {
      throw new errors.E_MISSING_COMMAND_NAME([this.name])
    }

    const [namespace, name] = this.commandName.split(':')

    return {
      commandName: this.commandName,
      description: this.description,
      help: this.help,
      namespace: name ? namespace : null,
      aliases: this.aliases,
      flags: this.flags.map((flag) => {
        const { parse, ...rest } = flag
        return rest
      }),
      args: this.args.map((arg) => {
        const { parse, ...rest } = arg
        return rest
      }),
      options: this.options,
    }
  }

  /**
   * Validate the yargs parsed output againts the command.
   */
  static validate(parsedOutput: ParsedOutput) {
    this.boot()

    /**
     * Validates args and their values
     */
    this.args.forEach((arg, index) => {
      const value = parsedOutput.args[index] as string
      const hasDefinedArgument = value !== undefined

      if (arg.required && !hasDefinedArgument) {
        throw new errors.E_MISSING_ARG([arg.name])
      }

      if (hasDefinedArgument && !arg.allowEmptyValue && (value === '' || !value.length)) {
        if (debug.enabled) {
          debug('disallowing empty value "%s" for arg: "%s"', value, arg.name)
        }

        throw new errors.E_MISSING_ARG_VALUE([arg.name])
      }
    })

    /**
     * Disallow unknown flags
     */
    if (!this.options.allowUnknownFlags && parsedOutput.unknownFlags.length) {
      const unknowFlag = parsedOutput.unknownFlags[0]
      const unknowFlagName = unknowFlag.length === 1 ? `-${unknowFlag}` : `--${unknowFlag}`
      throw new errors.E_UNKNOWN_FLAG([unknowFlagName])
    }

    /**
     * Validate flags
     */
    this.flags.forEach((flag) => {
      const hasMentionedFlag = Object.hasOwn(parsedOutput.flags, flag.flagName)
      const value = parsedOutput.flags[flag.flagName]

      /**
       * Validate the value by flag type
       */
      switch (flag.type) {
        case 'boolean':
          /**
           * If flag is required, then it should be mentioned
           */
          if (flag.required && !hasMentionedFlag) {
            throw new errors.E_MISSING_FLAG([flag.flagName])
          }
          break
        case 'number':
          /**
           * If flag is required, then it should be mentioned
           */
          if (flag.required && !hasMentionedFlag) {
            throw new errors.E_MISSING_FLAG([flag.flagName])
          }

          /**
           * Regardless of whether flag is required or not. If it is mentioned,
           * then some value should be provided.
           *
           * In case of number input, yargs sends undefined
           */
          if (hasMentionedFlag && value === undefined) {
            throw new errors.E_MISSING_FLAG_VALUE([flag.flagName])
          }

          if (Number.isNaN(value)) {
            throw new errors.E_INVALID_FLAG([flag.flagName, 'numeric'])
          }
          break
        case 'string':
        case 'array':
          /**
           * If flag is required, then it should be mentioned
           */
          if (flag.required && !hasMentionedFlag) {
            throw new errors.E_MISSING_FLAG([flag.flagName])
          }

          /**
           * Regardless of whether flag is required or not. If it is mentioned,
           * then some value should be provided, unless empty values are
           * allowed.
           *
           * In case of string, flag with no value receives an empty string
           * In case of array, flag with no value receives an empty array
           */
          if (hasMentionedFlag && !flag.allowEmptyValue && (value === '' || !value.length)) {
            if (debug.enabled) {
              debug('disallowing empty value "%s" for flag: "%s"', value, flag.name)
            }

            throw new errors.E_MISSING_FLAG_VALUE([flag.flagName])
          }
      }
    })
  }

  /**
   * Create the command instance by validating the parsed input. It is
   * recommended to use this method over create a new instance
   * directly.
   */
  static create<T extends typeof BaseCommand>(
    this: T,
    kernel: Kernel,
    parsed: ParsedOutput,
    ui: UIPrimitives,
    prompt: Prompt
  ): InstanceType<T> {
    this.validate(parsed)

    /**
     * Type casting is needed because of this issue
     * https://github.com/microsoft/TypeScript/issues/5863
     */
    return new this(kernel, parsed, ui, prompt) as InstanceType<T>
  }

  /**
   * The exit code for the command
   */
  exitCode?: number

  /**
   * The error raised at the time of the executing the command.
   * The value is undefined if no error is raised.
   */
  error?: any

  /**
   * The result property stores the return value of the "run"
   * method (unless commands sets it explicitly)
   */
  result?: any

  /**
   * Logger to log messages
   */
  get logger() {
    return this.ui.logger
  }

  /**
   * Add colors to console messages
   */
  get colors() {
    return this.ui.colors
  }

  constructor(
    protected kernel: Kernel,
    protected parsed: ParsedOutput,
    public ui: UIPrimitives,
    public prompt: Prompt
  ) {
    this.#consumeParsedOutput()
  }

  /**
   * Consume the parsed output and set property values on the command
   */
  #consumeParsedOutput() {
    const CommandConstructor = this.constructor as typeof BaseCommand

    /**
     * Set args as properties on the command instance
     */
    CommandConstructor.args.forEach((arg, index) => {
      Object.defineProperty(this, arg.name, {
        value: this.parsed.args[index],
        enumerable: true,
        writable: true,
        configurable: true,
      })
    })

    /**
     * Set flags as properties on the command instance
     */
    CommandConstructor.flags.forEach((flag) => {
      Object.defineProperty(this, flag.name, {
        value: this.parsed.flags[flag.flagName],
        enumerable: true,
        writable: true,
        configurable: true,
      })
    })
  }

  /**
   * The prepare template method is used to prepare the
   * state for the command. This is the first method
   * executed on a given command instance.
   */
  async prepare() {}

  /**
   * The interact template method is used to display the prompts
   * to the user. The method is called after the prepare
   * method.
   */
  async interact() {}

  /**
   * The run method should include the implementation for the
   * command.
   */
  async run(): Promise<any> {}

  /**
   * The completed method is the method invoked after the command
   * finishes or results in an error.
   *
   * You can access the command error using the `this.error` property.
   * Returning `true` from completed method supresses the error
   * reporting to the kernel layer.
   */
  async completed(): Promise<any> {}

  /**
   * Executes the commands by running the command template methods.
   * The following methods are executed in order they are mentioned.
   *
   * - prepare
   * - interact
   * - run
   * - completed (runs regardless of error)
   */
  async exec() {
    try {
      await this.prepare()
      await this.interact()
      this.result = await this.run()
      this.exitCode = this.exitCode ?? 0
    } catch (error) {
      this.error = error
      this.exitCode = this.exitCode ?? 1
    }

    const errorHandled = await this.completed()

    /**
     * Print the error if the completed method has not
     * handled it already
     */
    if (!errorHandled && this.error) {
      this.logger.fatal(this.error)
    }

    return this.result
  }

  /**
   * Invokes the terminate method on the kernel
   */
  async terminate() {
    this.kernel.terminate(this)
  }
}
