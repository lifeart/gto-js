#!/usr/bin/env node
/**
 * Convert .rv (GTO text) file to JSON
 * Usage: node scripts/rv-to-json.js <input.rv> [output.json]
 */

import { readFileSync, writeFileSync } from 'fs';
import { SimpleReader } from '../src/index.js';

const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Usage: node scripts/rv-to-json.js <input.rv> [output.json]');
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1] || inputFile.replace(/\.rv$/, '.json');

try {
  console.log(`Reading ${inputFile}...`);
  const content = readFileSync(inputFile, 'utf-8');

  const reader = new SimpleReader();
  const success = reader.open(content, inputFile);

  if (!success) {
    console.error('Failed to parse GTO file');
    process.exit(1);
  }

  console.log(`Parsed ${reader.result.objects.length} objects`);

  const json = JSON.stringify(reader.result, null, 2);

  writeFileSync(outputFile, json, 'utf-8');
  console.log(`Written to ${outputFile}`);

} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
