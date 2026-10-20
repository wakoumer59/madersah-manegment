// Static structure validator for Firebase Realtime Database rules.
// Catches: invalid JSON structure, invalid rule names, non-scalar rule values,
// and common semantic mistakes (e.g., string rules referencing no context).
'use strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const rulesPath = join(process.cwd(), 'firebase', 'database.rules.json');

const VALID_RULE_KEYS = new Set([
  '.read', '.write', '.indexOn', '.validate',
]);

const errors = [];
const warnings = [];

function validateNode(path, node, parentIsWildcard = false) {
  if (typeof node === 'boolean' || typeof node === 'number') {
    return;
  }
  if (typeof node === 'string') {
    if (!node.includes('auth') && !node.includes('newData') && !node.includes('data') && !node.includes('root')) {
      warnings.push(`${path}: string rule may not reference any rules context: ${node.slice(0, 60)}`);
    }
    return;
  }
  if (Array.isArray(node)) {
    errors.push(`${path}: rule value must not be an array`);
    return;
  }
  if (node === null || typeof node !== 'object') {
    errors.push(`${path}: rule value must be object, string, boolean, or number (got ${typeof node})`);
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    const childPath = `${path}/${key}`;
    if (key.startsWith('.')) {
      if (!VALID_RULE_KEYS.has(key)) {
        errors.push(`${childPath}: invalid rule key "${key}" (allowed: ${Array.from(VALID_RULE_KEYS).join(', ')})`);
      }
      validateNode(childPath, value);
    } else {
      validateNode(childPath, value, key.startsWith('$'));
    }
  }
}

try {
  const raw = readFileSync(rulesPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (parseErr) {
    console.error('JSON parse failed:', parseErr);
    process.exit(1);
  }
  if (!parsed.rules || typeof parsed.rules !== 'object') {
    errors.push('Top-level "rules" key missing or not an object');
  } else {
    validateNode('rules', parsed.rules);
  }
  const top = Object.keys(parsed.rules || {});
  console.log('Top-level rule nodes:', top.join(', '));
} catch (err) {
  console.error('File read failed:', err);
  process.exit(1);
}

if (errors.length > 0) {
  console.error('\nERRORS:');
  for (const e of errors) console.error('  X', e);
  process.exit(1);
}
if (warnings.length > 0) {
  console.warn('\nWARNINGS:');
  for (const w of warnings) console.warn('  !', w);
}
console.log('\ndatabase.rules.json passed static structure validation.');