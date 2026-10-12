/**
 * Template Scaffolder for latex-craft
 */

const fs = require('fs');
const path = require('path');

const TEMPLATES_ROOT = path.resolve(__dirname, '..', 'templates');

function listTemplates() {
  return ['ieee', 'springer', 'patent', 'resume', 'article'];
}

function scaffoldTemplate(type, targetDir) {
  const normalized = (type || 'article').toLowerCase();
  const templateSource = path.join(TEMPLATES_ROOT, normalized);

  if (!fs.existsSync(templateSource)) {
    throw new Error(`Unknown template '${type}'. Available templates: ${listTemplates().join(', ')}`);
  }

  const dest = path.resolve(targetDir);
  fs.mkdirSync(dest, { recursive: true });

  const files = fs.readdirSync(templateSource);
  const created = [];

  for (const file of files) {
    const srcFile = path.join(templateSource, file);
    const destFile = path.join(dest, file);
    if (!fs.existsSync(destFile)) {
      fs.copyFileSync(srcFile, destFile);
      created.push(destFile);
    }
  }

  return {
    template: normalized,
    directory: dest,
    filesCreated: created,
  };
}

module.exports = { scaffoldTemplate, listTemplates };
