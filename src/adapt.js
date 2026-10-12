/**
 * Reference Document Adapter for latex-craft
 * Ingests an existing reference document (PDF, Word, Markdown, or LaTeX),
 * extracts its content & figures, and scaffolds a new report in the target template format.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { scaffoldTemplate } = require('./templates.js');
const { convertPdfToLatexWorkspace } = require('./pdf2latex.js');
const { convertWordToLatex } = require('./converter.js');

function adaptReferenceDocument(referencePath, options = {}) {
  const resolvedRef = path.resolve(referencePath);
  if (!fs.existsSync(resolvedRef)) {
    throw new Error(`Reference file not found: ${resolvedRef}`);
  }

  const templateType = options.template || 'article';
  const outDir = path.resolve(options.outdir || path.join(path.dirname(resolvedRef), 'new_report'));
  fs.mkdirSync(outDir, { recursive: true });

  const ext = path.extname(resolvedRef).toLowerCase();
  const refDataDir = path.join(outDir, 'reference_data');
  fs.mkdirSync(refDataDir, { recursive: true });

  // 1. Scaffold target template in outDir
  const scaffold = scaffoldTemplate(templateType, outDir);

  let extractedSummary = '';

  // 2. Extract content from reference document based on file type
  if (ext === '.pdf') {
    const pdfWorkspace = convertPdfToLatexWorkspace(resolvedRef, {
      outdir: refDataDir,
      dpi: options.dpi || 150,
    });
    extractedSummary = `Extracted PDF text and ${pdfWorkspace.pageImages.length} page image(s) to ./reference_data/`;
  } else if (ext === '.docx') {
    const docxResult = convertWordToLatex(resolvedRef, {
      outputTex: path.join(refDataDir, 'source.tex'),
      mediaDir: path.join(outDir, 'figures'),
    });
    extractedSummary = `Converted Word document text and extracted figures to ./figures/`;
  } else if (['.tex', '.md', '.txt', '.org'].includes(ext)) {
    const destRef = path.join(refDataDir, path.basename(resolvedRef));
    fs.copyFileSync(resolvedRef, destRef);
    extractedSummary = `Copied reference text file to ./reference_data/${path.basename(resolvedRef)}`;
  } else {
    const destRef = path.join(refDataDir, path.basename(resolvedRef));
    fs.copyFileSync(resolvedRef, destRef);
    extractedSummary = `Copied reference file to ./reference_data/`;
  }

  // 3. Create ADAPTATION_GUIDE.md in the project
  const guideContent = `# Reference Document Adaptation Guide

- **Target Template**: \`${templateType}\`
- **Original Reference Document**: \`${resolvedRef}\`
- **Reference Assets**: Stored in \`./reference_data/\`

## Instructions for AI Agent & Author:
1. Inspect the extracted source in \`./reference_data/\` for key findings, formulas, and raw data.
2. If figures were extracted, they are in \`./figures/\` or \`./reference_data/pages/\`.
3. Synthesize the new content into \`main.tex\` adhering strictly to the \`${templateType}\` structure.
4. Compile and review visually using:
   \`latex-craft compile main.tex --render\`
`;

  fs.writeFileSync(path.join(outDir, 'ADAPTATION_GUIDE.md'), guideContent, 'utf-8');

  return {
    template: templateType,
    directory: outDir,
    referenceFile: resolvedRef,
    summary: extractedSummary,
    scaffoldFiles: scaffold.filesCreated,
  };
}

module.exports = { adaptReferenceDocument };
