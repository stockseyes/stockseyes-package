// Validates the OpenAPI spec's schemas and checks every fixture against them.
// This is the cross-language contract gate: if a fixture (a sample API response or
// expected normalized output) drifts from spec/openapi.yaml, this fails.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import _Ajv2020 from 'ajv/dist/2020.js';
import _addFormats from 'ajv-formats';

const Ajv2020 = _Ajv2020.default || _Ajv2020;
const addFormats = _addFormats.default || _addFormats;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const specPath = resolve(root, 'spec/openapi.yaml');
const fixturesDir = resolve(root, 'fixtures');

// Which component schema each fixture must conform to.
const FIXTURE_SCHEMAS = {
  'quote.json': 'RawQuote',
  'quote.normalized.json': 'Quote',
  'search.json': 'RawSearchResponse',
  'search.normalized.json': 'SearchResult',
};

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
}

const spec = yaml.load(readFileSync(specPath, 'utf8'));

for (const key of ['openapi', 'info', 'paths', 'components']) {
  if (!spec?.[key]) fail(`spec/openapi.yaml is missing top-level "${key}"`);
}
const schemas = spec?.components?.schemas ?? {};
if (Object.keys(schemas).length === 0) fail('spec has no components.schemas');
if (process.exitCode === 1) process.exit(1);

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema({ components: { schemas } }, 'spec');

// Compile every schema — acts as a schema-level lint.
const validators = {};
for (const name of Object.keys(schemas)) {
  try {
    validators[name] = ajv.compile({ $ref: `spec#/components/schemas/${name}` });
  } catch (err) {
    fail(`schema "${name}" failed to compile: ${err.message}`);
  }
}
if (process.exitCode === 1) process.exit(1);
console.log(
  `✓ spec/openapi.yaml parsed; ${Object.keys(schemas).length} schemas valid`
);

// Validate every fixture against its mapped schema.
const fixtureFiles = readdirSync(fixturesDir).filter((f) => f.endsWith('.json'));
if (fixtureFiles.length === 0) fail('no fixtures found');

for (const file of fixtureFiles) {
  const schemaName = FIXTURE_SCHEMAS[file];
  if (!schemaName) {
    fail(`fixtures/${file} has no schema mapping in scripts/check-contract.mjs`);
    continue;
  }
  const validate = validators[schemaName];
  const data = JSON.parse(readFileSync(resolve(fixturesDir, file), 'utf8'));
  if (validate(data)) {
    console.log(`✓ fixtures/${file} conforms to ${schemaName}`);
  } else {
    fail(`fixtures/${file} does not conform to ${schemaName}:`);
    for (const e of validate.errors ?? []) {
      console.error(`    ${e.instancePath || '/'} ${e.message}`);
    }
  }
}

if (process.exitCode === 1) {
  console.error('\nContract check FAILED');
  process.exit(1);
}
console.log('\nContract check passed ✅');
