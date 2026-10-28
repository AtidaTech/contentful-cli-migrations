import { readFileSync, appendFileSync } from 'node:fs'
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'))
const needed = Object.values(lock.packages).some(pkg =>
  pkg.resolved?.startsWith('file:')
)
appendFileSync(process.env.GITHUB_OUTPUT, `needed=${needed}\n`)
