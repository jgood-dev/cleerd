import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)

const skippedPaths = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
])

const secretPatterns = [
  {
    name: 'Supabase secret API key',
    pattern: /sb_secret_[A-Za-z0-9_-]{20,}/g,
  },
  {
    name: 'Supabase publishable API key placeholder misuse',
    pattern: /sb_publishable_[A-Za-z0-9_-]{20,}/g,
  },
  {
    name: 'Stripe secret key',
    pattern: /sk_(live|test)_[A-Za-z0-9]{20,}/g,
  },
  {
    name: 'Resend API key',
    pattern: /re_[A-Za-z0-9]{20,}/g,
  },
  {
    name: 'Anthropic API key',
    pattern: /sk-ant-[A-Za-z0-9_-]{20,}/g,
  },
]

const allowedExamples = [
  'sb_secret_...',
  'sb_publishable_...',
]

const findings = []

for (const filePath of trackedFiles) {
  if (skippedPaths.has(filePath)) {
    continue
  }

  let contents

  try {
    contents = readFileSync(filePath, 'utf8')
  } catch {
    continue
  }

  for (const { name, pattern } of secretPatterns) {
    pattern.lastIndex = 0

    for (const match of contents.matchAll(pattern)) {
      if (allowedExamples.includes(match[0])) {
        continue
      }

      const line = contents.slice(0, match.index).split('\n').length
      const prefix = match[0].slice(0, Math.min(12, match[0].length))

      findings.push({ filePath, line, name, prefix })
    }
  }
}

if (findings.length) {
  console.error('Potential committed secrets found. Remove them before committing.\n')

  for (const finding of findings) {
    console.error(
      `${finding.filePath}:${finding.line} ${finding.name} begins with ${finding.prefix}[REDACTED]`
    )
  }

  process.exit(1)
}

console.log('No obvious committed secrets found in tracked files.')
