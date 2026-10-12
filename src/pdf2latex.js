/**
 * PDF to LaTeX Extraction & Reconstruction Helper for latex-craft
 * Extracts layout-aware text via pdftotext and page images via pdftoppm
 * so multimodal AI agents can reconstruct exact math, tables, and sections.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { renderPdfPages, getPdfInfo } = require('./renderer.js');

function convertPdfToLatexWorkspace(pdfPath, options = {}) {
  const resolvedPdf = path.resolve(pdfPath);
  if (!fs.existsSync(resolvedPdf)) {
    throw new Error(`PDF file not found: ${resolvedPdf}`);
  }

  const baseName = path.basename(resolvedPdf, path.extname(resolvedPdf));
  const outDir = path.resolve(options.outdir || path.join(path.dirname(resolvedPdf), `${baseName}_extracted`));
  fs.mkdirSync(outDir, { recursive: true });

  // 1. Extract layout-preserved text
  const txtPath = path.join(outDir, `${baseName}_raw.txt`);
  try {
    execSync(`pdftotext -layout "${resolvedPdf}" "${txtPath}"`, { stdio: 'pipe' });
  } catch (err) {
    throw new Error(`Failed to extract text from PDF: ${err.message}`);
  }

  // 2. Render high-resolution page images for multimodal AI inspection
  const imageDir = path.join(outDir, 'pages');
  const rendered = renderPdfPages(resolvedPdf, {
    dpi: options.dpi || 150,
    outdir: imageDir,
  });

  // 3. Read raw text and create an initial scaffolded LaTeX file
  const rawText = fs.readFileSync(txtPath, 'utf-8');
  const info = getPdfInfo(resolvedPdf);

  const texPath = path.join(outDir, `${baseName}.tex`);
  const escapedText = rawText
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([%$&#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');

  const scaffoldContent = `% ==============================================================================
% Extracted LaTeX Scaffold for: ${baseName}.pdf
% Total Pages: ${info.pageCount || rendered.count}
% Dimensions:  ${info['Page size'] || 'Unknown'}
%
% AI RECONSTRUCTION INSTRUCTIONS:
% 1. Review the rendered page images in ./pages/page-*.png for exact formulas, tables, and layout.
% 2. Clean up sections, equations, and citations below into proper LaTeX environments.
% ==============================================================================

\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{hyperref}

\\title{${info.Title || baseName.replace(/_/g, ' ')}}
\\author{${info.Author || 'Extracted Document'}}
\\date{\\today}

\\begin{document}
\\maketitle

% --- EXTRACTED TEXT CONTENT (REFINE SECTIONS & MATH FROM ./pages/) ---

${escapedText}

\\end{document}
`;

  fs.writeFileSync(texPath, scaffoldContent, 'utf-8');

  return {
    directory: outDir,
    texPath,
    txtPath,
    pageImages: rendered.images,
    pageCount: rendered.count,
  };
}

module.exports = { convertPdfToLatexWorkspace };
