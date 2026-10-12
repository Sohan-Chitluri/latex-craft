/**
 * Word (.docx) to LaTeX Converter for latex-craft
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function convertWordToLatex(docxPath, options = {}) {
  const resolvedDocx = path.resolve(docxPath);
  if (!fs.existsSync(resolvedDocx)) {
    throw new Error(`Word document not found: ${resolvedDocx}`);
  }

  const baseName = path.basename(resolvedDocx, path.extname(resolvedDocx));
  const outputTex = path.resolve(options.outputTex || path.join(path.dirname(resolvedDocx), `${baseName}.tex`));
  const mediaDir = path.resolve(options.mediaDir || path.join(path.dirname(resolvedDocx), 'figures'));

  fs.mkdirSync(mediaDir, { recursive: true });

  const cmd = `pandoc -s "${resolvedDocx}" -o "${outputTex}" --extract-media="${mediaDir}"`;
  execSync(cmd, { stdio: 'pipe' });

  return {
    success: true,
    texPath: outputTex,
    mediaDir,
  };
}

module.exports = { convertWordToLatex };
