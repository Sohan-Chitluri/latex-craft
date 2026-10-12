/**
 * BibTeX Citation Resolver for latex-craft
 * Fetches official citations from DOI (CrossRef) and arXiv APIs.
 */

const fs = require('fs');
const path = require('path');

async function fetchDoiBibtex(doi) {
  const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//i, '').replace(/^doi:\s*/i, '').trim();
  const url = `https://doi.org/${cleanDoi}`;

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/x-bibtex; charset=utf-8',
      'User-Agent': 'latex-craft-citation-resolver/1.0',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to resolve DOI ${cleanDoi}: HTTP ${res.status}`);
  }

  const bibtex = await res.text();
  return bibtex.trim();
}

async function fetchArxivBibtex(arxivId) {
  const cleanId = arxivId.replace(/^arxiv:\s*/i, '').replace(/^https?:\/\/arxiv\.org\/abs\//i, '').trim();
  const url = `http://export.arxiv.org/api/query?id_list=${cleanId}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to query arXiv for ID ${cleanId}: HTTP ${res.status}`);
  }

  const xml = await res.text();
  
  // Basic XML parsing for entry fields
  const titleMatch = xml.match(/<title>([^<]+)<\/title>/g);
  const title = titleMatch && titleMatch[1] ? titleMatch[1].replace(/<title>/, '').replace(/<\/title>/, '').replace(/\s+/g, ' ').trim() : 'Unknown Title';

  const authorMatches = [...xml.matchAll(/<name>([^<]+)<\/name>/g)].map(m => m[1].trim());
  const authors = authorMatches.length > 0 ? authorMatches.join(' and ') : 'Unknown Authors';

  const yearMatch = xml.match(/<published>(\d{4})/);
  const year = yearMatch ? yearMatch[1] : new Date().getFullYear();

  const citeKey = cleanId.replace(/[^a-zA-Z0-9]/g, '_');

  return `@article{arxiv_${citeKey},
  title   = {${title}},
  author  = {${authors}},
  journal = {arXiv preprint arXiv:${cleanId}},
  year    = {${year}},
  url     = {https://arxiv.org/abs/${cleanId}}
}`;
}

async function resolveCitation(query, bibFilePath = null) {
  let bibtex = null;
  const trimmed = query.trim();

  if (trimmed.startsWith('10.') || trimmed.includes('doi.org')) {
    bibtex = await fetchDoiBibtex(trimmed);
  } else if (/^\d{4}\.\d{4,5}/.test(trimmed) || trimmed.toLowerCase().startsWith('arxiv:')) {
    bibtex = await fetchArxivBibtex(trimmed);
  } else {
    // If query has DOI pattern inside
    const doiMatch = trimmed.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);
    if (doiMatch) {
      bibtex = await fetchDoiBibtex(doiMatch[0]);
    } else {
      throw new Error(`Unrecognized citation format. Provide a DOI (e.g. 10.1145/...) or arXiv ID (e.g. 2301.12345).`);
    }
  }

  if (bibFilePath) {
    const resolvedPath = path.resolve(bibFilePath);
    fs.appendFileSync(resolvedPath, `\n\n${bibtex}\n`, 'utf-8');
  }

  return bibtex;
}

module.exports = { resolveCitation, fetchDoiBibtex, fetchArxivBibtex };
