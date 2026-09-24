import { createGetUrl } from 'fumadocs-core/source';

export const appName = 'gitto';
export const siteOrigin = 'https://gitto.13e7.co';
export const docsOrigin = siteOrigin;
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

export const gitConfig = {
	user: 'eastriverlee',
	repo: 'gitto',
	branch: 'main',
};

const getContentUrl = createGetUrl(docsContentRoute);

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
	const segments = [...page.slugs, 'content.md'];

	return { segments, url: getContentUrl(segments, page.locale) };
}
