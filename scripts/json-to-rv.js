#!/usr/bin/env node
/**
 * Convert JSON back to .rv (GTO text) format
 * Usage: node scripts/json-to-rv.js <input.json> [output.rv]
 */

import { readFileSync, writeFileSync } from 'fs';
import { SimpleWriter } from '../src/index.js';

const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Usage: node scripts/json-to-rv.js <input.json> [output.rv]');
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1] || inputFile.replace(/\.json$/, '.rv');

try {
  console.log(`Reading ${inputFile}...`);
  const content = readFileSync(inputFile, 'utf-8');
  const data = JSON.parse(content);

  console.log(`Converting ${data.objects.length} objects...`);
  const rvContent = SimpleWriter.write(data);

  writeFileSync(outputFile, rvContent, 'utf-8');
  console.log(`Written to ${outputFile}`);

} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
