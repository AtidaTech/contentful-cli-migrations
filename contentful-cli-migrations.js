#! /usr/bin/env node

const PLACEHOLDER_MANAGEMENT_TOKEN = 'placeholder-management-token'
const PLACEHOLDER_SPACE_ID = 'placeholder-space-id'
const DEFAULT_MIGRATIONS_DIR = 'migrations/scripts/'
const DEFAULT_LOCALE = 'en-US'

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

    const latestMigrationNumber = await getCounter(
      environmentSingleton,
      parsedArguments
    )

    console.log(
      '##/INFO: Latest migration successfully run # ' + latestMigrationNumber
    )

    const migrationArray = await parseMigrationsToRun(
      parsedArguments,
      latestMigrationNumber
    )

    await performMigrations(
      environmentSingleton,
      parsedArguments,
      latestMigrationNumber,
      migrationArray
    )
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
 *
 * @throws {Error} If '--environment-id' or '--to' are not provided or if '--management-token' or '--mt' are duplicated.
 */
async function parseArguments(rootFolder, envValues) {
  const minimist = (await import('minimist')).default

  const parsedArgs = minimist(process.argv.slice(2))
  await checkArgs(parsedArgs)

  let environmentId = null
  const spaceId =
    parsedArgs['space-id'] ?? envValues?.CMS_SPACE_ID ?? PLACEHOLDER_SPACE_ID
  const managementToken =
    parsedArgs['management-token'] ??
    parsedArgs['mt'] ??
    envValues?.CMS_MANAGEMENT_TOKEN ??
    PLACEHOLDER_MANAGEMENT_TOKEN
  const counterEntryId =
    parsedArgs['counter-id'] ?? envValues?.CMS_MIGRATIONS_COUNTER_ID
  const counterFieldId =
    parsedArgs['counter-field'] ?? envValues?.CMS_MIGRATIONS_COUNTER_FIELD
  const counterLocale =
    parsedArgs['counter-locale'] ??
    envValues?.CMS_MIGRATIONS_COUNTER_LOCALE ??
    DEFAULT_LOCALE
  const migrationsDir = envValues?.CMS_MIGRATIONS_DIR ?? DEFAULT_MIGRATIONS_DIR

  const rootDestinationFolder = await getDestinationFolder(
    rootFolder,
    migrationsDir,
    parsedArgs
  )

  if (
    parsedArgs.hasOwnProperty('to') ||
    parsedArgs.hasOwnProperty('environment-id')
  ) {
    environmentId = parsedArgs.to ?? parsedArgs['environment-id']
  } else {
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
    forceYes: parsedArgs.hasOwnProperty('force-yes')
  }
}

/**
 * This function checks the arguments passed in the command line.
 *
 * @param {Object} parsedArgs - The object that contains the parsed command line arguments.
 * @returns {Promise<object>} An object containing the evaluated command line arguments.
 *
 * @throws {Error} If both 'to' and 'environment-id' options are specified or if neither is specified.
 * @throws {Error} If both 'management-token' and 'mt' options are specified.
 */
async function checkArgs(parsedArgs) {
  if (
    (parsedArgs.hasOwnProperty('to') &&
      parsedArgs.hasOwnProperty('environment-id')) ||
    !(
      parsedArgs.hasOwnProperty('to') ||
      parsedArgs.hasOwnProperty('environment-id')
    )
  ) {
    console.error(
      "@@/ERROR: Only one of the two options '--environment-id' or '--to' should be specified"
    )
    process.exit(1)
  }

  if (
    parsedArgs.hasOwnProperty('management-token') &&
    parsedArgs.hasOwnProperty('mt')
  ) {
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
 *
 * @returns {Promise<string>} The path of the evaluated destination folder.
 * @property {string} destinationFolder - The destination folder for the export.
 *
 * @throws {Error} If the destination folder does not exist or is not accessible.
 */
async function getDestinationFolder(rootFolder, cmsMigrationsDir, parsedArgs) {
  const fileSystem = await import('fs')

  const defaultExportDirectory = cmsMigrationsDir.startsWith('/')
    ? cmsMigrationsDir
    : `${rootFolder}/${cmsMigrationsDir}`

  let destinationFolder = parsedArgs['migrations-dir'] || defaultExportDirectory
  destinationFolder = destinationFolder.replace(/\/$/, '') + '/'

  // Create destination folder if not present
  const destinationFolderExists = fileSystem.existsSync(destinationFolder)
  if (!parsedArgs['migrations-dir'] && !destinationFolderExists) {
    fileSystem.mkdirSync(destinationFolder, { recursive: true })
  }

  if (!fileSystem.existsSync(destinationFolder) || destinationFolder === '/') {
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
      "@@/ERROR: Unable to retrieve Destination environment-id '" +
        parsedArguments?.environmentId +
        "' for space-id '" +
        parsedArguments?.spaceId +
        "'!"
    )
    console.error(
      '@@/ERROR: Could also be that the management token or space-id are invalid.'
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
 * @property {string} counterEntryId - The entry ID storing the counter.
 * @property {string} counterFieldId - The field ID to retrieve the latest ran migration.
 * @property {string} counterLocale - The locale of the field to look for.
 * @return {Promise<number>}
 */
async function getCounter(environmentSingleton, parsedArguments) {
  try {
    const fieldId = parsedArguments?.counterFieldId
    const fieldLocale = parsedArguments?.counterLocale
    const counterEntry = await environmentSingleton.getEntry(
      parsedArguments?.counterEntryId
    )

    const counterIndex = counterEntry?.fields?.[fieldId]?.[fieldLocale] ?? false
    return counterIndex ? parseInt(counterIndex, 10) : 0
  } catch (error) {
    console.error('@@/ERROR:', error)
  }

  console.error('@@/ERROR: Impossible to retrieve the Counter entry!')
  process.exit(1)
}

async function parseMigrationsToRun(parsedArguments, latestMigrationNumber) {
  // Compute the array of files to run migration
  const fileSystem = await import('fs')
  const folderMigrationScript = parsedArguments?.rootDestinationFolder

  let files = fileSystem.readdirSync(folderMigrationScript)
  let migrationArray = []
  let indexObject = []
  let arrayLength = files.length

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

async function performMigrations(
  environmentSingleton,
  parsedArguments,
  latestMigrationNumber,
  migrationArray
) {
  const fileSystem = await import('fs')
  const path = await import('path')
  const async = await import('async')
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
  async.eachSeries(migrationArray, function (migrationScript, callback) {
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
  })
}
