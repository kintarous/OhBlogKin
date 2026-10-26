import { glob } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';

const commonFields = {
	title: z.string(),
	description: z.string(),
	meta_title: z.string().optional(),
	date: z.coerce.date().optional(),
	image: z.string().optional(),
	draft: z.boolean().optional(),
};

const blogCollection = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: 'src/content/blog' }),
	schema: z.object({
		title: z.string(),
		meta_title: z.string().optional(),
		description: z.string().optional(),
		date: z.coerce.date().optional(),
		image: z.string().optional(),
		author: z.string().default('Admin'),
		categories: z.array(z.string()).default(() => ['updates']),
		tags: z.array(z.string()).default(() => ['blog']),
		draft: z.boolean().optional(),
	}),
});

const authorsCollection = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: 'src/content/authors' }),
	schema: z.object({
		...commonFields,
		social: z
			.array(
				z
					.object({
						name: z.string().optional(),
						icon: z.string().optional(),
						link: z.string().optional(),
					})
					.optional(),
			)
			.optional(),
	}),
});

const pagesCollection = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: 'src/content/pages' }),
	schema: z.object(commonFields),
});

const aboutCollection = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: 'src/content/about' }),
	schema: z.object(commonFields),
});

const contactCollection = defineCollection({
	loader: glob({ pattern: '**/*.{md,mdx}', base: 'src/content/contact' }),
	schema: z.object(commonFields),
});

export const collections = {
	blog: blogCollection,
	authors: authorsCollection,
	pages: pagesCollection,
	about: aboutCollection,
	contact: contactCollection,
};
