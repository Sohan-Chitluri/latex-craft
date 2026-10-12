/**
 * Main export for latex-craft library
 */

const { compileLatex, parseCompilationErrors, lintOverflowWarnings } = require('./compiler.js');
const { renderPdfPages, getPdfInfo } = require('./renderer.js');
const { resolveCitation, fetchDoiBibtex, fetchArxivBibtex } = require('./bibtex.js');
const { convertWordToLatex } = require('./converter.js');
const { convertPdfToLatexWorkspace } = require('./pdf2latex.js');
const { adaptReferenceDocument } = require('./adapt.js');
const { scaffoldTemplate, listTemplates } = require('./templates.js');
const { runDoctor, detectOS } = require('./doctor.js');
const { diffPdfs, compareImageDirs } = require('./diff.js');
const { startMcpServer } = require('./mcp.js');

module.exports = {
  compileLatex,
  parseCompilationErrors,
  lintOverflowWarnings,
  renderPdfPages,
  getPdfInfo,
  resolveCitation,
  fetchDoiBibtex,
  fetchArxivBibtex,
  convertWordToLatex,
  convertPdfToLatexWorkspace,
  adaptReferenceDocument,
  scaffoldTemplate,
  listTemplates,
  runDoctor,
  detectOS,
  diffPdfs,
  compareImageDirs,
  startMcpServer,
};
