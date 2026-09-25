import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { docsRoute, siteDescription, siteOrigin } from '../app/lib/shared';

const repository = join(import.meta.dirname, '..', '..');
const content = join(import.meta.dirname, '..', 'content', 'docs');
const assets = join(import.meta.dirname, '..', 'public');
const skill = join(repository, 'plugins', 'gitto', 'skills', 'gitto');

const slugOverrides: Record<string, string> = {
	'Q&A': 'questions',
	'Why not use a worktree?': 'worktree',
	'Does this work on Linux?': 'linux',
	'What happens on ext4?': 'ext4',
	'Can I run it from inside a clone?': 'from-inside-a-clone',
	'How do I keep the canonical current?': 'keeping-current',
	'Can I clone a clone?': 'clone-a-clone',
	'How do I undo one?': 'undo',
	'What if the canonical moves?': 'moving-the-canonical',
	'Does it need GitHub, or a remote at all?': 'remotes',
	'How is this different from a fresh git clone?': 'versus-git-clone',
};

const slugOf = (title: string) =>
	slugOverrides[title] ??
	title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

const cleanTitle = (heading: string) => heading.replace(/^#+ /, '').replace(/`/g, '');

const sidebarIcons: Record<string, string> = {
	index: 'BookOpen',
	install: 'Download',
	plugin: 'Puzzle',
	concepts: 'Shapes',
	commands: 'Terminal',
	'how-it-works': 'Cog',
	questions: 'MessageCircleQuestion',
	'from-source': 'Package',
	caveats: 'TriangleAlert',
	comparison: 'GitCompare',
};

const groupDescriptions: Record<string, string> = {
	index: siteDescription,
	install: 'One shell script, and the plugin that carries the skill.',
	plugin: 'What an agent is told, and how each client installs it.',
	concepts: 'The four words the commands and their refusals are written in.',
	commands: 'Four commands, what each one takes, and what each one refuses.',
	'how-it-works': 'Copy, re-address, measure: what a run does in order.',
	questions: 'Short answers to what people ask before they install it.',
	'from-source': 'Building it from a checkout of the repository.',
	caveats: 'What it cannot see, and what a copy cannot carry.',
	comparison: 'Worktree managers, whole-tree CoW clones, and what each one leaves you holding.',
};

/** The two columns of the table a group index opens with. */
const indexHeadings: Record<string, [string, string]> = {
	concepts: ['Word', 'What it means here'],
	commands: ['Command', 'What it does'],
	'how-it-works': ['Stage', 'What happens'],
	caveats: ['Limit', 'What it means'],
};

/** Split a document on a heading level, leaving fenced code alone. */
function splitOn(markdown: string, level: number) {
	const marker = '#'.repeat(level) + ' ';
	const parts: string[][] = [[]];
	let inFence = false;
	for (const line of markdown.split('\n')) {
		if (line.startsWith('```')) inFence = !inFence;
		if (!inFence && line.startsWith(marker)) parts.push([]);
		parts[parts.length - 1].push(line);
	}
	const [intro, ...chunks] = parts.map((lines) => lines.join('\n'));
	return {
		intro,
		chunks: chunks.map((chunk) => {
			const [heading, ...rest] = chunk.split('\n');
			return { title: cleanTitle(heading), text: rest.join('\n') };
		}),
	};
}

/** Raise the headings inside a page that has been lifted out of its part. */
function shifted(markdown: string, by: number) {
	if (by <= 0) return markdown;
	let inFence = false;
	return markdown
		.split('\n')
		.map((line) => {
			if (line.startsWith('```')) inFence = !inFence;
			if (inFence) return line;
			const heading = line.match(/^(#{2,6}) /);
			return heading ? line.replace(heading[1], '#'.repeat(Math.max(2, heading[1].length - by))) : line;
		})
		.join('\n');
}

const plain = (markdown: string) =>
	markdown
		.replace(/```[\s\S]*?```/g, '')
		.replace(/^\s*\|.*$/gm, '')
		.replace(/^#+ .*$/gm, '');

/** A table cell is MDX, so an angle bracket outside a code span reads as a tag. */
const safeInTable = (text: string) =>
	text
		.split(/(`[^`]*`)/)
		.map((piece, index) => (index % 2 ? piece : piece.replace(/</g, '&lt;').replace(/>/g, '&gt;')))
		.join('')
		.replace(/\|/g, '\\|');

/** The line a page opens with, which is what its group's table shows. */
function lead(markdown: string): string {
	const paragraph = plain(markdown)
		.split('\n\n')
		.map((block) => block.split('\n').join(' ').trim())
		.find((block) => block.length > 0);
	return paragraph ?? siteDescription;
}

const written: string[] = [];
const sources: Record<string, string> = {};

function frontmatter(fields: Record<string, string | undefined>) {
	const rows = Object.entries(fields)
		.filter(([, value]) => value)
		.map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
	return ['---', ...rows, '---', ''].join('\n');
}

function writePage(path: string, title: string, text: string, options: { description?: string; shift?: number; icon?: string } = {}) {
	mkdirSync(join(content, path, '..'), { recursive: true });
	const body = shifted(text, options.shift ?? 0).trim();
	writeFileSync(
		join(content, `${path}.mdx`),
		frontmatter({ title, description: options.description ?? lead(body), icon: options.icon }) + body + '\n',
	);
	written.push(path);
	sources[path] = 'DOCS.md';
}

/** A group opens with a table built from what its own pages say, so the summary cannot drift. */
function writeGroup(slug: string, title: string, text: string, level: number) {
	const { intro, chunks: pages } = splitOn(text, level);
	const shift = level - 2;
	mkdirSync(join(content, slug), { recursive: true });

	const [left, right] = indexHeadings[slug] ?? ['Page', 'What it covers'];
	const rows = pages.map((page) => `| [${page.title}](${docsRoute}/${slug}/${slugOf(page.title)}) | ${safeInTable(lead(page.text))} |`);
	const table = [`| ${left} | ${right} |`, '| --- | --- |', ...rows].join('\n');
	const opening = intro.trim() ? `${shifted(intro, shift).trim()}\n\n` : '';
	writeFileSync(
		join(content, slug, 'index.mdx'),
		frontmatter({ title, description: groupDescriptions[slug], icon: sidebarIcons[slug] }) + opening + table + '\n',
	);
	written.push(join(slug, 'index'));
	sources[join(slug, 'index')] = 'DOCS.md';

	for (const page of pages) writePage(join(slug, slugOf(page.title)), page.title, page.text, { shift });

	writeFileSync(
		join(content, slug, 'meta.json'),
		JSON.stringify({ title, ...(sidebarIcons[slug] ? { icon: sidebarIcons[slug] } : {}), pages: pages.map((page) => slugOf(page.title)) }, null, 2) + '\n',
	);
}

rmSync(content, { recursive: true, force: true });
mkdirSync(content, { recursive: true });
mkdirSync(assets, { recursive: true });

const reference = readFileSync(join(repository, 'DOCS.md'), 'utf8');
const [overview, ...groups] = splitOn(reference, 1).chunks;
writePage('index', 'gitto', overview.text, { description: siteDescription, icon: sidebarIcons.index });

const readme = readFileSync(join(repository, 'README.md'), 'utf8');
const readmeSections = splitOn(readme.slice(readme.indexOf('\n## ') + 1), 2).chunks;
for (const name of ['Install', 'Plugin', 'From source']) {
	const section = readmeSections.find((chunk) => chunk.title === name);
	if (!section) continue;
	const slug = slugOf(name);
	writePage(slug, name, section.text, { description: groupDescriptions[slug], icon: sidebarIcons[slug] });
	sources[slug] = 'README.md';
}

/** Q&A is written as questions, so its pages live one level down. */
const groupLevel = (title: string) => (title === 'Q&A' ? 3 : 2);
/** A part whose headings are its own argument, not a page each. */
const wholePages = new Set(['Comparison']);
for (const group of groups) {
	const slug = slugOf(group.title);
	if (wholePages.has(group.title)) {
		writePage(slug, group.title, group.text, { description: groupDescriptions[slug], icon: sidebarIcons[slug] });
		continue;
	}
	writeGroup(slug, group.title, group.text, groupLevel(group.title));
}

const order = ['index', 'install', 'plugin', 'from-source', ...groups.map((group) => slugOf(group.title))];
writeFileSync(join(content, 'meta.json'), JSON.stringify({ title: 'gitto', pages: order }, null, 2) + '\n');
writeFileSync(join(content, 'sources.json'), JSON.stringify(sources, null, 2) + '\n');

cpSync(join(skill, 'scripts', 'install.sh'), join(assets, 'install'));
cpSync(join(skill, 'scripts', 'gitto'), join(assets, 'gitto'));
cpSync(join(skill, 'SKILL.md'), join(assets, 'skill'));
cpSync(join(repository, 'gitto.svg'), join(assets, 'gitto.svg'));
cpSync(join(repository, 'gitto-mark.svg'), join(assets, 'gitto-mark.svg'));

const themedInk = '<style>:root{--ink:#100f0d}@media(prefers-color-scheme:dark){:root{--ink:#fff}}</style>';
const favicon = readFileSync(join(repository, 'gitto-mark.svg'), 'utf8')
	.replaceAll('fill:currentColor', 'fill:var(--ink)')
	.replace('role="img" aria-label="gitto" ', '')
	.replace('viewBox="0 0 126 92"', 'viewBox="0 -17 126 126"')
	.replace('>', '>' + themedInk);
writeFileSync(join(assets, 'favicon.svg'), favicon);

writeFileSync(
	join(assets, '_headers'),
	['/install', '  content-type: text/plain; charset=utf-8', '/gitto', '  content-type: text/plain; charset=utf-8', '/skill', '  content-type: text/plain; charset=utf-8', ''].join('\n'),
);

const urls = ['/', ...written.map((path) => `${docsRoute}/${path === 'index' ? '' : path.replace(/\/index$/, '')}`)];
writeFileSync(
	join(assets, 'sitemap.xml'),
	`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
		.map((url) => `\t<url><loc>${siteOrigin}${url}</loc></url>`)
		.join('\n')}\n</urlset>\n`,
);
const retiredRoutes: Record<string, string> = {
	'/docs/questions/clone-a-clone': '/docs/questions/from-inside-a-clone',
	'/docs/commands': '/docs/commands/new',
};
const reachable = new Set(
	written.map((path) => `${docsRoute}/${path === 'index' ? '' : path.replace(/\/index$/, '')}`),
);
for (const [from, to] of Object.entries(retiredRoutes)) {
	if (!reachable.has(to)) {
		throw new Error(`${from} redirects to ${to}, which no page answers`);
	}
}
writeFileSync(
	join(assets, '_redirects'),
	Object.entries(retiredRoutes)
		.map(([from, to]) => `${from} ${to} 301`)
		.join('\n') + '\n',
);

writeFileSync(join(assets, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin}/sitemap.xml\n`);

console.log(`wrote ${written.length} pages: ${written.join(', ')}`);
