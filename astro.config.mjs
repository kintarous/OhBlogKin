import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import remarkCollapse from 'remark-collapse';
import remarkToc from 'remark-toc';
import sharp from 'sharp';
import config from './src/config/config.json';
import decapCmsOauth from 'astro-decap-cms-oauth';

// https://astro.build/config
export default defineConfig({
	site: config.site.base_url || 'https://ohblogkin.vercel.app',
	base: config.site.base_path || '/',
	trailingSlash: 'ignore',
	adapter: vercel(),
	image: { service: sharp() },
	integrations: [
		react(),
		sitemap(),
		mdx(),
		// halaman /admin memakai Sveltia CMS (pengganti Decap), login GitHub tetap lewat integrasi ini
		decapCmsOauth({ decapCMSSrcUrl: 'https://unpkg.com/@sveltia/cms@0/dist/sveltia-cms.js' }),
	],
	markdown: {
		processor: unified({
			remarkPlugins: [remarkToc, [remarkCollapse, { test: 'Table of contents' }]],
		}),
		shikiConfig: { theme: 'one-dark-pro', wrap: true },
	},
});
