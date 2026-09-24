import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { docsRoute, siteOrigin } from '../app/lib/shared';

const repository = join(import.meta.dirname, '..', '..');
const content = join(import.meta.dirname, '..', 'content', 'docs');
const assets = join(import.meta.dirname, '..', 'public');
const skill = join(repository, 'plugins', 'gitto', 'skills', 'gitto');

const siteDescription =
	'git worktree copies tracked files. gitto copies the whole checkout, dependencies and build output included, in seconds and for no disk.';

const slugOf = (title: string) =>
	title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

type Page = { slug: string; title: string; body: string };

const leads: Record<string, string> = {
	index: 'What a clone carries that a worktree leaves behind.',
	install: 'One shell script, and the plugin that carries the skill.',
	commands: 'Four commands, and what each one refuses.',
	'why-a-clone-and-not-a-worktree': 'What a worktree shares, and what sharing costs.',
	'what-a-copy-breaks': 'Repaired, dropped or reported: the three dispositions.',
	requirements: 'Which filesystems can share blocks between two files.',
	'recovering-a-checkout-that-lost-its-git-directory': 'Finding the commit an orphaned working tree holds.',
};

function firstSentence(body: string): string {
	const prose = body
		.split('\n')
		.find((line) => line.trim() && !line.startsWith('|') && !line.startsWith('```') && !line.startsWith('#'));
	if (!prose) return siteDescription;
	const sentence = prose.trim().match(/^.*?[.](?=\s|$)/);
	return (sentence ? sentence[0] : prose.trim()).replace(/`/g, '');
}

function split(markdown: string): Page[] {
	const lines = markdown.split('\n');
	const pages: Page[] = [];
	let title = 'Overview';
	let collected: string[] = [];

	const flush = () => {
		const body = collected.join('\n').trim();
		if (body) pages.push({ slug: pages.length === 0 ? 'index' : slugOf(title), title, body });
		collected = [];
	};

	for (const line of lines) {
		if (line.startsWith('# ') && pages.length === 0 && collected.length === 0) continue;
		if (line.startsWith('## ')) {
			flush();
			title = line.slice(3).trim();
			continue;
		}
		collected.push(line);
	}
	flush();
	return pages;
}

function frontmatter(page: Page): string {
	const title = page.slug === 'index' ? 'gitto' : page.title;
	return [
		'---',
		`title: ${JSON.stringify(title)}`,
		`description: ${JSON.stringify(leads[page.slug] ?? firstSentence(page.body))}`,
		'---',
		'',
		page.body,
		'',
	].join('\n');
}

rmSync(content, { recursive: true, force: true });
mkdirSync(content, { recursive: true });
mkdirSync(assets, { recursive: true });

const pages = split(readFileSync(join(repository, 'DOCS.md'), 'utf8'));
for (const page of pages) writeFileSync(join(content, `${page.slug}.mdx`), frontmatter(page));
writeFileSync(
	join(content, 'meta.json'),
	JSON.stringify({ title: 'gitto', pages: pages.map((page) => page.slug) }, null, 2) + '\n',
);

writeFileSync(
	join(content, 'sources.json'),
	JSON.stringify(Object.fromEntries(pages.map((page) => [page.slug, 'DOCS.md'])), null, 2) + '\n',
);

cpSync(join(skill, 'scripts', 'install.sh'), join(assets, 'install'));
cpSync(join(skill, 'scripts', 'gitto'), join(assets, 'gitto'));
cpSync(join(skill, 'SKILL.md'), join(assets, 'skill'));
cpSync(join(repository, 'gitto.svg'), join(assets, 'gitto.svg'));
cpSync(join(repository, 'gitto-mark.svg'), join(assets, 'gitto-mark.svg'));
cpSync(join(repository, 'favicon.svg'), join(assets, 'favicon.svg'));

writeFileSync(join(assets, '_redirects'), '/* /__spa-fallback.html 200\n');
writeFileSync(
	join(assets, '_headers'),
	['/install', '  content-type: text/plain; charset=utf-8', '/gitto', '  content-type: text/plain; charset=utf-8', '/skill', '  content-type: text/plain; charset=utf-8', ''].join('\n'),
);

const urls = ['/', ...pages.map((page) => `${docsRoute}/${page.slug === 'index' ? '' : page.slug}`)];
writeFileSync(
	join(assets, 'sitemap.xml'),
	`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
		.map((url) => `\t<url><loc>${siteOrigin}${url}</loc></url>`)
		.join('\n')}\n</urlset>\n`,
);
writeFileSync(join(assets, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin}/sitemap.xml\n`);

console.log(`wrote ${pages.map((page) => page.slug).join(', ')}`);
