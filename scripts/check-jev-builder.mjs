/**
 * The builder's .jev.yaml must load in dinostomp, exactly as written.
 *
 *   node scripts/check-jev-builder.mjs            (needs `dinostomp` importable by python)
 *
 * Builds a noul and a choice question file from awkward text (quotes, line
 * breaks, colons, "yes" and "no", emoji, a backslash), loads each with
 * dinostomp's own question-file loader, and checks every field came through
 * unchanged. Not part of `npm run build`: the site must build without Python.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { jevYaml, testProblems, TEMPLATES, fromTemplate, problems, TESTABLE as CAN_TEST } from '../jev-builder-core.js';

const awkward = 'She said "no: not today"\nthen left.\ttab, a C:\\path, and 🎤';

const cases = {
  noul: {
    state: [{ key: 'text', text: 'x' }],
    questions: [{ key: 'is_urgent', type: 'noul', instructions: 'Is it urgent: yes or no?',
                  trueMeans: 'broken "now"', falseMeans: 'can wait' }],
    test: { question: 'is_urgent', minAccuracy: '0.8',
            examples: [{ text: awkward, expect: 'yes' }, { text: 'thanks!', expect: 'no' }] },
  },
  choice: {
    state: [{ key: 'text', text: 'x' }],
    questions: [{ key: 'route', type: 'choice', instructions: 'Which team?',
                  options: [{ name: 'billing', description: 'money: refunds, "charges"' },
                            { name: 'yes', description: 'a team literally called yes' }] }],
    test: { question: 'route', examples: [{ text: awkward, expect: 'billing' }, { text: 'hi', expect: 'yes' }] },
  },
};

const dir = mkdtempSync(join(tmpdir(), 'jev-builder-'));
let failed = 0;
for (const [name, model] of Object.entries(cases)) {
  const issues = testProblems(model);
  if (issues.length) { console.error(`${name}: builder says ${issues.join('; ')}`); failed++; continue; }
  const path = join(dir, `${name}.jev.yaml`);
  writeFileSync(path, jevYaml(model), 'utf8');
  const expected = JSON.stringify({
    kind: model.questions[0].type,
    instructions: model.questions[0].instructions,
    criteria: name === 'noul' ? { true: 'broken "now"', false: 'can wait' }
                              : { billing: 'money: refunds, "charges"', yes: 'a team literally called yes' },
    examples: model.test.examples.map((e) => ({ state: e.text, expect: e.expect })),
    require: name === 'noul' ? { accuracy: 0.8 } : {},
  });
  const py = `
import json, sys
from dinostomp.questions import load_question
q = load_question(sys.argv[1])
got = {"kind": q.kind, "instructions": q.instructions, "criteria": q.criteria,
       "examples": q.examples, "require": q.require}
want = json.loads(sys.argv[2])
if got != want:
    print("MISMATCH"); print(json.dumps(got, ensure_ascii=False)); print(json.dumps(want, ensure_ascii=False)); sys.exit(1)
print("ok")
`;
  try {
    const out = execFileSync('python', ['-c', py, path, expected], { encoding: 'utf8' });
    console.log(`${name}: ${out.trim()}`);
  } catch (e) {
    console.error(`${name}: dinostomp could not load it as written\n${e.stdout || ''}${e.stderr || ''}`);
    failed++;
  }
}
// Every template is complete, and every testable one writes a file dinostomp loads.
let templateFailures = 0;
for (const t of TEMPLATES) {
  const model = fromTemplate(t.id);
  const issues = problems(model);
  if (issues.length) { console.error(`template ${t.id}: ${issues.join('; ')}`); templateFailures++; continue; }
  if (!CAN_TEST.has(model.questions[0].type)) { console.log(`template ${t.id}: ok (a rating; nothing to check)`); continue; }
  const tp = testProblems(model);
  if (tp.length) { console.error(`template ${t.id}: ${tp.join('; ')}`); templateFailures++; continue; }
  const path = join(dir, `${t.id}.jev.yaml`);
  writeFileSync(path, jevYaml(model), 'utf8');
  try {
    execFileSync('python', ['-c', 'import sys\nfrom dinostomp.questions import load_question\nq = load_question(sys.argv[1])\nprint(len(q.examples))', path], { encoding: 'utf8' });
    console.log(`template ${t.id}: ok (${model.test.examples.length} examples load in dinostomp)`);
  } catch (e) {
    console.error(`template ${t.id}: dinostomp refused it\n${e.stdout || ''}${e.stderr || ''}`);
    templateFailures++;
  }
}
process.exit(failed || templateFailures ? 1 : 0);
