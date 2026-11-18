import { fileURLToPath } from 'node:url';
import { unified } from '@astrojs/markdown-remark';
import { defineConfig } from 'astro/config';
import lotus from '@prosefly/astro-theme-lotus';
import * as pagefind from 'pagefind';
import kagariGrammar from './grammars/kagari.tmLanguage.json' with { type: 'json' };
import { remarkBookHeadingIds, remarkBookLinks, remarkIncludeSvg } from './src/markdown';

const theme = lotus({
  markdown: {
    // `kis` and `kix` code blocks; the grammar lists `kix` as an alias.
    expressiveCode: { shiki: { langs: [kagariGrammar as never] } },
  },
});

// The search index. Lotus's own `astro:build:done` hook imports `pagefind` lazily, after Vite's
// module runner has closed, and fails the build; this one does the same work with the module
// imported above. Pages mark their content with `data-pagefind-body` (Lotus's `DocsLayout`).
// The index goes to `/pagefind/`; the search dialog loads `public/search/pagefind.js`, which
// wraps it (`search.outputSubdir` in `theme.config.json`).
theme.hooks['astro:build:done'] = async ({ dir, logger }) => {
  const { index, errors } = await pagefind.createIndex({
    excludeSelectors: ['[data-pagefind-ignore]', 'script', 'style', 'nav', 'footer'],
  });
  try {
    if (!index) {
      throw new Error(errors.join('\n') || 'Pagefind could not create the search index.');
    }
    const site = fileURLToPath(dir);
    const added = await index.addDirectory({ path: site, glob: '**/*.html' });
    const written = await index.writeFiles({ outputPath: `${site}pagefind` });
    const problems = [...added.errors, ...written.errors];
    if (problems.length > 0) {
      throw new Error(problems.join('\n'));
    }
    logger.info(`Pagefind indexed ${added.page_count} pages into pagefind/`);
  } finally {
    await pagefind.close();
  }
};

// Site identity, locales, navigation and search live in `theme.config.json`.
export default defineConfig({
  site: 'https://kagari.suitsu31.club',
  markdown: {
    // Lotus adds its own plugins (heading ids, CJK-friendly emphasis) before these.
    processor: unified({
      remarkPlugins: [remarkIncludeSvg, remarkBookLinks, remarkBookHeadingIds],
    }),
  },
  integrations: [theme],
});
