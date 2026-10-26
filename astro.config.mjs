import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';
import remarkCollapse from 'remark-collapse';
import remarkToc from 'remark-toc';
import sharp from 'sharp';
import config from './src/config/config.json';
import decapCmsOauth from 'astro-decap-cms-oauth';

// https://astro.build/config
export default defineConfig({
	site: config.site.base_url || 'https://kintar.web.id',
	base: config.site.base_path || '/',
	trailingSlash: 'ignore',
	adapter: vercel(),
	image: { service: sharp() },
	// alamat artikel yang slug-nya diganti → alamat baru (pengalihan permanen 301)
	redirects: {
		'/blog/lyricsbar-1-7': { status: 301, destination: '/blog/lyricsbar' },
	},
	integrations: [
		react(),
		// halaman admin tidak perlu diindeks mesin pencari
		sitemap({ filter: (page) => !new URL(page).pathname.startsWith('/admin') }),
		mdx(),
		// login GitHub admin lewat integrasi ini; halaman /admin (Sveltia CMS) ada di src/pages/admin/index.astro
		decapCmsOauth({ adminDisabled: true }),
	],
	env: {
		schema: {
			// dipakai /api/cloudinary/* untuk upload & galeri gambar di admin
			CLOUDINARY_API_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
		},
	},
	markdown: {
		processor: unified({
			remarkPlugins: [remarkToc, [remarkCollapse, { test: 'Table of contents' }]],
		}),
		shikiConfig: { theme: 'one-dark-pro', wrap: true },
	},
});
