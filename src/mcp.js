/**
 * Model Context Protocol (MCP) Server for latex-craft
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { compileLatex } = require('./compiler.js');
const { renderPdfPages, getPdfInfo } = require('./renderer.js');
const { resolveCitation } = require('./bibtex.js');
const { convertWordToLatex } = require('./converter.js');
const { convertPdfToLatexWorkspace } = require('./pdf2latex.js');
const { scaffoldTemplate, listTemplates, saveCustomTemplate } = require('./templates.js');
const { runDoctor } = require('./doctor.js');
const { diffPdfs } = require('./diff.js');

const server = new Server(
  {
    name: 'latex-craft',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'compile_latex',
        description: 'Compiles a LaTeX (.tex) document to PDF using Tectonic, lints for column overflows (Overfull \\hbox), and automatically generates page PNG previews for visual inspection.',
        inputSchema: {
          type: 'object',
          properties: {
            tex_path: {
              type: 'string',
              description: 'Path to the .tex file to compile.',
            },
            render_previews: {
              type: 'boolean',
              description: 'Whether to render page PNG previews (default: true).',
              default: true,
            },
            dpi: {
              type: 'number',
              description: 'Resolution DPI for preview images (default: 150).',
              default: 150,
            },
            outdir: {
              type: 'string',
              description: 'Target directory for output PDF and previews.',
            },
          },
          required: ['tex_path'],
        },
      },
      {
        name: 'render_pdf_pages',
        description: 'Renders pages of a PDF into high-resolution PNG images for visual layout, margin, and typography review.',
        inputSchema: {
          type: 'object',
          properties: {
            pdf_path: { type: 'string', description: 'Path to PDF file.' },
            dpi: { type: 'number', description: 'Resolution DPI (default: 150).' },
            first_page: { type: 'number', description: 'Starting page number (1-indexed).' },
            last_page: { type: 'number', description: 'Ending page number (1-indexed).' },
            outdir: { type: 'string', description: 'Output directory for images.' },
          },
          required: ['pdf_path'],
        },
      },
      {
        name: 'resolve_citation',
        description: 'Fetches official publisher BibTeX citations from DOIs (CrossRef) or arXiv IDs and optionally appends to a .bib file.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'DOI (e.g. 10.1145/3377811.3380387) or arXiv ID (e.g. 2301.12345).',
            },
            bib_path: {
              type: 'string',
              description: 'Optional path to references.bib to append the citation to.',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'inspect_document',
        description: 'Extracts total page count, dimensions, paper size, and metadata from a PDF.',
        inputSchema: {
          type: 'object',
          properties: {
            pdf_path: { type: 'string', description: 'Path to the PDF file.' },
          },
          required: ['pdf_path'],
        },
      },
      {
        name: 'convert_word_to_latex',
        description: 'Converts a Microsoft Word (.docx) file into LaTeX using Pandoc, extracting math and images.',
        inputSchema: {
          type: 'object',
          properties: {
            docx_path: { type: 'string', description: 'Path to .docx file.' },
            output_tex: { type: 'string', description: 'Optional target .tex file path.' },
            media_dir: { type: 'string', description: 'Directory to place extracted figures (default: ./figures).' },
          },
          required: ['docx_path'],
        },
      },
      {
        name: 'convert_pdf_to_latex',
        description: 'Extracts layout-preserved text and high-res page images from a PDF into a LaTeX workspace for multimodal AI reconstruction.',
        inputSchema: {
          type: 'object',
          properties: {
            pdf_path: { type: 'string', description: 'Path to .pdf file.' },
            outdir: { type: 'string', description: 'Optional target output directory.' },
            dpi: { type: 'number', description: 'Resolution DPI for page images (default: 150).' },
          },
          required: ['pdf_path'],
        },
      },
      {
        name: 'scaffold_template',
        description: 'Scaffolds an official or user-saved custom paper template (e.g. ieee, springer, patent, lab-report, whitepaper, project-report, tech-memo, resume, article, or any custom template).',
        inputSchema: {
          type: 'object',
          properties: {
            template_type: {
              type: 'string',
              description: 'Template name to create (run list_templates to see all built-in and user templates).',
            },
            target_dir: {
              type: 'string',
              description: 'Destination directory.',
            },
          },
          required: ['template_type', 'target_dir'],
        },
      },
      {
        name: 'list_templates',
        description: 'Lists all available built-in publication templates and user-saved custom templates.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'save_custom_template',
        description: 'Saves the current document or directory as a reusable custom template in the user library.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Unique alphanumeric identifier for the template.' },
            source_path: { type: 'string', description: 'Directory or .tex file to save as a template (default: current directory).' },
            description: { type: 'string', description: 'Optional description of the template.' },
          },
          required: ['name'],
        },
      },
      {
        name: 'diff_documents',
        description: 'Visually compares two PDF versions to detect page budget changes and layout shifts.',
        inputSchema: {
          type: 'object',
          properties: {
            old_pdf: { type: 'string', description: 'Path to previous PDF.' },
            new_pdf: { type: 'string', description: 'Path to newly compiled PDF.' },
          },
          required: ['old_pdf', 'new_pdf'],
        },
      },
      {
        name: 'check_system_health',
        description: 'Runs doctor check to verify that tectonic, poppler-utils, and pandoc are installed.',
        inputSchema: { type: 'object', properties: {} },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'compile_latex') {
      const res = compileLatex(args.tex_path, {
        render: args.render_previews !== false,
        dpi: args.dpi || 150,
        outdir: args.outdir,
      });

      if (!res.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Compilation Failed (Code ${res.exitCode}):\n\n${res.errors.join('\n')}\n\nPlease correct the LaTeX source code line(s) reported above.`,
            },
          ],
          isError: true,
        };
      }

      let text = `✓ Compilation Succeeded!\nPDF: ${res.pdfPath}\nTotal Pages: ${res.pageCount}\nDimensions: ${res.dimensions}`;

      if (res.warnings && res.warnings.length > 0) {
        text += `\n\n⚠️ Column Overflow Lints (${res.warnings.length}):\n` +
          res.warnings.map(w => `  - Lines ${w.startLine}-${w.endLine}: ${w.ptTooWide} too wide. ${w.recommendation}`).join('\n');
      }

      if (res.previews && res.previews.length > 0) {
        text += `\n\nPage Previews Generated (${res.previews.length}):\n` + res.previews.map(p => `  - ${p}`).join('\n');
      }

      return { content: [{ type: 'text', text }] };
    }

    if (name === 'render_pdf_pages') {
      const res = renderPdfPages(args.pdf_path, {
        dpi: args.dpi || 150,
        firstPage: args.first_page,
        lastPage: args.last_page,
        outdir: args.outdir,
      });
      return {
        content: [
          {
            type: 'text',
            text: `Rendered ${res.count} page(s) to: ${res.outdir}\n` + res.images.map(img => `  - ${img}`).join('\n'),
          },
        ],
      };
    }

    if (name === 'resolve_citation') {
      const bibtex = await resolveCitation(args.query, args.bib_path);
      return {
        content: [
          {
            type: 'text',
            text: `Resolved BibTeX Entry:\n\n${bibtex}${args.bib_path ? `\n\n(Appended to ${args.bib_path})` : ''}`,
          },
        ],
      };
    }

    if (name === 'inspect_document') {
      const info = getPdfInfo(args.pdf_path);
      return { content: [{ type: 'text', text: JSON.stringify(info, null, 2) }] };
    }

    if (name === 'convert_word_to_latex') {
      const res = convertWordToLatex(args.docx_path, {
        outputTex: args.output_tex,
        mediaDir: args.media_dir,
      });
      return {
        content: [
          {
            type: 'text',
            text: `✓ Word document converted successfully!\nLaTeX Source: ${res.texPath}\nExtracted Media: ${res.mediaDir}`,
          },
        ],
      };
    }

    if (name === 'convert_pdf_to_latex') {
      const res = convertPdfToLatexWorkspace(args.pdf_path, {
        outdir: args.outdir,
        dpi: args.dpi || 150,
      });
      return {
        content: [
          {
            type: 'text',
            text: `✓ Extracted PDF to LaTeX Workspace!\nDirectory:   ${res.directory}\nLaTeX Draft: ${res.texPath}\nRaw Text:    ${res.txtPath}\nPage Images: ${res.pageImages.length} image(s) in ${res.directory}/pages`,
          },
        ],
      };
    }

    if (name === 'scaffold_template') {
      const res = scaffoldTemplate(args.template_type, args.target_dir);
      return {
        content: [
          {
            type: 'text',
            text: `✓ Scaffolded '${res.template}' template into: ${res.directory}\n` +
              res.filesCreated.map(f => `  - ${f}`).join('\n'),
          },
        ],
      };
    }

    if (name === 'list_templates') {
      const list = listTemplates();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(list, null, 2),
          },
        ],
      };
    }

    if (name === 'save_custom_template') {
      const res = saveCustomTemplate(args.name, args.source_path, args.description);
      return {
        content: [
          {
            type: 'text',
            text: `✓ Saved custom template '${res.name}'!\nDirectory: ${res.directory}\nFiles: ${res.savedFiles.join(', ')}`,
          },
        ],
      };
    }

    if (name === 'diff_documents') {
      const res = diffPdfs(args.old_pdf, args.new_pdf);
      return {
        content: [
          {
            type: 'text',
            text: `Document Diff Summary:\n` +
              `Old Pages: ${res.oldPageCount} | New Pages: ${res.newPageCount} (Delta: ${res.pageCountDelta >= 0 ? '+' : ''}${res.pageCountDelta})\n\n` +
              `Page Details:\n` +
              res.changes.map(c => `  - Page ${c.page}: ${c.status.toUpperCase()}${c.sizeDiffBytes ? ` (~${c.sizeDiffBytes} bytes shift)` : ''}`).join('\n'),
          },
        ],
      };
    }

    if (name === 'check_system_health') {
      const health = runDoctor();
      return { content: [{ type: 'text', text: JSON.stringify(health, null, 2) }] };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

async function startMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

module.exports = { startMcpServer };
