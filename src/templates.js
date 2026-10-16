/**
 * Template Scaffolder & Custom Template Manager for latex-craft
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const BUILTIN_ROOT = path.resolve(__dirname, '..', 'templates');
const CUSTOM_ROOT = path.join(os.homedir(), '.config', 'latex-craft', 'templates');

function getCustomDir() {
  fs.mkdirSync(CUSTOM_ROOT, { recursive: true });
  return CUSTOM_ROOT;
}

function listBuiltinTemplates() {
  if (!fs.existsSync(BUILTIN_ROOT)) return [];
  return fs.readdirSync(BUILTIN_ROOT).filter(f => fs.statSync(path.join(BUILTIN_ROOT, f)).isDirectory());
}

function listCustomTemplates() {
  const dir = getCustomDir();
  return fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory());
}

function listTemplates() {
  const builtin = listBuiltinTemplates();
  const custom = listCustomTemplates();
  return {
    builtin,
    custom,
    all: [...builtin, ...custom],
  };
}

function scaffoldTemplate(type, targetDir) {
  const normalized = (type || 'article').toLowerCase();
  let source = path.join(BUILTIN_ROOT, normalized);

  // If not in built-in, check user custom templates
  if (!fs.existsSync(source)) {
    const customSource = path.join(getCustomDir(), normalized);
    if (fs.existsSync(customSource)) {
      source = customSource;
    } else {
      const available = listTemplates().all.join(', ');
      throw new Error(`Unknown template '${type}'. Available templates: ${available}`);
    }
  }

  const dest = path.resolve(targetDir);
  fs.mkdirSync(dest, { recursive: true });

  const files = fs.readdirSync(source).filter(f => f !== 'meta.json');
  const created = [];

  for (const file of files) {
    const srcFile = path.join(source, file);
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

function saveCustomTemplate(name, sourceDirOrFile, description = '') {
  if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error('Template name must contain only letters, numbers, hyphens, and underscores.');
  }

  const normalized = name.toLowerCase();
  const builtins = listBuiltinTemplates().map(b => b.toLowerCase());
  if (builtins.includes(normalized)) {
    throw new Error(`Cannot overwrite built-in template '${name}'. Please choose a custom name (e.g., 'custom-${normalized}').`);
  }

  const customRoot = getCustomDir();
  const destDir = path.join(customRoot, normalized);
  fs.mkdirSync(destDir, { recursive: true });

  const resolved = path.resolve(sourceDirOrFile || process.cwd());
  const savedFiles = [];

  if (fs.statSync(resolved).isFile()) {
    // Single file provided: copy as main.tex
    const destFile = path.join(destDir, 'main.tex');
    fs.copyFileSync(resolved, destFile);
    savedFiles.push('main.tex');
  } else {
    // Directory provided: copy all .tex, .cls, .sty, .bib, and image files
    const entries = fs.readdirSync(resolved);
    for (const entry of entries) {
      const ext = path.extname(entry).toLowerCase();
      if (['.tex', '.cls', '.sty', '.bst', '.bib', '.png', '.jpg', '.pdf'].includes(ext)) {
        const srcPath = path.join(resolved, entry);
        const dstPath = path.join(destDir, entry);
        if (fs.statSync(srcPath).isFile()) {
          fs.copyFileSync(srcPath, dstPath);
          savedFiles.push(entry);
        }
      }
    }
  }

  // Save metadata
  const meta = {
    name,
    description: description || `User custom template saved on ${new Date().toISOString().split('T')[0]}`,
    savedAt: new Date().toISOString(),
    files: savedFiles,
  };
  fs.writeFileSync(path.join(destDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');

  return {
    name,
    directory: destDir,
    savedFiles,
  };
}

module.exports = {
  listTemplates,
  scaffoldTemplate,
  saveCustomTemplate,
  listBuiltinTemplates,
  listCustomTemplates,
};
