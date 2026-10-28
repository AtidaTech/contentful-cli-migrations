import { packResult } from './npm-json.js'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'))
const release = process.argv.includes('--release')
assert.equal(lock.version, manifest.version, 'Lockfile package version differs')
assert.deepEqual(
  lock.packages[''].dependencies,
  manifest.dependencies,
  'Run npm install to synchronize dependencies'
)
assert.deepEqual(
  lock.packages[''].devDependencies,
  manifest.devDependencies,
  'Run npm install to synchronize development dependencies'
)
for (const [path, pkg] of Object.entries(lock.packages)) {
  if (path.endsWith('/follow-redirects')) {
    const [major, minor, patch] = pkg.version.split('.').map(Number)
    assert.ok(
      major > 1 ||
        (major === 1 && (minor > 16 || (minor === 16 && patch >= 2))),
      `Vulnerable follow-redirects at ${path}`
    )
  }
  if (release)
    assert.ok(
      !pkg.link && !/^(?:file:|link:)/.test(pkg.resolved ?? ''),
      `Release lockfile contains a local dependency: ${path}; refresh after helpers is published`
    )
}
if (release) {
  assert.equal(
    process.versions.node.split('.')[0],
    '24',
    'Validate releases with Node 24'
  )
  const compare = (a, b) => {
    const av = a.split('.').map(Number)
    const bv = b.split('.').map(Number)
    for (let i = 0; i < 3; i++) {
      if (av[i] !== bv[i]) return av[i] > bv[i]
    }
    return true
  }
  assert.ok(
    compare(process.versions.node, '24.22.1'),
    'Node >=24.22.1 is required'
  )
  const npmVersion = spawnSync('npm', ['--version'], { encoding: 'utf8' })
  assert.equal(npmVersion.status, 0)
  assert.ok(
    compare(npmVersion.stdout.trim(), '12.2.1'),
    'npm >=12.2.1 is required'
  )
}
const pack = spawnSync(
  'npm',
  ['pack', '--dry-run', '--json', '--ignore-scripts'],
  { encoding: 'utf8' }
)
assert.equal(pack.status, 0, pack.stderr)
const files = packResult(JSON.parse(pack.stdout)).files
for (const { path } of files) {
  assert.ok(
    !/(^|\/)(\.env(?:\..*)?|node_modules|test|scripts|\.github|\.devcontainer|personal|export)(\/|$)/.test(
      path
    ),
    `Unexpected package file: ${path}`
  )
}
for (const bin of Object.values(manifest.bin ?? {})) {
  assert.ok(
    files.some(file => file.path === bin.replace(/^\.\//, '')),
    `Missing binary ${bin}`
  )
  assert.ok(statSync(bin).mode & 0o111, `Binary must be executable: ${bin}`)
  assert.match(readFileSync(bin, 'utf8'), /^#!\s*\/usr\/bin\/env node/)
}
assert.ok(files.some(file => file.path === 'README.md'))
console.log(
  `${manifest.name}@${manifest.version}: lockfile and ${files.length} package files checked${release ? ' for release' : ''}`
)
