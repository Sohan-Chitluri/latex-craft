#!/usr/bin/env node

/**
 * CLI Entrypoint for latex-craft
 */

const { compileLatex } = require('../src/compiler.js');
const { renderPdfPages, getPdfInfo } = require('../src/renderer.js');
const { resolveCitation } = require('../src/bibtex.js');
const { convertWordToLatex } = require('../src/converter.js');
const { scaffoldTemplate, listTemplates } = require('../src/templates.js');
const { runDoctor } = require('../src/doctor.js');
const { diffPdfs } = require('../src/diff.js');
const { startMcpServer } = require('../src/mcp.js');

function printHelp() {
  console.log(`
Usage: latex-craft <command> [options]

Commands:
  doctor                         Check system dependencies (tectonic, poppler, pandoc)
  mcp                            Start the Model Context Protocol (MCP) server over stdio

  compile <file.tex>             Compile LaTeX to PDF with smart diagnostics & overflow lints
    --no-render                  Skip generating page PNG preview images
    --dpi <number>               Resolution DPI for previews (default: 150)
    --outdir <dir>               Target output directory

  render <file.pdf>              Rasterize PDF pages into PNG images for visual QA
    --dpi <number>               Resolution DPI (default: 150)
    --outdir <dir>               Target output directory (default: ./previews)

  cite <doi-or-arxiv-id>         Fetch official BibTeX citation from CrossRef or arXiv
    --bib <file.bib>             Append citation to specified .bib file

  diff <old.pdf> <new.pdf>       Visually compare two PDF compilations for layout shifts

  convert <file.docx>            Convert Word document (.docx) to LaTeX and extract figures
    --output <file.tex>          Target LaTeX output path
    --media-dir <dir>            Figures extraction directory (default: ./figures)

  init <template>                Scaffold an official template (${listTemplates().join(', ')})
    --outdir <dir>               Target directory (default: ./)

  info <file.pdf>                Inspect page count, dimensions, and metadata of a PDF

  help                           Display this help manual
`);
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h') || args[0] === 'help') {
  printHelp();
  process.exit(0);
}

const command = args[0];
const subArgs = args.slice(1);

function getOpt(flag, defaultValue = null) {
  const idx = subArgs.indexOf(flag);
  if (idx !== -1 && idx + 1 < subArgs.length) return subArgs[idx + 1];
  return defaultValue;
}

function hasOpt(flag) {
  return subArgs.includes(flag);
}

async function main() {
  switch (command) {
    case 'doctor': {
      runDoctor();
      break;
    }

    case 'mcp': {
      await startMcpServer();
      break;
    }

    case 'compile': {
      const file = subArgs[0];
      if (!file) {
        console.error('Error: Please provide a .tex file to compile.');
        process.exit(1);
      }
      console.log(`Compiling: ${file}...`);
      const res = compileLatex(file, {
        render: !hasOpt('--no-render'),
        dpi: parseInt(getOpt('--dpi', '150'), 10),
        outdir: getOpt('--outdir'),
      });

      if (!res.success) {
        console.error(`\n❌ Compilation Failed (Exit Code ${res.exitCode}):`);
        res.errors.forEach(e => console.error(e));
        process.exit(1);
      }

      console.log(`\n✓ Compilation Succeeded!`);
      console.log(`  PDF Output:  ${res.pdfPath}`);
      console.log(`  Total Pages: ${res.pageCount}`);
      console.log(`  Dimensions:  ${res.dimensions}`);

      if (res.warnings && res.warnings.length > 0) {
        console.log(`\n⚠️  Column Overflow Lints (${res.warnings.length}):`);
        res.warnings.forEach(w => console.log(`  - Lines ${w.startLine}-${w.endLine}: ${w.ptTooWide} too wide. ${w.recommendation}`));
      }

      if (res.previews && res.previews.length > 0) {
        console.log(`\nPage Previews (${res.previews.length}):`);
        res.previews.forEach(p => console.log(`  - ${p}`));
      }
      break;
    }

    case 'render': {
      const file = subArgs[0];
      if (!file) {
        console.error('Error: Please provide a .pdf file.');
        process.exit(1);
      }
      const res = renderPdfPages(file, {
        dpi: parseInt(getOpt('--dpi', '150'), 10),
        outdir: getOpt('--outdir'),
      });
      console.log(`✓ Rendered ${res.count} page(s) to: ${res.outdir}`);
      res.images.forEach(img => console.log(`  - ${img}`));
      break;
    }

    case 'cite': {
      const query = subArgs[0];
      if (!query) {
        console.error('Error: Provide a DOI (e.g. 10.1145/...) or arXiv ID (e.g. 2301.12345).');
        process.exit(1);
      }
      console.log(`Resolving citation for: ${query}...`);
      const bibPath = getOpt('--bib');
      const bibtex = await resolveCitation(query, bibPath);
      console.log(`\n${bibtex}\n`);
      if (bibPath) console.log(`✓ Appended to: ${bibPath}`);
      break;
    }

    case 'diff': {
      const oldPdf = subArgs[0];
      const newPdf = subArgs[1];
      if (!oldPdf || !newPdf) {
        console.error('Error: Provide two PDF files: latex-craft diff <old.pdf> <new.pdf>');
        process.exit(1);
      }
      console.log(`Comparing ${oldPdf} vs ${newPdf}...`);
      const res = diffPdfs(oldPdf, newPdf);
      console.log(`\nDiff Summary:`);
      console.log(`  Pages: ${res.oldPageCount} -> ${res.newPageCount} (Delta: ${res.pageCountDelta >= 0 ? '+' : ''}${res.pageCountDelta})`);
      res.changes.forEach(c => console.log(`  - Page ${c.page}: ${c.status.toUpperCase()}${c.sizeDiffBytes ? ` (~${c.sizeDiffBytes}B shift)` : ''}`));
      break;
    }

    case 'convert': {
      const docx = subArgs[0];
      if (!docx) {
        console.error('Error: Provide a .docx file.');
        process.exit(1);
      }
      const res = convertWordToLatex(docx, {
        outputTex: getOpt('--output'),
        mediaDir: getOpt('--media-dir'),
      });
      console.log(`✓ Converted successfully!`);
      console.log(`  LaTeX:  ${res.texPath}`);
      console.log(`  Media:  ${res.mediaDir}`);
      break;
    }

    case 'init': {
      const type = subArgs[0] || 'article';
      const outdir = getOpt('--outdir', process.cwd());
      const res = scaffoldTemplate(type, outdir);
      console.log(`✓ Scaffolded '${res.template}' template into: ${res.directory}`);
      res.filesCreated.forEach(f => console.log(`  - ${f}`));
      break;
    }

    case 'info': {
      const file = subArgs[0];
      if (!file) {
        console.error('Error: Provide a .pdf file.');
        process.exit(1);
      }
      const info = getPdfInfo(file);
      console.log(JSON.stringify(info, null, 2));
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
