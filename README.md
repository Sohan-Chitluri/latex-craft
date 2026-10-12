# latex-craft 🚀

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Engine: Tectonic](https://img.shields.io/badge/TeX_Engine-Tectonic_0.17+-blue.svg)](https://tectonic-typesetting.github.io/)
[![MCP Ready](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)

**Lightweight LaTeX document engine, visual QA reviewer, reference converter, and Model Context Protocol (MCP) server for AI agents.**

*Compile, visually inspect, debug, and typeset camera-ready documents with zero multi-gigabyte TeX Live bloat.*

</div>

---

## ⚡ Highlights

* 🩺 **Zero-Friction System Doctor**: `latex-craft doctor` inspects your host OS (Linux, macOS, NixOS, Windows) and outputs ready-to-run package manager commands for any missing tools.
* 🚀 **Sub-Second On-Demand Compiles**: Powered by [Tectonic](https://tectonic-typesetting.github.io/), downloading packages directly from CTAN on the fly without a 5GB+ TeX distribution.
* 👁️ **Multimodal Visual QA Previews**: Automatically rasterizes every compiled PDF page into high-resolution PNGs (`pdftoppm`) so multimodal AI agents or humans can inspect typography, figure placement, and line wraps.
* ⚠️ **Column Overflow Linter**: Parses `.log` files for `Overfull \hbox` and column breaches (e.g., in two-column IEEE papers) and suggests multi-line split fixes.
* 📚 **Live Citation Resolver**: `latex-craft cite <doi | arxiv-id>` queries CrossRef or arXiv APIs and appends valid, publisher-grade `@article` entries into `references.bib`.
* 🔄 **Document Ingestion & Adaptation**:
  * **Word to LaTeX**: `latex-craft convert <draft.docx>` converts Word documents to `.tex` and extracts embedded images into an `assets/` folder.
  * **PDF to Layout & Image Workspace**: `latex-craft pdf2latex <reference.pdf>` extracts layout-preserved text and high-res vector figures.
  * **Reference Adapt Engine**: `latex-craft adapt <reference-file> <target-template>` ingests existing documents (`.pdf`, `.docx`, `.md`, `.tex`) and scaffolds a structured target project.
* 🔍 **Visual Layout Diff**: `latex-craft diff <old.pdf> <new.pdf>` renders side-by-side page comparisons and tracks page budget deltas between drafting iterations.
* 💾 **Custom Template Library**: Save and manage your own organizational or lab formats with `latex-craft save-template` and `latex-craft list-templates`.
* 🤖 **Native Model Context Protocol (MCP)**: Exposes 10 structured tools over stdio for Cursor, Claude Desktop, Antigravity, and OpenCode agents.

---

## 📦 Bundled Camera-Ready Templates

`latex-craft` includes 9 pre-configured, tested templates ready to scaffold with `latex-craft init <template>`:

| Template | Format / Class | Description & Key Packages |
| :--- | :--- | :--- |
| **`ieee`** | `IEEEtran.cls` (2-column) | Camera-ready conference/transaction with `amsmath`, `cite`, `booktabs`, `graphicx`. |
| **`springer`** | `llncs.cls` (1-column) | Official Springer LNCS with bundled `llncs.cls` and `splncs04.bst`. |
| **`patent`** | USPTO / WIPO Specification | Line-numbered specification (`lineno`), paragraph numbers (`[0001]`), and statutory claims. |
| **`lab-report`** | Academic Laboratory | Structured experiment layout with `siunitx`, raw observation tables, and error analysis. |
| **`whitepaper`** | Tech Spec / Whitepaper | Modern software architecture document with `tcolorbox` callout boxes and component matrices. |
| **`project-report`** | Engineering Milestone Report | Institutional cover page, Table of Contents, Gantt/milestone tables, and appendices. |
| **`tech-memo`** | Executive Decision Memo | Strict 2-page decision brief with formal header, options matrix, and recommendation. |
| **`resume`** | 1-Page Curriculum Vitae | Clean ATS-friendly single-page resume with tight vertical budget. |
| **`article`** | Clean Academic Report | Single-column technical document with modern typography. |

---

## 🚀 Quick Start

You can run `latex-craft` directly via `npx` or install it globally:

```bash
# Verify your environment and native dependencies
npx latex-craft doctor

# Scaffold an IEEE conference paper
npx latex-craft init ieee --target my-paper
cd my-paper

# Compile the document and generate page PNG previews
npx latex-craft compile paper_ieee.tex

# Fetch a live citation by arXiv ID or DOI and append to references.bib
npx latex-craft cite 1706.03762 --bib references.bib

# Convert a legacy Word draft into LaTeX with extracted images
npx latex-craft convert draft.docx --output draft.tex

# Deconstruct an existing PDF into text layout and figures
npx latex-craft pdf2latex reference.pdf --output ./reference-workspace

# Ingest an old reference doc and adapt it into a fresh lab report
npx latex-craft adapt reference.pdf lab-report --target ./new-lab-report
```

---

## 🛠️ Custom Templates

Create and reuse your own templates across projects:

```bash
# Save an existing .tex file as a reusable template
npx latex-craft save-template my-custom-format ./main.tex

# List all available built-in and user templates
npx latex-craft list-templates

# Scaffold your custom template anywhere
npx latex-craft init my-custom-format --target ./new-project
```

Templates are stored locally in `~/.config/latex-craft/templates/`.

---

## 🤖 AI Agent Integration (Model Context Protocol)

Connect `latex-craft` to **Claude Desktop**, **Cursor**, **Antigravity**, or any MCP host over stdio:

### Configuration (`claude_desktop_config.json` or MCP settings)

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

### Available MCP Tools

| Tool | Purpose |
| :--- | :--- |
| `compile_latex` | Compiles `.tex` files, lints `Overfull \hbox` column breaches, and emits page PNG previews. |
| `render_pdf_pages` | Rasterizes PDF pages to high-resolution PNGs for multimodal vision inspection. |
| `resolve_citation` | Fetches verified BibTeX entries from CrossRef (DOI) or arXiv APIs. |
| `inspect_document` | Extracts page count, dimensions, and metadata via `pdfinfo`. |
| `convert_word_to_latex`| Converts `.docx` to LaTeX and extracts embedded media. |
| `pdf_to_latex_workspace`| Deconstructs PDFs into layout-preserved text and extracted images. |
| `adapt_reference_document`| Ingests reference documents (`.pdf`, `.docx`, `.md`, `.tex`) and scaffolds a target template. |
| `scaffold_template` | Scaffolds any built-in or custom template. |
| `diff_documents` | Compares two PDFs visually and reports page budget deltas. |
| `check_system_health` | Runs host doctor check for native dependencies. |

---

## 📋 Prerequisites & Installation

`latex-craft` uses minimal, blazing-fast native binaries:

* **Node.js** >= 18.0.0
* **Tectonic** (Modern self-contained TeX engine)
* **Poppler Utils** (`pdftoppm`, `pdfinfo`, `pdftotext`)
* **Pandoc** (For Word/Markdown conversions)

Run `npx latex-craft doctor` to check your setup. For complete installation guides across Ubuntu, macOS, NixOS, Fedora, and Arch, see [REQUIREMENTS.md](./REQUIREMENTS.md).

> **Tip for NixOS / Nix users**:
> ```bash
> nix-env -iA nixpkgs.tectonic nixpkgs.poppler_utils nixpkgs.pandoc
> ```

---

## 📄 License

MIT © [Sohan Chitluri](https://github.com/Sohan-Chitluri) & Contributors
