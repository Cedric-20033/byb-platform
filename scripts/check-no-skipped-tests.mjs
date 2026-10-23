#!/usr/bin/env node
// scripts/check-no-skipped-tests.mjs
//
// P10.5 : « zéro test ignoré sans justification ». Lit le rapport JSON d'une suite et échoue si un test a été
// ignoré (skip, todo, ou jamais exécuté) sans figurer dans la liste blanche `scripts/allowed-skips.json`.
//
// Usage :
//   node scripts/check-no-skipped-tests.mjs vitest     vitest-report.json
//   node scripts/check-no-skipped-tests.mjs playwright playwright-results.json
//
// Un test ignoré parce qu'une variable d'environnement manque ne prouve rien : en CI, les variables sont fournies,
// donc tout skip restant est soit une exception documentée (liste blanche, avec sa raison), soit un oubli.
import { existsSync, readFileSync } from 'node:fs';

const [kind, reportPath] = process.argv.slice(2);

if (!['vitest', 'playwright'].includes(kind) || !reportPath) {
  console.error('Usage : node scripts/check-no-skipped-tests.mjs <vitest|playwright> <rapport.json>');
  process.exit(2);
}
if (!existsSync(reportPath)) {
  console.error(`Rapport introuvable : ${reportPath}. La suite a-t-elle été lancée avec le reporter JSON ?`);
  process.exit(2);
}

const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const allowlist = JSON.parse(readFileSync(new URL('./allowed-skips.json', import.meta.url), 'utf8'))[kind] ?? [];

/** Playwright : un test « skipped » porte sa raison dans ses annotations (`test.skip(condition, 'raison')`). */
function collectPlaywright() {
  const skipped = [];
  const visit = (suite, inheritedFile) => {
    const file = suite.file ?? inheritedFile;
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        if (test.status !== 'skipped') continue;
        const reason = (test.annotations ?? [])
          .filter((annotation) => ['skip', 'fixme'].includes(annotation.type))
          .map((annotation) => annotation.description ?? '')
          .join(' ')
          .trim();
        skipped.push({ where: `${spec.file ?? file} > ${spec.title} [${test.projectName}]`, reason });
      }
    }
    for (const child of suite.suites ?? []) visit(child, file);
  };
  for (const suite of report.suites ?? []) visit(suite, suite.file);
  return skipped;
}

/** Vitest : tout statut autre que « passed » ou « failed » est un test non exécuté. */
function collectVitest() {
  const skipped = [];
  for (const file of report.testResults ?? []) {
    for (const test of file.assertionResults ?? []) {
      if (test.status === 'passed' || test.status === 'failed') continue;
      skipped.push({ where: `${file.name} > ${test.fullName} [${test.status}]`, reason: '' });
    }
  }
  return skipped;
}

const isAllowed = (item) =>
  allowlist.some(
    (rule) =>
      (rule.reasonIncludes && item.reason.includes(rule.reasonIncludes)) ||
      (rule.whereIncludes && item.where.includes(rule.whereIncludes)),
  );

const skipped = kind === 'playwright' ? collectPlaywright() : collectVitest();
const unjustified = skipped.filter((item) => !isAllowed(item));

console.log(`${skipped.length} test(s) ignoré(s), dont ${skipped.length - unjustified.length} justifié(s) par la liste blanche.`);

if (unjustified.length > 0) {
  console.error(`\n${unjustified.length} test(s) ignoré(s) SANS justification :`);
  for (const item of unjustified) console.error(`  - ${item.where}${item.reason ? `\n      raison : ${item.reason}` : '\n      (aucune raison donnée)'}`);
  console.error(
    '\nCorrigez la cause (variable d\'environnement ou donnée de test manquante en CI), ou, si l\'exception est légitime,' +
      '\najoutez-la avec sa raison à scripts/allowed-skips.json.',
  );
  process.exit(1);
}
