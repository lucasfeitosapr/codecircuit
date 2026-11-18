import { readFileSync } from 'node:fs';
import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

/**
 * Known-bug guard (debt map M-005).
 *
 * A test marked test.fail() passes when it fails, so it would also "pass" if a helper broke
 * or an early step went wrong. This reporter checks that each expected failure happened on
 * the test's last assertion, the line that describes the bug. Anything else fails the run.
 *
 * "Assertion" means expect(...) or an expect* helper from ui.ts (expectSelectable). The failing
 * line is the test file's own frame in the error stack, so a helper's assertion counts as the
 * line in the test that called it.
 */
const TEST_CALL = /\btest\(\s*['"`]/;
const ASSERTION = /\bexpect\w*\(/;

function lastAssertionLine(file: string, startLine: number): number | null {
  const lines = readFileSync(file, 'utf-8').split(/\r?\n/);
  let last: number | null = null;
  for (let i = startLine; i < lines.length; i++) { // startLine is 1-based: begins after the test( line
    if (TEST_CALL.test(lines[i])) break; // next test starts
    if (ASSERTION.test(lines[i])) last = i + 1;
  }
  return last;
}

/** Line of the first stack frame inside the test file, i.e. the test's own step that failed. */
function lineInFile(result: TestResult, file: string): number | null {
  const error = result.errors[0];
  if (!error) return null;
  if (error.location?.file === file) return error.location.line;
  const name = file.split(/[\\/]/).pop()!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = (error.stack ?? '').match(new RegExp(`${name}:(\\d+):\\d+`));
  return m ? Number(m[1]) : null;
}

export default class KnownBugReporter implements Reporter {
  private problems: string[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    if (test.expectedStatus !== 'failed' || result.status !== 'failed') return;
    const { file, line } = test.location;
    const expected = lastAssertionLine(file, line);
    const failedAt = lineInFile(result, file);
    if (expected && failedAt === expected) return;

    const got = failedAt ? `line ${failedAt}` : 'no line in the test file (timeout or crash?)';
    const message = (result.errors[0]?.message ?? '').split('\n')[0].slice(0, 160);
    this.problems.push(
      `${test.title} (${file.split(/[\\/]/).pop()}:${line}): expected to fail at line ${expected ?? '?'}, ` +
        `failed at ${got}\n      ${message}`
    );
  }

  onEnd(_result: FullResult) {
    if (this.problems.length === 0) return;
    console.log(`\nKnown-bug guard: ${this.problems.length} test.fail() test(s) failed before their last assertion:`);
    for (const p of this.problems) console.log(`  - ${p}`);
    console.log('A broken step can look like an open bug. Fix the step, or make the check for the bug the last assertion.\n');
    return { status: 'failed' as const };
  }
}
