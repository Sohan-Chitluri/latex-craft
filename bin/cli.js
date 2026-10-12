#!/usr/bin/env node

/**
 * CLI Entrypoint for latex-craft
 */

const { compileLatex } = require('../src/compiler.js');
const { renderPdfPages, getPdfInfo } = require('../src/renderer.js');
const { resolveCitation } = require('../src/bibtex.js');
const { convertWordToLatex } = require('../src/converter.js');
const { convertPdfToLatexWorkspace } = require('../src/pdf2latex.js');
const { scaffoldTemplate, listTemplates, saveCustomTemplate } = require('../src/templates.js');
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

  convert-pdf <file.pdf>         Extract layout text & page images into a LaTeX workspace
    --outdir <dir>               Target extraction directory (default: <basename>_extracted)
    --dpi <number>               Resolution DPI for page images (default: 150)

  init <template>                Scaffold an official or custom template
    --outdir <dir>               Target directory (default: ./)

  list-templates                 List all built-in and saved custom templates

  save-template <name>           Save current project or document as a reusable custom template
    --path <dir_or_file>         Directory or file to save (default: ./)
    --desc <text>                Optional description of the template

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

    case 'convert-pdf': {
      const pdf = subArgs[0];
      if (!pdf) {
        console.error('Error: Provide a .pdf file: latex-craft convert-pdf <file.pdf>');
        process.exit(1);
      }
      console.log(`Extracting layout and pages from: ${pdf}...`);
      const res = convertPdfToLatexWorkspace(pdf, {
        outdir: getOpt('--outdir'),
        dpi: parseInt(getOpt('--dpi', '150'), 10),
      });
      console.log(`✓ Extracted LaTeX workspace successfully!`);
      console.log(`  Directory:    ${res.directory}`);
      console.log(`  LaTeX Draft:  ${res.texPath}`);
      console.log(`  Raw Text:     ${res.txtPath}`);
      console.log(`  Page Images:  ${res.pageImages.length} image(s) in ${res.directory}/pages`);
      console.log(`\nNext: Review page images and refine formulas/sections in ${res.texPath}.`);
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

    case 'list-templates': {
      const { builtin, custom } = listTemplates();
      console.log(`\n📚 Available LaTeX Templates:\n`);
      console.log(`  Built-in Templates (${builtin.length}):`);
      builtin.forEach(t => console.log(`    • ${t}`));
      console.log(`\n  User Saved Templates (${custom.length}):`);
      if (custom.length === 0) {
        console.log(`    (None saved yet. Run 'latex-craft save-template <name>' to save your own!)`);
      } else {
        custom.forEach(t => console.log(`    • ${t}`));
      }
      console.log('');
      break;
    }

    case 'save-template': {
      const name = subArgs[0];
      if (!name) {
        console.error('Error: Provide a template name: latex-craft save-template <name>');
        process.exit(1);
      }
      const source = getOpt('--path', process.cwd());
      const desc = getOpt('--desc', '');
      const res = saveCustomTemplate(name, source, desc);
      console.log(`✓ Custom template '${res.name}' saved successfully!`);
      console.log(`  Saved to: ${res.directory}`);
      console.log(`  Files:    ${res.savedFiles.join(', ')}`);
      console.log(`\nYou can now scaffold this template anytime with:`);
      console.log(`  latex-craft init ${res.name} --outdir ./my-new-project\n`);
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
