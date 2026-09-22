// Publishes dist/ to the gh-pages branch, which is what GitHub Pages serves.
//
// Run `npm run deploy` (it builds first). Once the repo token has the
// `workflow` scope, move deploy/github-pages-workflow.yml into
// .github/workflows/ and Pages can build itself on every push instead.

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, rmSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const WORKTREE = '.pages'
const BRANCH = 'gh-pages'

const git = (...args) => execFileSync('git', args, { stdio: 'inherit' })
const gitQuiet = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()

if (!existsSync('dist/index.html')) {
  console.error('dist/ is empty — run `npm run build` first.')
  process.exit(1)
}

// A worktree keeps the source checkout untouched while we rewrite the branch.
if (existsSync(WORKTREE)) {
  try {
    git('worktree', 'remove', WORKTREE, '--force')
  } catch {
    rmSync(WORKTREE, { recursive: true, force: true })
  }
}
git('fetch', 'origin', BRANCH)
git('worktree', 'add', WORKTREE, BRANCH)

for (const entry of readdirSync(WORKTREE)) {
  if (entry !== '.git') rmSync(join(WORKTREE, entry), { recursive: true, force: true })
}
cpSync('dist', WORKTREE, { recursive: true })
writeFileSync(join(WORKTREE, '.nojekyll'), '')

const run = (...args) => execFileSync('git', ['-C', WORKTREE, ...args], { stdio: 'inherit' })
run('add', '-A')

const dirty = execFileSync('git', ['-C', WORKTREE, 'status', '--porcelain'], { encoding: 'utf8' })
if (!dirty.trim()) {
  console.log('Nothing changed since the last publish.')
} else {
  run('commit', '-m', `Publish build from ${gitQuiet('rev-parse', '--short', 'HEAD')}`)
  run('push', 'origin', BRANCH)
  console.log('\nPublished → https://pareekpiyush97.github.io/hr-shoe-mart/')
}

git('worktree', 'remove', WORKTREE, '--force')
