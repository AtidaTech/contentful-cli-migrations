#! /usr/bin/env node

const PLACEHOLDER_MANAGEMENT_TOKEN = 'placeholder-management-token'
const PLACEHOLDER_SPACE_ID = 'placeholder-space-id'
const DEFAULT_MIGRATIONS_DIR = 'migrations/scripts/'
const DEFAULT_LOCALE = 'en-US'
const DEFAULT_FIRST_MIGRATION = '0001-create-counter-content-type.cjs'

;(async function main() {
  try {
    const localeWorkingDir = process.cwd()
    const scriptDirectory = await getDirNamePath()

    const envValues = await getEnvValues(localeWorkingDir, scriptDirectory)
    const parsedArguments = await parseArguments(localeWorkingDir, envValues)
    const environmentSingleton = await getEnvironment(parsedArguments)
    console.log(
      '##/INFO: Applying migrations to environment-id: ' +
        environmentSingleton?.sys?.id
    )

    let migrationArray = []
    let latestMigrationNumber = 0

    if (parsedArguments?.shouldInitialise) {
      await createFirstMigration(parsedArguments)
      migrationArray = [DEFAULT_FIRST_MIGRATION]
      console.log(
        '##/INFO: This is the fist run of the script. We will create the Counter content-type.'
      )
    } else {
      latestMigrationNumber = await getCounter(
        environmentSingleton,
        parsedArguments
      )

      console.log(
        '##/INFO: Latest migration successfully run # ' + latestMigrationNumber
      )

      migrationArray = await parseMigrationsToRun(
        parsedArguments,
        latestMigrationNumber
      )
    }

    await performMigrations(
      environmentSingleton,
      parsedArguments,
      latestMigrationNumber,
      migrationArray
    )

    if (parsedArguments?.shouldInitialise) {
      await createCounterEntry(environmentSingleton)
    }
  } catch (error) {
    console.error('@@/ERROR:', error)
  }
})()

/**
 * Reads environment values from .env files.
 *
 * @param {string} localWorkingDir - The directory path where the .env files are located.
 * @param {string} scriptDirectory - The directory path where the library is installed
 * @return {Promise<object>} The environment values.
 * @property {string} CMS_MANAGEMENT_TOKEN - The CMA token for Contentful.
 * @property {string} CMS_SPACE_ID - The Space ID.
 * @property {string} CMS_MIGRATIONS_DIR - The folder where the migration scripts are.
 * @property {string} CMS_MIGRATIONS_COUNTER_ID - The entry-id used for the counter
 * @property {string} CMS_MIGRATIONS_COUNTER_FIELD - The field in that entry that will store the actual counter
 * @property {string} CMS_MIGRATIONS_COUNTER_LOCALE - The locale to look for in that field
 *
 */
async function getEnvValues(localWorkingDir, scriptDirectory) {
  const fileSystem = await import('fs')
  const { config } = await import('dotenv')

  const envDataFromPath = path =>
    fileSystem.existsSync(path) ? config({ path }).parsed : {}

  const paths = [
    `${scriptDirectory}/../../.env`,
    `${scriptDirectory}/../../.env.local`,
    `${localWorkingDir}/.env`,
    `${localWorkingDir}/.env.local`
  ]

  const envValues = paths.map(envDataFromPath)

  return Object.assign({}, ...envValues)
}

/**
 * Parses command line arguments and sets default values.
 *
 * @param {string} rootFolder - The directory path where the .env files are located.
 * @param {Object} envValues - The .env values loaded.
 * @property {string} CMS_MANAGEMENT_TOKEN - The CMA token for Contentful.
 * @property {string} CMS_SPACE_ID - The Space ID.
 * @property {string} CMS_MIGRATIONS_DIR - The folder where the migration scripts are.
 * @property {string} CMS_MIGRATIONS_COUNTER_ID - The entry-id used for the counter
 * @property {string} CMS_MIGRATIONS_COUNTER_FIELD - The field in that entry that will store the actual counter
 * @property {string} CMS_MIGRATIONS_COUNTER_LOCALE - The locale to look for in that field
 * @returns {Promise<object>} The initial settings.
 * @property {string} managementToken - The CMS Management Token.
 * @property {string} spaceId - The CMS Space ID.
 * @property {string} environmentId - The CMS Environment ID.
 * @property {string} rootDestinationFolder - The folder containing the migrations
 * @property {string} counterEntryId - The entry ID storing the counter.
 * @property {string} counterFieldId - The field ID to retrieve the latest ran migration.
 * @property {string} counterLocale - The locale of the field to look for.
 * @property {boolean} forceYes - If should run all the migrations.
 * @property {boolean} shouldInitialise - If it should create the content-type and entry for the Counter.
 *
 * @throws {Error} If '--environment-id' or '--to' are not provided or if '--management-token' or '--mt' are duplicated.
 */
async function parseArguments(rootFolder, envValues) {
  const minimist = (await import('minimist')).default

  const parsedArgs = minimist(process.argv.slice(2))
  await checkArgs(parsedArgs)

  const {
    'space-id': spaceId = envValues?.CMS_SPACE_ID ?? PLACEHOLDER_SPACE_ID,
    'management-token': managementToken = parsedArgs['mt'] ??
      envValues?.CMS_MANAGEMENT_TOKEN ??
      PLACEHOLDER_MANAGEMENT_TOKEN,
    'counter-id': counterEntryId = envValues?.CMS_MIGRATIONS_COUNTER_ID,
    'counter-field': counterFieldId = envValues?.CMS_MIGRATIONS_COUNTER_FIELD,
    'counter-locale':
      counterLocale = envValues?.CMS_MIGRATIONS_COUNTER_LOCALE ??
        DEFAULT_LOCALE,
    'migrations-dir': migrationsDir = envValues?.CMS_MIGRATIONS_DIR ??
      DEFAULT_MIGRATIONS_DIR
  } = parsedArgs

  const rootDestinationFolder = await getDestinationFolder(
    rootFolder,
    migrationsDir,
    parsedArgs
  )

  const environmentId = parsedArgs.to || parsedArgs['environment-id']
  if (!environmentId) {
    console.error('@@/ERROR: An environment-id should be specified')
    process.exit(1)
  }

  return {
    managementToken,
    spaceId,
    environmentId,
    rootDestinationFolder,
    counterEntryId,
    counterFieldId,
    counterLocale,
    forceYes: parsedArgs.hasOwnProperty('force-yes'),
    shouldInitialise: parsedArgs.hasOwnProperty('initialise')
  }
}

/**
 * This function checks the arguments passed in the command line.
 *
 * @param {Object} parsedArgs - The object that contains the parsed command line arguments.
 * @property {string} managementToken - The CMS Management Token.
 * @property {string} spaceId - The CMS Space ID.
 * @property {string} environmentId - The CMS Environment ID.
 * @property {string} rootDestinationFolder - The folder containing the migrations
 * @property {string} counterEntryId - The entry ID storing the counter.
 * @property {string} counterFieldId - The field ID to retrieve the latest ran migration.
 * @property {string} counterLocale - The locale of the field to look for.
 * @property {boolean} forceYes - If should run all the migrations.
 * @property {boolean} shouldInitialise - If it should create the content-type and entry for the Counter.
 * @returns {Promise<object>} An object containing the evaluated command line arguments.
 *
 * @throws {Error} If both 'to' and 'environment-id' options are specified or if neither is specified.
 * @throws {Error} If both 'management-token' and 'mt' options are specified.
 */
async function checkArgs(parsedArgs) {
  if (!(Boolean(parsedArgs.to) ^ Boolean(parsedArgs['environment-id']))) {
    console.error(
      "@@/ERROR: Only one of the two options '--environment-id' or '--to' should be specified"
    )
    process.exit(1)
  }

  if (Boolean(parsedArgs['management-token']) && Boolean(parsedArgs.mt)) {
    console.error(
      "@@/ERROR: Only one of the two options '--management-token' or '--mt' can be specified"
    )
    process.exit(1)
  }
}

/**
 * This function gets the destination folder based on whether a custom folder is provided or not.
 *
 * @param {string} rootFolder - The directory path where the script is being executed.
 * @param {string} cmsMigrationsDir - The CMS Default Migrations Directory.
 * @param {Object} parsedArgs - The object that contains the parsed command line arguments.
 * @property {string} managementToken - The CMS Management Token.
 * @property {string} spaceId - The CMS Space ID.
 * @property {string} environmentId - The CMS Environment ID.
 * @property {string} rootDestinationFolder - The folder containing the migrations
 * @property {string} counterEntryId - The entry ID storing the counter.
 * @property {string} counterFieldId - The field ID to retrieve the latest ran migration.
 * @property {string} counterLocale - The locale of the field to look for.
 * @property {boolean} forceYes - If should run all the migrations.
 * @property {boolean} shouldInitialise - If it should create the content-type and entry for the Counter.
 *
 * @returns {Promise<string>} The path of the evaluated destination folder.
 * @property {string} destinationFolder - The destination folder for the export.
 *
 * @throws {Error} If the destination folder does not exist or is not accessible.
 */
async function getDestinationFolder(rootFolder, cmsMigrationsDir, parsedArgs) {
  const fileSystem = await import('fs')
  const path = await import('path')

  const defaultExportDirectory = path.join(rootFolder, cmsMigrationsDir)

  let destinationFolder =
    path.resolve(parsedArgs['migrations-dir'] || defaultExportDirectory) + '/'

  // Create destination folder if not present
  if (!fileSystem.existsSync(destinationFolder)) {
    fileSystem.mkdirSync(destinationFolder, { recursive: true })
  }

  if (
    !fileSystem.existsSync(destinationFolder) ||
    destinationFolder === path.sep
  ) {
    console.error(
      '@@/ERROR: Destination folder does not exist or is not accessible!'
    )
    process.exit(1)
  }

  return destinationFolder
}

/**
 * Gets the current directory's path.
 *
 * @return {Promise<string>} The path of the current directory.
 */
async function getDirNamePath() {
  const { fileURLToPath } = await import('url')
  const { dirname } = await import('path')

  const __filename = fileURLToPath(import.meta.url)
  return dirname(__filename)
}

/**
 *
 * @param {Object} parsedArguments
 * @property {string} managementToken - The CMS Management Token.
 * @property {string} spaceId - The CMS Space ID.
 * @property {string} environmentId - The CMS Environment ID.
 * @property {string} rootDestinationFolder - The folder containing the migrations
 * @property {string} counterEntryId - The entry ID storing the counter.
 * @property {string} counterFieldId - The field ID to retrieve the latest ran migration.
 * @property {string} counterLocale - The locale of the field to look for.
 * @property {boolean} forceYes - If should run all the migrations.
 * @property {boolean} shouldInitialise - If it should create the content-type and entry for the Counter.
 * @return {Promise<void>}
 */
async function createFirstMigration(parsedArguments) {
  const fileSystem = await import('fs')
  const firstMigrationName =
    parsedArguments?.rootDestinationFolder + DEFAULT_FIRST_MIGRATION

  const data =
    'module.exports = async function (migration, context) {\n' +
    "    const keyValueStore = migration.createContentType('keyValue', {\n" +
    "        name: 'Key-Value',\n" +
    "        displayField: 'key'\n" +
    '    })\n' +
    '\n' +
    '    keyValueStore\n' +
    "        .createField('key')\n" +
    "        .name('key')\n" +
    "        .type('Symbol')\n" +
    '        .localized(false)\n' +
    '        .required(true)\n' +
    '        .validations([\n' +
    '            {\n' +
    '                "unique": true\n' +
    '            }\n' +
    '        ])\n' +
    '        .disabled(false)\n' +
    '        .omitted(false)\n' +
    '\n' +
    '    keyValueStore\n' +
    "        .createField('value')\n" +
    "        .name('value')\n" +
    "        .type('Symbol')\n" +
    '        .localized(true)\n' +
    '        .required(false)\n' +
    '        .validations([])\n' +
    '        .disabled(false)\n' +
    '        .omitted(false)\n' +
    '}'

  fileSystem.writeFileSync(firstMigrationName, data)
}

/**
 *
 * @param {import("contentful-management/dist/typings/entities/environment").Environment} environmentSingleton - The Contentful environment object.
 * @return {Promise<void>}
 */
async function createCounterEntry(environmentSingleton) {
  try {
    const lib = await import('contentful-lib-helpers')

    const defaultLocale = await lib.getDefaultLocale(environmentSingleton)
    const counterEntry = await environmentSingleton.createEntry('keyValue', {
      fields: {
        key: {
          [defaultLocale.code]: 'Counter-DO-NOT-DELETE'
        },
        value: {
          [defaultLocale.code]: '1'
        }
      }
    })

    console.log('##/INFO: We created the Counter entry for you.')
    console.log(
      '##/INFO: Please write these values in your .env/.env.local file.'
    )
    console.log('CMS_MIGRATIONS_COUNTER_ID=' + counterEntry?.sys?.id)
    console.log('CMS_MIGRATIONS_COUNTER_FIELD=value')
    console.log('CMS_MIGRATIONS_COUNTER_LOCALE=' + defaultLocale.code)
  } catch (error) {
    console.error('@@/ERROR:', error)
    process.exit(1)
  }
}

/**
 * Check if the destination environment exists before running the migration(s)
 *
 * @param {Object} parsedArguments
 * @property {string} managementToken - The CMS Management Token.
 * @property {string} spaceId - The CMS Space ID.
 * @property {string} environmentId - The CMS Environment ID.
 * @returns {Promise<import("contentful-management/dist/typings/entities/environment").Environment|null>} - A Promise that resolves with the environment object, or `null` if not found.
 */
async function getEnvironment(parsedArguments) {
  const contentfulManagement = (await import('contentful-management')).default
  const lib = await import('contentful-lib-helpers')

  const environmentSingleton = await lib.getEnvironment(
    contentfulManagement,
    parsedArguments?.managementToken,
    parsedArguments?.spaceId,
    parsedArguments?.environmentId,
    0
  )

  if (!environmentSingleton) {
    console.error(
      `Unable to retrieve Destination environment-id '${parsedArguments?.environmentId}' for space-id '${parsedArguments?.spaceId}'!`
    )
    console.error(
      `Could also be that the management token or space-id are invalid.`
    )
    process.exit(1)
  }

  return environmentSingleton
}

/**
 * Get the value of the latest successful migration from the Counter Entry
 *
 * @param {import("contentful-management/dist/typings/entities/environment").Environment} environmentSingleton - The Contentful environment object.
 * @param {Object} parsedArguments - The script arguments, containing the counter entry-id information
 * @property {string} managementToken - The CMS Management Token.
 * @property {string} spaceId - The CMS Space ID.
 * @property {string} environmentId - The CMS Environment ID.
 * @property {string} rootDestinationFolder - The folder containing the migrations
 * @property {string} counterEntryId - The entry ID storing the counter.
 * @property {string} counterFieldId - The field ID to retrieve the latest ran migration.
 * @property {string} counterLocale - The locale of the field to look for.
 * @property {boolean} forceYes - If should run all the migrations.
 * @property {boolean} shouldInitialise - If it should create the content-type and entry for the Counter.
 * @return {Promise<number>}
 */
async function getCounter(environmentSingleton, parsedArguments) {
  try {
    const fieldId = parsedArguments?.counterFieldId
    const fieldLocale = parsedArguments?.counterLocale
    const counterEntry = await environmentSingleton.getEntry(
      parsedArguments?.counterEntryId
    )

    if (!counterEntry?.fields?.[fieldId]) {
      throw new Error(
        'Impossible to retrieve the Counter entry! Please check entry-id, field-id and locale in your configuration'
      )
    }

    if (counterEntry.fields[fieldId][fieldLocale] === undefined) {
      counterEntry.fields[fieldId][fieldLocale] = '0'
      try {
        await counterEntry.update()
        console.log('##/INFO: Counter entry is being initialised...')
      } catch (e) {
        throw new Error(
          'Counter entry is invalid! Please check entry-id, field-id and locale in your configuration'
        )
      }
    }

    return parseInt(counterEntry.fields[fieldId]?.[fieldLocale], 10) || 0
  } catch (error) {
    console.error('@@/ERROR:', error)
    process.exit(1)
  }
}

/**
 * Parses the migrations to run based on the latest migration number.
 *
 * @param {Object} parsedArguments - The script arguments.
 * @property {string} managementToken - The CMS Management Token.
 * @property {string} spaceId - The CMS Space ID.
 * @property {string} environmentId - The CMS Environment ID.
 * @property {string} rootDestinationFolder - The folder containing the migrations
 * @property {string} counterEntryId - The entry ID storing the counter.
 * @property {string} counterFieldId - The field ID to retrieve the latest ran migration.
 * @property {string} counterLocale - The locale of the field to look for.
 * @property {boolean} forceYes - If should run all the migrations.
 * @property {boolean} shouldInitialise - If it should create the content-type and entry for the Counter.
 * @param {number} latestMigrationNumber - The latest migration number.
 * @returns {Promise<string[]>} An array of migrations to run.
 */
async function parseMigrationsToRun(parsedArguments, latestMigrationNumber) {
  const fileSystem = await import('fs')
  const folderMigrationScript = parsedArguments?.rootDestinationFolder

  let files = fileSystem.readdirSync(folderMigrationScript)
  let migrationArray = []
  let indexObject = []
  let arrayLength = files.length

  if (arrayLength === 0) {
    console.log('%%/DEBUG: The migration folder is empty')
    process.exit(1)
  }

  indexObject[0] = 'unused'
  for (let i = 0; i < arrayLength; i++) {
    const fileIndexValue = parseInt(files[i].split('-')[0])

    if (fileIndexValue === undefined || !Number.isInteger(fileIndexValue)) {
      console.error('@@/ERROR: There is an invalid migration:')
      console.error('@@/ERROR: ' + folderMigrationScript + files[i])
      process.exit(1)
    }

    if (indexObject[fileIndexValue]) {
      console.error('@@/ERROR: There are duplicated migrations!')
      console.error('@@/ERROR: ' + folderMigrationScript + files[i])
      process.exit(1)
    }

    indexObject[fileIndexValue] = files[i]
  }

  for (let i = 1; i < indexObject.length; i++) {
    if (i > latestMigrationNumber) {
      migrationArray.push(indexObject[i])
    }
  }

  return migrationArray
}

/**
 * Performs the Contentful migrations.
 *
 * @param {import("contentful-management/dist/typings/entities/environment").Environment} environmentSingleton - The Contentful environment object.
 * @param {Object} parsedArguments - The script arguments.
 * @property {string} spaceId - The CMS Space ID.
 * @property {string} environmentId - The CMS Environment ID.
 * @property {string} rootDestinationFolder - The folder containing the migrations
 * @property {string} counterEntryId - The entry ID storing the counter.
 * @property {string} counterFieldId - The field ID to retrieve the latest ran migration.
 * @property {string} counterLocale - The locale of the field to look for.
 * @property {boolean} forceYes - If should run all the migrations.
 * @property {boolean} shouldInitialise - If it should create the content-type and entry for the Counter.
 * @param {number} latestMigrationNumber - The latest migration number.
 * @param {string[]} migrationArray - An array of migrations to run.
 * @returns {Promise<void>}
 */
async function performMigrations(
  environmentSingleton,
  parsedArguments,
  latestMigrationNumber,
  migrationArray
) {
  const fileSystem = await import('fs')
  const path = await import('path')
  const customAsync = await import('async')
  const { runMigration } = await import('contentful-migration')

  const folderMigrationScript =
    parsedArguments?.rootDestinationFolder ?? DEFAULT_MIGRATIONS_DIR

  if (migrationArray.length === 0) {
    console.log(
      '##/INFO: Your environment is already up to date to the latest migration'
    )
    return
  }

  // Loop and run migrations
  await customAsync.eachSeries(
    migrationArray,
    function (migrationScript, callback) {
      let options = {
        spaceId: parsedArguments?.spaceId,
        environmentId: environmentSingleton?.sys?.id,
        accessToken: parsedArguments?.managementToken,
        yes: parsedArguments?.forceYes
      }

      process.stdin.on('keypress', function (ch, key) {
        if (key && key.name === 'n') {
          process.exit(1)
        }
      })

      if (
        fileSystem.readFileSync(folderMigrationScript + migrationScript)
          .length === 0
      ) {
        console.error('@@/ERROR: The following migration is empty')
        console.error('@@/ERROR: ' + folderMigrationScript + migrationScript)
        process.exit(1)
      }

      runMigration({
        ...options,
        ...{
          filePath: path.resolve(folderMigrationScript + migrationScript)
        }
      })
        .then(async () => {
          console.log('##/INFO: Migration ' + migrationScript + ' Done!')

          // Update counter value
          latestMigrationNumber++

          // Write new Count into Entry
          const fieldId = parsedArguments?.counterFieldId
          const fieldLocale = parsedArguments?.counterLocale
          const entrySavingCounter = await environmentSingleton.getEntry(
            parsedArguments?.counterEntryId
          )

          entrySavingCounter.fields[fieldId][
            fieldLocale
          ] = `${latestMigrationNumber}`

          entrySavingCounter
            .update()
            .then(callback())
            .catch(e => console.error('@@/ERROR: ' + e))
        })
        .catch(e =>
          console.error(
            '@@/ERROR ' +
              e +
              ' - while running the migration: ' +
              folderMigrationScript +
              migrationScript
          )
        )
    }
  )
}
