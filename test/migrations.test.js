import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runMigrations } from '../lib/run-migrations.js'

test('migrations and counter writes finish sequentially before resolving', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cf-migrations-'))
  try {
    for (const file of ['0001.cjs', '0002.cjs'])
      writeFileSync(join(dir, file), 'module.exports = () => {}')
    const events = [],
      counter = {
        fields: { count: { en: '0' } },
        async update() {
          await Promise.resolve()
          events.push(this.fields.count.en)
        }
      }
    await runMigrations(
      {
        sys: { id: 'env' },
        async getEntry() {
          return counter
        }
      },
      {
        rootDestinationFolder: dir,
        counterEntryId: 'counter',
        counterFieldId: 'count',
        counterLocale: 'en'
      },
      0,
      ['0001.cjs', '0002.cjs'],
      async options => {
        events.push(options.filePath.split('/').at(-1))
      }
    )
    assert.deepEqual(events, ['0001.cjs', '1', '0002.cjs', '2'])
    const failure = Error('migration rejected')
    await assert.rejects(
      runMigrations(
        { sys: { id: 'env' } },
        { rootDestinationFolder: dir },
        0,
        ['0001.cjs'],
        async () => {
          throw failure
        }
      ),
      error => error === failure
    )
    await assert.rejects(
      runMigrations(
        {
          sys: { id: 'env' },
          async getEntry() {
            return {
              fields: { count: { en: '0' } },
              async update() {
                throw Error('counter rejected')
              }
            }
          }
        },
        {
          rootDestinationFolder: dir,
          counterFieldId: 'count',
          counterLocale: 'en'
        },
        0,
        ['0001.cjs'],
        async () => {}
      ),
      /counter rejected/
    )
    let initialized = false
    await runMigrations(
      { sys: { id: 'env' } },
      { rootDestinationFolder: dir, shouldInitialise: true },
      0,
      ['0001.cjs'],
      async () => {},
      async () => {
        initialized = true
      }
    )
    assert.equal(initialized, true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
