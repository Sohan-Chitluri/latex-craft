# latex-craft 🚀

> **Lightweight LaTeX compiler, visual QA reviewer, and Model Context Protocol (MCP) server for AI agents.**

`latex-craft` enables developers and AI agents to compile, visually review, format, and debug LaTeX documents with **zero multi-gigabyte TeX Live bloat**. It bundles proven templates, auto-fetches real citations from DOIs and arXiv, lints column overflows, and exposes native tools for AI agents over MCP.

---

## Features

* 🩺 **Built-in Doctor**: `npx latex-craft doctor` detects your OS and verifies native dependencies with one-click install commands.
* ⚡ **Sub-Second Compiles**: Powered by **Tectonic**, downloading packages from CTAN on-demand.
* 👁️ **Visual Review Engine**: Rasterizes PDF pages into crisp PNGs with `pdftoppm` so multimodal AI can inspect typography, margins, and page budgets.
* ⚠️ **Smart Column Overflow Linter**: Automatically catches `Overfull \hbox` column breaches (e.g. in two-column IEEE papers) and recommends multi-line split fixes.
* 📚 **Live Citation Resolver**: `latex-craft cite <doi | arxiv-id>` pulls official publisher BibTeX entries directly from CrossRef or arXiv APIs and appends them to `references.bib`.
* 🔍 **Visual Page Diff**: `latex-craft diff <old.pdf> <new.pdf>` detects layout shifts and page budget changes between iterations.
* 📄 **Word to LaTeX**: Converts Word `.docx` to LaTeX via Pandoc while extracting embedded media figures.
* 📦 **Bundled Offline Templates**:
  * `ieee`: Official IEEEtran conference & transactions
  * `springer`: Official Springer LNCS (includes `llncs.cls` and `splncs04.bst`)
  * `patent`: USPTO/WIPO specification with line numbers and claims
  * `resume`: Strict 1-page modern resume
  * `article`: Standard academic technical report

---

## Quick Start (via `npx`)

No permanent installation is required:

```bash
# 1. Verify your environment
npx latex-craft doctor

# 2. Scaffold a template
npx latex-craft init ieee

# 3. Compile and generate page PNG previews
npx latex-craft compile paper_ieee.tex

# 4. Fetch a BibTeX citation
npx latex-craft cite 2301.12345 --bib references.bib

# 5. Convert a Word document
npx latex-craft convert draft.docx --output draft.tex
```

---

## AI Agent Integration (MCP Server)

Any MCP-compatible AI harness (Cursor, Claude Desktop, Antigravity, OpenCode) can use `latex-craft` natively:

```json
{
  "mcpServers": {
    "latex-craft": {
      "command": "npx",
      "args": ["-y", "latex-craft", "mcp"]
    }
  }
}
```

### Available MCP Tools for Agents
* `compile_latex`: Compiles `.tex`, lints overflows, and generates page PNG previews.
* `render_pdf_pages`: Converts PDF pages to PNG for visual inspection.
* `resolve_citation`: Resolves DOIs and arXiv IDs to clean BibTeX.
* `inspect_document`: Returns page count and dimensions.
* `convert_word_to_latex`: Converts `.docx` to `.tex`.
* `scaffold_template`: Creates IEEE, Springer, Patent, Resume, or Article templates.
* `diff_documents`: Compares before/after page layouts.
* `check_system_health`: Runs doctor verification.

---

## Prerequisites

* `Node.js >= 18`
* `tectonic`
* `poppler-utils` (`pdftoppm`)
* `pandoc`

See [REQUIREMENTS.md](./REQUIREMENTS.md) for platform-specific installation commands.

---

## License
MIT
