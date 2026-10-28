import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

test('missing environment/action fails without making an authenticated request', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'contentful-cli-'))
  try {
    writeFileSync(
      join(cwd, '.env.local'),
      'CMS_MANAGEMENT_TOKEN=placeholder-management-token\nCMS_SPACE_ID=placeholder-space-id\n'
    )
    const result = spawnSync(
      process.execPath,
      [resolve('contentful-cli-migrations.js')],
      {
        cwd,
        env: { PATH: process.env.PATH, HOME: cwd },
        encoding: 'utf8',
        timeout: 10000
      }
    )
    assert.equal(result.error, undefined)
    assert.equal(result.status, 1)
    assert.match(result.stderr, /@@\/ERROR:/)
    assert.doesNotMatch(result.stderr, /ENOTFOUND|deprecated|Cannot find/)
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})
