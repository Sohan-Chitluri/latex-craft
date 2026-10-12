/**
 * PDF Renderer & Metadata Inspector for latex-craft
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getPdfInfo(pdfPath) {
  const resolvedPdf = path.resolve(pdfPath);
  if (!fs.existsSync(resolvedPdf)) {
    throw new Error(`PDF file not found: ${resolvedPdf}`);
  }

  const raw = execSync(`pdfinfo "${resolvedPdf}"`, { encoding: 'utf-8' });
  const info = {};
  for (const line of raw.split('\n')) {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join(':').trim();
      info[key] = val;
    }
  }

  if (info.Pages) {
    info.pageCount = parseInt(info.Pages, 10);
  }
  return info;
}

function renderPdfPages(pdfPath, options = {}) {
  const resolvedPdf = path.resolve(pdfPath);
  if (!fs.existsSync(resolvedPdf)) {
    throw new Error(`PDF file not found: ${resolvedPdf}`);
  }

  const dpi = options.dpi || 150;
  const targetDir = options.outdir ? path.resolve(options.outdir) : path.join(path.dirname(resolvedPdf), 'previews');
  fs.mkdirSync(targetDir, { recursive: true });

  let pageArgs = '';
  if (options.firstPage) pageArgs += ` -f ${options.firstPage}`;
  if (options.lastPage) pageArgs += ` -l ${options.lastPage}`;

  const prefix = path.join(targetDir, 'page');
  const cmd = `pdftoppm -png -r ${dpi}${pageArgs} "${resolvedPdf}" "${prefix}"`;
  execSync(cmd, { stdio: 'pipe' });

  const files = fs.readdirSync(targetDir)
    .filter(f => f.startsWith('page') && f.endsWith('.png'))
    .sort((a, b) => {
      const numA = parseInt((a.match(/\d+/) || [0])[0], 10);
      const numB = parseInt((b.match(/\d+/) || [0])[0], 10);
      return numA - numB;
    })
    .map(f => path.join(targetDir, f));

  return {
    outdir: targetDir,
    images: files,
    count: files.length,
  };
}

module.exports = { getPdfInfo, renderPdfPages };
