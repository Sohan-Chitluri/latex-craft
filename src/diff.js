/**
 * Visual Page Diff Inspector for latex-craft
 * Compares iterations of compiled pages to detect layout shifts and budget changes.
 */

const fs = require('fs');
const path = require('path');
const { renderPdfPages, getPdfInfo } = require('./renderer.js');

function compareImageDirs(oldDir, newDir) {
  const oldFiles = fs.existsSync(oldDir) ? fs.readdirSync(oldDir).filter(f => f.endsWith('.png')).sort() : [];
  const newFiles = fs.existsSync(newDir) ? fs.readdirSync(newDir).filter(f => f.endsWith('.png')).sort() : [];

  const changes = [];
  const maxPages = Math.max(oldFiles.length, newFiles.length);

  for (let i = 0; i < maxPages; i++) {
    const pageNum = i + 1;
    const oldFile = oldFiles[i] ? path.join(oldDir, oldFiles[i]) : null;
    const newFile = newFiles[i] ? path.join(newDir, newFiles[i]) : null;

    if (!oldFile && newFile) {
      changes.push({ page: pageNum, status: 'added', file: newFile });
    } else if (oldFile && !newFile) {
      changes.push({ page: pageNum, status: 'removed', file: oldFile });
    } else if (oldFile && newFile) {
      const oldStat = fs.statSync(oldFile);
      const newStat = fs.statSync(newFile);
      const sizeDiff = Math.abs(oldStat.size - newStat.size);

      // If byte size changes significantly, typography or content moved
      if (sizeDiff > 500) {
        changes.push({
          page: pageNum,
          status: 'modified',
          oldFile,
          newFile,
          sizeDiffBytes: sizeDiff,
        });
      } else {
        changes.push({ page: pageNum, status: 'identical', file: newFile });
      }
    }
  }

  return {
    oldPageCount: oldFiles.length,
    newPageCount: newFiles.length,
    pageCountDelta: newFiles.length - oldFiles.length,
    changes,
  };
}

function diffPdfs(oldPdfPath, newPdfPath, tempDir = '/tmp/latex-craft-diff') {
  fs.mkdirSync(tempDir, { recursive: true });
  const oldPreviewDir = path.join(tempDir, 'old');
  const newPreviewDir = path.join(tempDir, 'new');

  renderPdfPages(oldPdfPath, { outdir: oldPreviewDir, dpi: 100 });
  renderPdfPages(newPdfPath, { outdir: newPreviewDir, dpi: 100 });

  return compareImageDirs(oldPreviewDir, newPreviewDir);
}

module.exports = { compareImageDirs, diffPdfs };
