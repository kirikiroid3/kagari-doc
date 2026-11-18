// The module Lotus's search dialog loads as "the Pagefind bundle" (`search.outputSubdir` in
// `theme.config.json` names this directory). The real bundle and index are in `/pagefind/`,
// written by the build hook in `astro.config.ts`.
//
// Lotus shows the first section of a page that matches, and Pagefind's excerpts as they are.
// This adapter gives it one result per page instead: the section that matches best, titled
// "page › section", with a plain-text excerpt.
import * as pagefind from '/pagefind/pagefind.js';

const PAGES = 8;
const ENTITIES = { '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'" };

function plain(excerpt) {
  return (excerpt ?? '')
    .replace(/<\/?mark>/g, '')
    .replace(/&(?:lt|gt|amp|quot|#39);/g, (entity) => ENTITIES[entity]);
}

/** The section to show for a page: one whose heading contains the whole query, else the one
 * with the most matches; the earlier section wins a tie. */
function bestSection(page, query) {
  let best;
  let bestScore = -1;
  for (const section of page.sub_results ?? []) {
    const inHeading = (section.title ?? '').toLowerCase().includes(query);
    const score = (section.locations?.length ?? 0) + (inHeading ? 1000 : 0);
    if (score > bestScore) {
      best = section;
      bestScore = score;
    }
  }
  return best;
}

function toResult(page, query) {
  const section = bestSection(page, query);
  const pageTitle = page.meta?.title ?? '';
  if (!section) {
    return { url: page.url, meta: { title: pageTitle }, plain_excerpt: plain(page.excerpt) };
  }
  const title =
    section.title && section.title !== pageTitle ? `${pageTitle} › ${section.title}` : pageTitle;
  return { url: section.url, meta: { title }, plain_excerpt: plain(section.excerpt) };
}

export function init() {
  return pagefind.init();
}

export function preload(query) {
  return pagefind.preload(query);
}

export async function search(query) {
  const found = await pagefind.search(query);
  const needle = query.trim().toLowerCase();
  const results = found.results.slice(0, PAGES).map((result) => ({
    data: async () => toResult(await result.data(), needle),
  }));
  return { results };
}
