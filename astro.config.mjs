import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import { defineConfig, fontProviders } from 'astro/config';
import vercel from '@astrojs/vercel';
import remarkCollapse from 'remark-collapse';
import remarkToc from 'remark-toc';
import sharp from 'sharp';
import config from './src/config/config.json';
import theme from './src/config/theme.json';

function parseFontString(fontStr) {
	const [name, weightPart] = fontStr.split(':');
	let weights = [400];

	if (weightPart) {
		const weightMatch = weightPart.match(/wght@?([\d;]+)/);
		if (weightMatch) {
			weights = weightMatch[1].split(';').map((weight) => parseInt(weight, 10));
		}
	}

	return { name: name.replace(/\+/g, ' '), weights };
}

const fontsConfig = Object.entries(theme.fonts.font_family)
	.filter(([key]) => !key.includes('_type'))
	.map(([key, fontStr]) => {
		const { name, weights } = parseFontString(fontStr);
		const fallback = theme.fonts.font_family[`${key}_type`] || 'sans-serif';

		return {
			name,
			cssVariable: `--font-${key}`,
			provider: fontProviders.google(),
			weights,
			display: 'swap',
			fallbacks: [fallback],
		};
	});

// https://astro.build/config
export default defineConfig({
	site: config.site.base_url || 'https://ohblogkin.vercel.app',
	base: config.site.base_path || '/',
	trailingSlash: 'ignore',
	adapter: vercel(),
	image: { service: sharp() },
	vite: { plugins: [tailwindcss()] },
	fonts: fontsConfig,
	integrations: [react(), sitemap(), mdx()],
	markdown: {
		processor: unified({
			remarkPlugins: [remarkToc, [remarkCollapse, { test: 'Table of contents' }]],
		}),
		shikiConfig: { theme: 'one-dark-pro', wrap: true },
	},
});
