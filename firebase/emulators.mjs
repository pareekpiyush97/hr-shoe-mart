/**
 * Starts the emulator suite.
 *
 * Two things bite on Windows and are handled here rather than in a README
 * nobody reads:
 *
 *  - The Firestore emulator is a Java program. If `java` is missing from PATH
 *    the CLI fails with a bare "Could not spawn `java -version`", so the
 *    common JDK locations are added before giving up.
 *  - Before it can serve anything, the functions emulator runs the codebase in
 *    a child process and waits for it to report its exports. The default
 *    allowance is 10 seconds, which a cold machine misses — and when it does,
 *    the suite starts anyway with zero functions loaded, which looks like the
 *    code is broken rather than slow.
 */

import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { delimiter, join } from 'node:path'

/** Directories that hold a `java` executable, newest first. */
function javaDirs() {
  const roots = [
    'C:/Program Files/Microsoft',
    'C:/Program Files/Eclipse Adoptium',
    'C:/Program Files/Java',
    'C:/Program Files/Amazon Corretto',
  ]
  const found = []
  for (const root of roots) {
    if (!existsSync(root)) continue
    for (const name of readdirSync(root)) {
      const bin = join(root, name, 'bin')
      if (existsSync(join(bin, 'java.exe')) || existsSync(join(bin, 'java'))) found.push(bin)
    }
  }
  return found.sort().reverse()
}

const env = { ...process.env }
env.FUNCTIONS_DISCOVERY_TIMEOUT ??= '90'

if (process.platform === 'win32') {
  const dirs = javaDirs()
  if (dirs.length) env.PATH = [...dirs, env.PATH].join(delimiter)
}

const args = [
  'emulators:start',
  '--only',
  'auth,firestore,functions',
  '--project',
  'demo-hr-shoe-mart',
  ...process.argv.slice(2),
]

const cli = process.platform === 'win32' ? 'firebase.cmd' : 'firebase'
const child = spawn(cli, args, { stdio: 'inherit', env, shell: process.platform === 'win32' })
child.on('exit', (code) => process.exit(code ?? 0))
