import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Run sequentially; reject on migration or counter errors so the CLI exits nonzero.
export async function runMigrations(
  environment,
  options,
  latest,
  files,
  runMigration,
  createCounterEntry
) {
  if (files.length === 0) {
    console.log(
      '##/INFO: Your environment is already up to date to the latest migration'
    )
    return
  }
  for (const file of files) {
    const filePath = resolve(options.rootDestinationFolder, file)
    if (readFileSync(filePath).length === 0)
      throw Error(`Empty migration: ${file}`)
    await runMigration({
      spaceId: options.spaceId,
      environmentId: environment.sys.id,
      accessToken: options.managementToken,
      yes: options.forceYes,
      filePath
    })
    if (options.shouldInitialise) {
      await createCounterEntry(environment)
    } else {
      const counter = await environment.getEntry(options.counterEntryId)
      counter.fields[options.counterFieldId][options.counterLocale] = String(
        ++latest
      )
      await counter.update()
    }
    console.log(`##/INFO: Migration ${file} Done!`)
  }
}
