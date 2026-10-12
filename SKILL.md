---
name: latex
description: >-
  Interactive LaTeX authoring, template wizard, repository report synthesizer,
  and multimodal review workflow. Use whenever the user types `/latex` or requests
  to create, convert, draft, or review LaTeX documents (IEEE conference/journal,
  Springer LNCS, Patent application, Resume/CV, or technical report). Initiates an
  interactive MCQ questionnaire, can pull repository architecture via Graphify/codebase
  analysis, and runs an iterative visual review loop.
---

# LaTeX Document Wizard & Repository-Aware Review Workflow

This skill guides the agent through an intelligent, closed-loop LaTeX workflow:
1. **Interactive Questionnaire (MCQ)**: Uses `ask_question` to determine document source, publication format, and page budget.
2. **Repository Knowledge Extraction**: When building reports in a project folder, leverages **Graphify** (`graphify-out/` or `graphify query`) and codebase analysis to extract authentic architecture, algorithms, and modules.
3. **Template Integrity & Adaptation**: Enforces official publication standards without breaking class geometry.
4. **Compilation & Multimodal Visual Review**: Compiles with `tectonic`, renders pages to PNG with `pdftoppm`, and verifies visual layout.
5. **Interactive Page Budget Arbitration**: If the document overflows or underflows, consults the user via `ask_question` rather than making unilateral cuts.

---

## Phase 1: Interactive Questionnaire (MANDATORY FIRST STEP)

When the user enters `/latex` or asks to generate/convert a LaTeX document, **immediately call `ask_question`**:

```json
{
  "questions": [
    {
      "question": "How would you like to build this document?",
      "options": [
        "(Recommended) Create a new document from scratch",
        "Create a new report based on an existing reference document (old report, PDF, Word, or Markdown)",
        "Synthesize report from this repository/codebase (extract architecture, modules, and docs)",
        "Direct 1:1 convert from Word (.docx) or PDF (.pdf)"
      ],
      "is_multi_select": false
    },
    {
      "question": "Which document format or publication standard do you need?",
      "options": [
        "(Recommended) IEEE Conference / Transactions (2-column IEEEtran)",
        "Springer LNCS / Journal (Single-column llncs)",
        "Patent Application Draft (USPTO/WIPO specification with numbered claims)",
        "Engineering / Science Lab Report (lab-report with siunitx, raw data, & error analysis)",
        "Software Architecture Whitepaper / System RFC (whitepaper with callout boxes & API specs)",
        "Formal Project / Capstone Report (project-report with cover page, TOC, & milestones)",
        "Executive Technical Memorandum (tech-memo 2-page decision brief with trade-off matrix)",
        "Professional Resume / Academic CV (Strict 1-2 page budget)",
        "Standard Technical Report / Research Article (clean single-column)",
        "Custom or Saved User Template (or create & save a new custom format)"
      ],
      "is_multi_select": false
    },
    {
      "question": "What is the target page budget / length constraint?",
      "options": [
        "(Recommended) 4 pages (Standard short paper / workshop limit)",
        "6 pages (Standard conference limit)",
        "1 page (Strict single-page resume / executive summary)",
        "No strict limit / full comprehensive draft"
      ],
      "is_multi_select": false
    },
    {
      "question": "Would you like automated visual review & formatting auto-correction?",
      "options": [
        "(Recommended) Fast Edit & Leave (quick compile, no heavy page-by-page vision checks or token overhead)",
        "Full Automated Review & Auto-Correction (multi-page rasterization, multimodal QA, hbox overflow linter, and iterative auto-tuning)"
      ],
      "is_multi_select": false
    }
  ]
}
```

---

## Phase 2: Template Selection & Strict Formatting Rules

### Rule 1: Never Break Official Class Formats
* **No Layout Overrides on Official Classes**:
  Never inject packages that fight official class geometry. Specifically:
  * **DO NOT** use `\usepackage{geometry}` on `IEEEtran` or `llncs` documents. It destroys publisher-mandated margins and causes camera-ready rejection.
  * **DO NOT** arbitrarily rename or delete mandatory sections in official classes:
    * *IEEE/Springer*: `Abstract` $\to$ `Introduction` $\to$ `Related Work` $\to$ `Methodology` $\to$ `Evaluation` $\to$ `Conclusion` $\to$ `References`.
    * *Patents*: `Technical Field` $\to$ `Background` $\to$ `Brief Summary` $\to$ `Brief Description of Drawings` $\to$ `Detailed Description` $\to$ `Claims` $\to$ `Abstract`.

### Rule 2: "Looks Good" vs. "Audience Fit" (Handling Custom/Hybrid Requests)
* Users often love the **IEEE two-column format** because it looks compact and authoritative.
* **However**, if the document is an internal company report, class assignment, or non-IEEE submission, strict IEEE is often too dense for reviewers expecting standard 1-column layouts.
* *Guideline*: If the user wants an "IEEE aesthetic" for a general report, use a clean 2-column `article` class with relaxed line spacing (`11pt`, slightly wider margins and gutters) rather than forcing `IEEEtran.cls`.
* If a custom format is requested (e.g. single-column, 1.5 spacing, IEEE citations), use `article` + `geometry` + `setspace` + `\bibliographystyle{IEEEtran}`. Do not force `IEEEtran.cls` and then try to hack it into single-column.

### Rule 3: Atomic Section-by-Section Protocol for Patent Drafts
* **NEVER attempt one-shot generation for patents**: Full patent applications span 15–50+ pages. Generating the entire document in a single prompt causes token limits, shallow claims, and hallucinated reference numbers.
* **Mandatory Phased Execution**:
  1. **Phase A (Core Claims)**: Draft independent claims first (Method, System, CRM). Verify antecedent basis. Compile and pause for user feedback.
  2. **Phase B (Dependent Claims)**: Draft dependent claims specifying granular fallback positions.
  3. **Phase C (Drawing Map & Numeral Index)**: Define the component dictionary (e.g., 100 system, 102 processor, 104 memory). All description text must strictly adhere to these numbers.
  4. **Phase D (Detailed Description Chunks)**: Draft subsection by subsection (Architecture, Operational Flow, Variations). Compile and review after each chunk.
  5. **Phase E (Specification Shell)**: Complete Brief Description of Drawings, Background, Technical Field, and Abstract.
  6. **Phase F (Audit)**: Verify continuous line numbering (`\linenumbers`), sequential paragraph numbers (`[0001]`), and 150-word Abstract on `\newpage`.

---

## Phase 3: Adapting an Existing Reference Document

If the user selects **"Create a new report based on an existing reference document"**:

### 1. Obtain Reference File Path
* If the user did not specify the file path in the write-in, ask immediately:
  `"Please provide the file path to your reference document (e.g., ./old_paper.pdf, ./draft.docx, or ./notes.md)."`

### 2. Execute Ingestion & Scaffolding
Run the adaptation engine:
```bash
latex-craft adapt "<reference_path>" --template <chosen_template> --outdir ./new_report
```
*(or invoke the MCP tool `adapt_from_reference`)*.
* **For PDFs**: Extracts layout-preserved text and renders page images into `./reference_data/pages/` so formulas, diagrams, and tables can be visually referenced.
* **For Word documents**: Converts text and extracts embedded figures into `./figures/`.
* **For Markdown/LaTeX**: Copies source assets into `./reference_data/`.
* **Scaffolds Target Template**: Places clean `main.tex`, `references.bib`, and required class files into the output directory.

### 3. Synthesize & Author
* Inspect the extracted data in `./reference_data/` (and `./figures/`).
* Populate `main.tex` following the selected template's structure, rules, and page budget.
* Compile and review visually using `tectonic` and `pdftoppm`.

---

## Phase 4: Repository Knowledge Synthesis (Graphify Integration)

If the user selects **"Synthesize report from this repository/codebase"**:

### 1. Check for Graphify Presence
* Check if `graphify-out/graph.json` or `graphify-out/GRAPH_REPORT.md` exists in the project root.
* **If Graphify output is NOT present**:
  Prompt the user with `ask_question`:
  ```json
  {
    "questions": [
      {
        "question": "No Graphify knowledge graph was found for this repository. Would you like to run Graphify to analyze codebase architecture first?",
        "options": [
          "(Recommended) Run Graphify first (builds complete architecture graph & community analysis)",
          "Skip Graphify and proceed with direct file inspection (README, configs, source code)"
        ],
        "is_multi_select": false
      }
    ]
  }
  ```
  * If the user chooses to run Graphify: Trigger `/graphify` on the current directory, then proceed with the generated artifacts.
  * If skipped: Inspect `README.md`, build manifests (`Cargo.toml`, `package.json`, `flake.nix`), and key source files directly.

### 2. Extract Architectural Data
* Query the graph or report to extract:
  * High-centrality "god nodes" (core components and entrypoints).
  * Community clusters (subsystems and module boundaries).
  * Data flows and key pipeline pathways.

### 3. Populate Technical Report Sections
* **System Architecture**: Map extracted modules into clear LaTeX flow diagrams, component tables, or structured descriptions.
* **Methodology / Implementation**: Document actual algorithms, data structures, and APIs found in the code.
* **Evaluation / Performance**: Highlight benchmarks, test suites, or performance metrics present in the repository.

---

## Phase 4: Compilation, Typographic Hygiene & Multimodal Review

### Fast Mode vs. Full Automated Review:
* **If Fast Edit & Leave was selected**:
  1. Compile cleanly with `tectonic document.tex` (or `latex-craft compile document.tex`).
  2. If compilation succeeds without catastrophic errors, stop immediately and present the output `.pdf` and `.tex` to the user.
  3. Do **not** render all pages to PNG, do **not** run vision inspections, and do **not** engage in expensive token-heavy review loops.
* **If Full Automated Review & Auto-Correction was selected**:
  1. **Compile with Tectonic**:
     ```bash
     tectonic document.tex
     ```
     If errors occur, inspect line numbers (`l.XX`) and LaTeX error tokens, fix `.tex`, and re-compile.

  2. **Render Page Images**:
     ```bash
     mkdir -p previews && pdftoppm -png -r 150 document.pdf previews/page
     ```

  3. **Enforce Typographic Hygiene & Auto-Correction**:
     * **No Overflowing Boxes (`Overfull \hbox`)**: Equations, code listings, and URLs must never bleed across column or page margins. Long equations must use `\begin{split}` or `\begin{multline}`; URLs must use `\url{}`.
     * **No Orphan / Widow Headings**: A section header must never be stranded at the bottom of a page or column without at least 2–3 lines of text below it.
     * **Balanced Final Columns**: For two-column layouts (IEEE), the two columns on the final page must be balanced in height (using `\balance` or manual `\vfill\eject`).
     * **Float & Caption Standards**: Table captions go **above** (`\caption` before `tabular`); figure captions go **below** (`\caption` after `includegraphics`). Figures must be anchored cleanly (`[t]` or `[htbp]`).

  4. **Multimodal Visual Inspection**:
     Call `view_file` on `previews/page-1.png`, `page-2.png`, etc., to confirm visual elegance and verify compliance with all typographic rules.

---

## Phase 5: Interactive Page Budget Arbitration

**NEVER silently truncate sections or make aggressive unilateral cuts to force a page budget.**

If the compiled document overflows (e.g. 5 pages instead of the requested 4) or underflows:
**Call `ask_question`** to let the user decide how to adjust:

```json
{
  "questions": [
    {
      "question": "The draft currently occupies 5 pages (target budget was 4 pages). How would you like to handle the length?",
      "options": [
        "(Recommended) Tighten layout (scale figures slightly down, reduce list item padding, compact whitespace)",
        "Condense technical prose (tighten wording in Methodology and Results while keeping all technical facts)",
        "Allow the 5th page (keep current spacing and expand to full 5-page draft)"
      ],
      "is_multi_select": false
    }
  ]
}
```

Follow the user's selected preference and re-compile/review until the target budget is satisfied.

---

## Phase 6: Creating & Saving Custom User Templates

Users can create and persist their own custom document styles to reuse indefinitely across projects:

### 1. Saving an Existing Document as a Template
To snapshot the current project as a reusable template:
```bash
latex-craft save-template <template_name> --path ./ --desc "Description of format"
```
*(or invoke the MCP tool `save_custom_template`).*
* The template files are copied to `~/.config/latex-craft/templates/<template_name>/` alongside a `meta.json` record.

### 2. Designing a New Custom Format from Scratch
If the user selects **"Custom or Saved User Template"** and wants to craft a new design:
1. Clarify parameters using `ask_question`:
   - Single-column vs. Two-column
   - Margins & line spacing (1.0, 1.15, 1.5)
   - Color palette and header/footer styling
2. Generate the `.tex` and `.sty` files.
3. Save it to the user library so it appears in all future `/latex` sessions.

