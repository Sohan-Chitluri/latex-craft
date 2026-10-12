/**
 * Compiler & Smart Diagnostics + Overflow Linter for latex-craft
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getPdfInfo, renderPdfPages } = require('./renderer.js');

function parseCompilationErrors(rawOutput) {
  const errorLines = [];
  const lines = rawOutput.split('\n');
  let capturingContext = false;
  let contextCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('error:') || line.startsWith('! ') || line.match(/^l\.\d+/)) {
      errorLines.push(line);
      capturingContext = true;
      contextCount = 0;
    } else if (capturingContext) {
      if (contextCount < 3 && line.trim().length > 0) {
        errorLines.push('  ' + line);
        contextCount++;
      } else if (contextCount >= 3) {
        capturingContext = false;
      }
    }
  }

  return errorLines;
}

function lintOverflowWarnings(rawOutput) {
  const overflows = [];
  const lines = rawOutput.split('\n');

  for (const line of lines) {
    if (line.includes('Overfull \\hbox')) {
      // E.g. Overfull \hbox (14.28319pt too wide) in paragraph at lines 34--41
      const match = line.match(/Overfull \\hbox \(([^)]+) too wide\) in [^a-zA-Z]*lines? (\d+)(?:--(\d+))?/i);
      if (match) {
        overflows.push({
          ptTooWide: match[1],
          startLine: match[2],
          endLine: match[3] || match[2],
          raw: line.trim(),
          recommendation: 'Equation, table, or code snippet overflows column width. Use \\begin{split}, \\begin{multline}, or scale down graphic/table.',
        });
      } else {
        overflows.push({ raw: line.trim() });
      }
    }
  }

  return overflows;
}

function compileLatex(texPath, options = {}) {
  const resolvedTex = path.resolve(texPath);
  if (!fs.existsSync(resolvedTex)) {
    throw new Error(`File not found: ${resolvedTex}`);
  }

  const outDir = path.resolve(options.outdir || path.dirname(resolvedTex));
  const renderPreviews = options.render !== false;
  const dpi = options.dpi || 150;

  const tectonicArgs = ['--outdir', outDir, '--keep-logs', resolvedTex];
  const result = spawnSync('tectonic', tectonicArgs, { encoding: 'utf-8' });

  const combinedOutput = (result.stdout || '') + '\n' + (result.stderr || '');

  if (result.status !== 0) {
    const diagnostics = parseCompilationErrors(combinedOutput);
    return {
      success: false,
      exitCode: result.status,
      errors: diagnostics.length > 0 ? diagnostics : [combinedOutput.trim()],
      rawOutput: combinedOutput,
    };
  }

  const baseName = path.basename(resolvedTex, path.extname(resolvedTex));
  const pdfPath = path.join(outDir, `${baseName}.pdf`);
  const logPath = path.join(outDir, `${baseName}.log`);

  let logContent = combinedOutput;
  if (fs.existsSync(logPath)) {
    try {
      logContent += '\n' + fs.readFileSync(logPath, 'utf-8');
    } catch (e) {}
  }

  const overflowWarnings = lintOverflowWarnings(logContent);

  let info = {};
  try {
    info = getPdfInfo(pdfPath);
  } catch (e) {}

  let previews = null;
  if (renderPreviews) {
    previews = renderPdfPages(pdfPath, {
      dpi,
      outdir: path.join(outDir, 'previews'),
    });
  }

  return {
    success: true,
    pdfPath,
    pageCount: info.pageCount || (previews ? previews.count : 1),
    dimensions: info['Page size'] || 'Unknown',
    previews: previews ? previews.images : [],
    warnings: overflowWarnings,
  };
}

module.exports = { compileLatex, parseCompilationErrors, lintOverflowWarnings };
