import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import * as core from '../jev-builder-core.js';

// A DOM boundary stub for behavior tests, not a rendered-layout substitute.
class Element {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.attrs = {};
    this.events = {};
    this.dataset = {};
    this.style = { values: {}, setProperty(name, value) { this.values[name] = value; } };
    this.classList = {
      names: new Set(),
      add(name) { this.names.add(name); },
      remove(name) { this.names.delete(name); },
      contains(name) { return this.names.has(name); },
      toggle(name, force) { const on = force === undefined ? !this.names.has(name) : Boolean(force); if (on) this.names.add(name); else this.names.delete(name); return on; },
    };
    this.offsetWidth = 280;
    this.offsetHeight = 90;
    this.value = '';
    this.textContent = '';
  }
  setAttribute(key, value) {
    this.attrs[key] = String(value);
    if (key === 'id') this.id = value;
    if (key === 'value') this.value = value;
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(name, callback) { this.events[name] = callback; }
  focus() { this.focused = true; }
  querySelector(selector) { return [...this.walk()].find((node) => node !== this && String(node.className || '').split(' ').includes(selector.replace('.', ''))) || null; }
  contains(node) { return [...this.walk()].includes(node); }
  getBoundingClientRect() { return { left: 40, top: 30, bottom: 48 }; }
  showModal() { this.open = true; }
  close(value = '') { this.open = false; this.returnValue = value; this.events.close?.(); }
  *walk() {
    yield this;
    for (const child of this.children) if (child instanceof Element) yield* child.walk();
  }
}

const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = source.match(/<script type="module">([\s\S]*?)<\/script>/)[1]
  .replace(/import \* as core from .*?;/, '');
const STORE = 'jev-builder:v2';

function workspace(stored = new Map(), templates = core.TEMPLATES) {
  const ids = [...source.matchAll(/\bid="([\w-]+)"/g)].map((match) => match[1]);
  const roots = Object.fromEntries(ids.map((id) => [id, new Element('div')]));
  roots.body = new Element('body');
  const html = new Element('html');
  html.dataset.theme = 'dark';
  const all = () => Object.values(roots).flatMap((node) => [...node.walk()]);
  const get = (id) => roots[id] || all().find((node) => node.id === id);
  let clipboard = '';
  const context = vm.createContext({
    core: { ...core, TEMPLATES: templates }, console, setTimeout: () => {}, clearTimeout: () => {},
    window: { innerWidth: 1200, innerHeight: 800, addEventListener: () => {} },
    navigator: { clipboard: { writeText: async (text) => { clipboard = text; } } },
    localStorage: { getItem: (key) => stored.get(key) || null, setItem: (key, value) => stored.set(key, value) },
    document: {
      body: roots.body, addEventListener: () => {}, documentElement: html, getElementById: get, querySelector: () => ({}),
      createElement: (tag) => new Element(tag), createElementNS: (_, tag) => new Element(tag),
    },
  });
  vm.runInContext(script, context);
  return { get, all, stored, clipboard: () => clipboard, html };
}

const find = (root, predicate) => [...root.walk()].find(predicate);
// A button's label may sit in a child span, beside its icon.
const labelOf = (node) => node.textContent || [...node.walk()].filter((child) => child !== node).map((child) => child.textContent).join('');
const button = (root, text) => find(root, (node) => node.tag === 'button' && labelOf(node) === text);
const type = (node, value) => { node.value = value; node.events.input({ target: node }); };
const choose = (node, value) => { node.value = value; node.events.change({ target: node }); };
// Read the pane back out of its coloured spans: what is shown must be the
// generated text exactly, line for line, or highlighting has eaten something.
const paneText = (pane) => pane.children.map((line) => line.children.map((token) => token.textContent).join('')).join('\n');
const preview = (app) => paneText(app.get('output-0'));
const chooseTemplate = (app, id) => {
  app.get('template-picker').events.click();
  button(app.get('library-categories'), 'All templates').events.click();
  type(app.get('library-search'), core.TEMPLATES.find((template) => template.id === id).title);
  find(app.get('library-results'), (node) => node.attrs['data-template-id'] === id).events.click();
};
const accept = (app) => { if (app.get('confirm-dialog').open) app.get('confirm-accept').events.click(); };

test('editors coexist and typing updates JSON without replacing inputs', async () => {
  const app = workspace();
  choose(app.get('output-format'), 'json');
  assert.ok(find(app.get('source-panel'), (node) => node.tag === 'textarea'));
  assert.ok(find(app.get('questions-panel'), (node) => node.tag === 'textarea'));
  const text = find(app.get('source-panel'), (node) => node.tag === 'textarea');
  const question = find(app.get('questions-panel'), (node) => node.tag === 'textarea');
  type(text, 'A synthetic example.');
  type(question, 'Is this an example?');
  assert.equal(find(app.get('source-panel'), (node) => node.tag === 'textarea'), text);
  assert.equal(find(app.get('questions-panel'), (node) => node.tag === 'textarea'), question);
  const request = JSON.parse(preview(app));
  assert.equal(request.state.text, text.value);
  assert.equal(Object.values(request.questions)[0].instructions, question.value);
  assert.equal(app.get('preview-help').children[0].attrs['aria-label'], 'Request preview: ready to use');
  await button(app.get('preview-output'), 'Copy').events.click();
  assert.equal(app.clipboard(), preview(app));
  const restored = workspace(app.stored);
  assert.equal(preview(restored), preview(app));
});

test('all templates and output formats use the core generators', () => {
  const app = workspace();
  assert.equal(app.get('output-format').value, 'playground');   // the default, with nothing saved
  choose(app.get('output-format'), 'json');
  for (const template of core.TEMPLATES) {
    chooseTemplate(app, template.id);
    accept(app);
    assert.deepEqual(JSON.parse(preview(app)), core.requestBody(core.fromTemplate(template.id)));
  }
  const draft = JSON.parse(app.stored.get(STORE));
  choose(app.get('output-format'), 'playground');
  assert.equal(paneText(app.get('output-0')), core.playgroundState(draft));
  assert.equal(paneText(app.get('output-1')), core.playgroundQuestions(draft));
  choose(app.get('output-format'), 'python');
  assert.equal(preview(app), core.pythonSnippet(draft));
  choose(app.get('output-format'), 'curl');
  assert.equal(preview(app), core.curlSnippet(draft));
  assert.equal(workspace(app.stored).get('output-format').value, 'curl');
});

test('structural changes refresh output and source names remain unique', () => {
  const draft = core.fromTemplate('urgent');
  draft.state.push({ key: 'text_3', text: 'Synthetic second input' });
  const app = workspace(new Map([[STORE, JSON.stringify(draft)]]));
  choose(app.get('output-format'), 'json');
  button(app.get('source-panel'), '+ Add another piece of text').events.click();
  const state = JSON.parse(preview(app)).state;
  assert.ok(Object.hasOwn(state, 'text_4'));
  button(app.get('questions-panel'), '+ Pick one').events.click();
  assert.equal(JSON.parse(app.stored.get(STORE)).questions.length, 2);
  button(app.get('questions-panel'), 'Delete this question').events.click();
  accept(app);
  assert.equal(JSON.parse(app.stored.get(STORE)).questions.length, 1);
});

test('theme toggle persists and old tab navigation is absent', () => {
  const app = workspace();
  app.get('theme-toggle').events.click();
  assert.equal(app.html.dataset.theme, 'light');
  assert.equal(app.stored.get('jev-builder:theme'), 'light');
  assert.equal(app.all().some((node) => node.attrs.role === 'tab'), false);
  assert.equal(app.all().some((node) => node.textContent.startsWith('Next:')), false);
});

test('custom confirmation cancels safely, handles Escape and resets between actions', () => {
  const app = workspace(new Map([[STORE, JSON.stringify(core.fromTemplate('urgent'))]]));
  choose(app.get('output-format'), 'json');
  const original = preview(app);
  chooseTemplate(app, 'lyrics');
  assert.equal(app.get('confirm-dialog').open, true);
  assert.equal(preview(app), original);
  app.get('confirm-cancel').events.click();
  assert.equal(preview(app), original);
  assert.equal(app.get('template-library').open, false);
  chooseTemplate(app, 'refund');
  accept(app);
  const replaced = preview(app);
  assert.notEqual(replaced, original);
  chooseTemplate(app, 'spam');
  app.get('confirm-dialog').close(''); // Browser Escape closes a dialog without an accept value.
  assert.equal(preview(app), replaced);
  assert.equal(app.get('template-library').open, false);
  button(app.get('templates'), 'Start blank').events.click();
  assert.equal(preview(app), replaced);
  accept(app);
  assert.equal(JSON.parse(preview(app)).state.text, '');
  assert.equal(app.get('confirm-dialog').open, false);
  assert.ok(app.get('template-picker').focused);
});

test('header names edit outputs, auto-update and preserve manual overrides', () => {
  const app = workspace();
  choose(app.get('output-format'), 'json');
  const textName = find(app.get('source-panel'), (node) => node.attrs['aria-label'] === 'text 1 name');
  const questionName = find(app.get('questions-panel'), (node) => node.attrs['aria-label'] === 'question 1 name');
  const question = find(app.get('questions-panel'), (node) => node.tag === 'textarea');
  type(textName, 'message');
  type(question, 'Is this urgent?');
  assert.equal(questionName.value, 'urgent');
  type(questionName, 'needs_action');
  type(question, 'Does this need help?');
  const request = JSON.parse(preview(app));
  assert.ok(Object.hasOwn(request.state, 'message'));
  assert.ok(Object.hasOwn(request.questions, 'needs_action'));
  assert.equal(questionName.value, 'needs_action');
  button(app.get('source-panel'), '+ Add another piece of text').events.click();
  button(app.get('questions-panel'), '+ Pick one').events.click();
  assert.ok(find(app.get('source-panel'), (node) => node.attrs['aria-label'] === 'text 2 name'));
  assert.ok(find(app.get('questions-panel'), (node) => node.attrs['aria-label'] === 'question 2 name'));
  const restored = workspace(app.stored);
  assert.equal(find(restored.get('questions-panel'), (node) => node.attrs['aria-label'] === 'question 1 name').value, 'needs_action');
});

test('library search, category filters, empty state and saved query', () => {
  const app = workspace();
  app.get('template-picker').events.click();
  assert.equal(app.get('template-library').open, true);
  assert.ok(app.get('library-search').focused);
  button(app.get('library-categories'), 'Customer support').events.click();
  const supportCount = core.TEMPLATES.filter((template) => template.category === 'Customer support').length;
  assert.equal(app.get('library-count').textContent, `${supportCount} templates`);
  type(app.get('library-search'), 'refund');
  assert.equal(app.get('library-count').textContent, '1 template');
  const row = find(app.get('library-results'), (node) => node.attrs['data-template-id'] === 'refund');
  assert.ok(find(row, (node) => node.tag === 'svg'));
  const restored = workspace(app.stored);
  restored.get('template-picker').events.click();
  assert.equal(restored.get('library-search').value, 'refund');
  assert.equal(restored.get('library-count').textContent, '1 template');
  type(app.get('library-search'), 'unfindable-example');
  assert.equal(app.get('library-count').textContent, '0 templates');
  assert.ok(find(app.get('library-results'), (node) => node.className === 'library-empty'));
  app.get('library-close').events.click();
  assert.equal(app.get('template-library').open, false);
});

test('large template libraries paginate without dropping or duplicating rows', () => {
  const templates = Array.from({ length: 19 }, (_, index) => ({ ...core.TEMPLATES[0], id: `example_${index}`, category: 'New category' }));
  const app = workspace(new Map(), templates);
  app.get('template-picker').events.click();
  const rows = () => [...app.get('library-results').walk()].filter((node) => node.attrs['data-template-id']).map((node) => node.attrs['data-template-id']);
  const seen = [...rows()];
  assert.equal(seen.length, 8);
  assert.equal(app.get('library-prev').disabled, true);
  app.get('library-next').events.click();
  seen.push(...rows());
  app.get('library-next').events.click();
  seen.push(...rows());
  assert.equal(app.get('library-next').disabled, true);
  assert.equal(seen.length, 19);
  assert.equal(new Set(seen).size, 19);
  button(app.get('library-categories'), 'New category').events.click();
  assert.equal(app.get('library-page').textContent, 'Page 1 of 3');
});

test('catalog entries have unique IDs, complete requests and valid example labels', () => {
  assert.equal(new Set(core.TEMPLATES.map((template) => template.id)).size, core.TEMPLATES.length);
  for (const template of core.TEMPLATES) {
    const draft = core.fromTemplate(template.id);
    assert.deepEqual(core.problems(draft), [], template.id);
    assert.ok(template.category && template.title && template.blurb && template.text, template.id);
    if (core.TESTABLE.has(template.question.type)) {
      assert.deepEqual(core.testProblems(draft), [], template.id);
      const labels = template.question.type === 'noul' ? ['yes', 'no'] : template.question.options.map((option) => option.name);
      for (const [, expected] of template.examples) assert.ok(labels.includes(expected), template.id);
      for (const label of labels) assert.ok(template.examples.some(([, expected]) => expected === label), `${template.id}: missing ${label} example`);
      assert.ok(core.jevYaml(draft).includes('examples:'), template.id);
    } else {
      assert.ok(template.question.levels.length >= 2, template.id);
      assert.ok(template.question.levels.every((level) => level.trim()), template.id);
    }
    draft.questions[0].instructions = 'Changed only in this draft';
    assert.notEqual(core.fromTemplate(template.id).questions[0].instructions, draft.questions[0].instructions);
  }
});

test('highlighting keeps every character and labels the obvious pieces', () => {
  const awkward = ['{', '  "key": "a \\"quoted\\" line: {braces}, 12, true",', '  "n": -1.5e3', '}'].join('\n');
  const snippets = [[awkward, 'json'],
    [core.pythonSnippet(core.fromTemplate('urgent')), 'python'],
    [core.curlSnippet(core.fromTemplate('urgent')), 'shell']];
  for (const [text, language] of snippets) {
    const lines = core.highlight(text, language);
    assert.equal(lines.map((line) => line.map(([, piece]) => piece).join('')).join('\n'), text);
  }
  const kinds = (line, language) => core.tokenizeLine(line, language).map(([kind]) => kind);
  assert.deepEqual(kinds('  "key": "value",', 'json'), ['plain', 'key', 'punct', 'plain', 'str', 'punct']);
  assert.deepEqual(kinds('  "n": -1.5e3', 'json'), ['plain', 'key', 'punct', 'plain', 'num']);
  assert.deepEqual(kinds('import json  # a note', 'python'), ['lit', 'plain', 'comment']);
  assert.deepEqual(kinds('  -H "Bearer $KEY" \\', 'shell'), ['plain', 'flag', 'plain', 'str', 'plain', 'punct']);
});

test('splitters move by keyboard, stay in bounds and are remembered', () => {
  const app = workspace();
  const press = (id, key) => app.get(id).events.keydown({ key, preventDefault() {} });
  const columns = () => app.get('workspace-grid').style.values['--columns'];
  const rows = () => app.get('editors').style.values['--rows'];
  assert.equal(columns(), '50%');
  assert.equal(rows(), '45%');
  press('split-columns', 'ArrowRight');
  assert.equal(columns(), '52%');
  press('split-rows', 'ArrowUp');
  assert.equal(rows(), '43%');
  for (let i = 0; i < 40; i += 1) press('split-columns', 'ArrowRight');
  assert.equal(columns(), '80%');
  assert.equal(app.get('split-columns').attrs['aria-valuenow'], '80');
  for (let i = 0; i < 60; i += 1) press('split-columns', 'ArrowLeft');
  assert.equal(columns(), '20%');
  press('split-columns', 'Enter');
  assert.equal(columns(), '50%');
  press('split-rows', 'End');
  assert.equal(rows(), '80%');
  // A fresh visit in the same browser keeps the layout.
  assert.equal(workspace(app.stored).get('editors').style.values['--rows'], '80%');
});

test('definition templates carry their policy as a second field', () => {
  const withFields = core.TEMPLATES.filter((template) => template.fields);
  assert.ok(withFields.length >= 6);
  for (const template of withFields) {
    const model = core.fromTemplate(template.id);
    assert.equal(model.state.length, template.fields.length);
    const state = core.requestBody(model).state;
    for (const [key, text] of template.fields) assert.equal(state[key], text);
    // The question has to name its fields, or the extra text is dead weight.
    for (const [key] of template.fields) assert.match(model.questions[0].instructions, new RegExp('`' + key + '`'));
    if (!model.test.examples.length) continue;
    const yaml = core.jevYaml(model);
    for (const [key] of template.fields.slice(1)) assert.ok(yaml.includes(key + ':' + String.raw`\n`), key + ' missing from the check file');
  }
});

test('the browse button invites until the library has been opened once', () => {
  const app = workspace();
  assert.match(app.get('template-picker').className, /inviting/);
  app.get('template-picker').events.click();
  assert.equal(app.stored.get('jev-builder:seen-library'), 'yes');
  // A later visit in the same browser gets the quiet button.
  const returning = workspace(app.stored);
  assert.doesNotMatch(returning.get('template-picker').className, /inviting/);
});

test('a draft can be saved, reopened and deleted under Your templates', () => {
  const app = workspace(new Map([[STORE, JSON.stringify(core.fromTemplate('urgent'))]]));
  const saveAs = (title) => {
    button(app.get('templates'), 'Save as template').events.click();
    app.get('name-input').value = title;
    app.get('name-accept').events.click();
  };
  saveAs('My triage');
  const kept = JSON.parse(app.stored.get('jev-builder:mine'));
  assert.equal(kept.length, 1);
  assert.equal(kept[0].title, 'My triage');
  assert.deepEqual(kept[0].model, JSON.parse(app.stored.get(STORE)));
  assert.match(app.get('save-note').textContent, /My triage/);

  // A later visit lists it first, under its own category.
  const back = workspace(app.stored);
  back.get('template-picker').events.click();
  const categories = back.get('library-categories').children.map((node) => node.textContent);
  assert.equal(categories[1], 'Your templates');
  const row = find(back.get('library-results'), (node) => node.attrs['data-template-id'] === kept[0].id);
  assert.ok(row, 'the saved template is listed');

  // Opening it restores that draft, whatever is in the editors now.
  back.get('source-panel');
  row.events.click();
  back.get('template-library').events.close();
  if (back.get('confirm-dialog').open) back.get('confirm-accept').events.click();
  assert.deepEqual(JSON.parse(back.stored.get(STORE)).questions, kept[0].model.questions);

  // Deleting asks first, then it is gone for good.
  back.get('template-picker').events.click();
  find(back.get('library-results'), (node) => node.attrs['data-delete-id'] === kept[0].id).events.click();
  back.get('confirm-accept').events.click();
  back.get('confirm-dialog').events.close();
  assert.deepEqual(JSON.parse(back.stored.get('jev-builder:mine')), []);
});

test('a pasted response is recorded, summarised and kept per question', () => {
  const app = workspace(new Map([[STORE, JSON.stringify(core.fromTemplate('urgent'))]]));
  const key = JSON.parse(app.stored.get(STORE)).questions[0].key;
  const paste = (noul) => {
    app.get('eval-paste')?.events?.click?.() ?? app.get('history-button').events.click();
    app.get('paste-input').value = JSON.stringify({
      model: 'jev-1.13.0', answers: { [key]: { type: 'noul', noul } },
      usage: { input_tokens: 300, output_tokens: 23 },
    });
    app.get('paste-accept').events.click();
  };
  app.get('history-button').events.click();
  app.get('eval-paste').events.click();
  paste(0.95);
  paste(0.88);
  paste(0.41);

  const stored = JSON.parse(app.stored.get('jev-builder:runs'));
  assert.equal(stored.length, 3);
  assert.deepEqual(stored.map((run) => run.answer), ['yes', 'yes', 'no']);
  assert.equal(stored[0].key, key);
  assert.equal(stored[0].inputTokens, 300);

  // The panel names the question and counts its runs.
  assert.match(app.get('eval-title').textContent, new RegExp(key));
  const stats = app.get('eval-stats').children.map((cell) => cell.children.map((part) => part.textContent));
  const value = (label) => stats.find(([name]) => name === label)?.[1];
  assert.equal(value('runs'), '3');
  assert.equal(value('most common'), 'yes');
  assert.equal(value('agreement'), '67%');
  assert.equal(value('tokens in'), '900');

  // Clearing asks first, and only empties this question.
  app.get('eval-clear').events.click();
  app.get('confirm-accept').events.click();
  app.get('confirm-dialog').events.close();
  assert.deepEqual(JSON.parse(app.stored.get('jev-builder:runs')), []);
});

test('the action rail collapses and stays that way', () => {
  const app = workspace();
  assert.equal(app.get('rail').classList.contains('closed'), false);
  assert.equal(app.get('rail-toggle').attrs['aria-expanded'], 'true');
  app.get('rail-toggle').events.click();
  assert.equal(app.get('rail').classList.contains('closed'), true);
  assert.equal(app.stored.get('jev-builder:rail'), 'closed');
  const back = workspace(app.stored);
  assert.equal(back.get('rail').classList.contains('closed'), true);
  assert.equal(back.get('rail-toggle').attrs['aria-expanded'], 'false');
});
