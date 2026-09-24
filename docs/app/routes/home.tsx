import type { Route } from './+types/home';
import { Fragment, type ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { Heading } from 'fumadocs-ui/components/heading';
import { baseOptions } from '@/lib/layout.shared';
import { docsOrigin, docsRoute, siteOrigin } from '@/lib/shared';
import { highlightSample } from '@/lib/highlight';
import { agentTabs, installTabs, samples } from '@/lib/landing-samples';
import { CodeSample, CodeSampleTabs } from '@/components/code-sample';
import { Wordmark } from '@/components/logo';

const title = 'gitto: copy a whole working directory in seconds';
const description =
	'git worktree copies tracked files. gitto copies the whole checkout, dependencies and build output included, in seconds and for no disk.';
const siteURL = siteOrigin + '/';
const imageURL = siteOrigin + '/og.png';
const docsURL = docsOrigin + docsRoute;

const structuredData = {
	'@context': 'https://schema.org',
	'@type': 'SoftwareApplication',
	name: 'gitto',
	applicationCategory: 'DeveloperApplication',
	operatingSystem: 'macOS, Linux',
	description,
	url: siteURL,
	license: 'https://opensource.org/licenses/MIT',
	offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

export function meta({}: Route.MetaArgs) {
	return [
		{ title },
		{ name: 'description', content: description },
		{ name: 'robots', content: 'index, follow' },
		{ tagName: 'link', rel: 'canonical', href: siteURL },
		{ property: 'og:type', content: 'website' },
		{ property: 'og:site_name', content: 'gitto' },
		{ property: 'og:title', content: title },
		{ property: 'og:description', content: description },
		{ property: 'og:url', content: siteURL },
		{ property: 'og:image', content: imageURL },
		{ property: 'og:image:width', content: '1200' },
		{ property: 'og:image:height', content: '630' },
		{ name: 'twitter:card', content: 'summary_large_image' },
		{ name: 'twitter:title', content: title },
		{ name: 'twitter:description', content: description },
		{ name: 'twitter:image', content: imageURL },
		{ 'script:ld+json': structuredData },
	];
}

async function highlightedTabs(tabs: { label: string; code: string }[]) {
	return Promise.all(tabs.map(async (tab) => ({ label: tab.label, ...(await highlightSample(tab)) })));
}

export async function loader() {
	const entries = await Promise.all(
		Object.entries(samples).map(async ([name, sample]) => [name, await highlightSample(sample)] as const),
	);
	return {
		samples: Object.fromEntries(entries),
		installTabs: await highlightedTabs(installTabs),
		agentTabs: await highlightedTabs(agentTabs),
	};
}

function anchor(heading: string): string {
	return heading.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
	return (
		<section className="flex flex-col gap-4">
			<Heading as="h2" id={anchor(heading)} className="text-2xl font-bold tracking-tight">
				{heading}
			</Heading>
			{children}
		</section>
	);
}

function Prose({ children, className = '' }: { children: ReactNode; className?: string }) {
	return <p className={`max-w-prose ${className}`}>{children}</p>;
}

function Hero() {
	return (
		<section className="flex flex-col gap-4">
			<h1 className="text-4xl leading-[1.08] font-semibold tracking-tight text-balance italic sm:text-5xl">
				A worktree copies what <code className="bg-transparent! p-0!">git</code> tracks;
					<span className="block">
						<code className="text-fd-primary bg-transparent! p-0!">gitto</code> copies what you were working in.
					</span>
			</h1>
			<Prose>
				Three agents on three branches means three checkouts. A worktree hands each one the tracked files and
				stops there, so every lane resolves its dependencies and runs its build again before any work starts.
			</Prose>
			<ol className="max-w-prose list-inside list-decimal">
				<li>Keep a pool of checkouts and reset them by hand.</li>
				<li>Install and build again in every lane.</li>
				<li>Work on one branch at a time.</li>
			</ol>
			<Prose>
				A pool drifts: a slot's branch changes and its state does not, and the directory name stops saying what
				it holds. Building again is minutes per lane, forever. Working serially is the thing you were trying to
				stop doing.
			</Prose>
		</section>
	);
}

function FileTrees() {
	return (
		<div className="grid gap-3 sm:grid-cols-2">
			<div className="flex flex-col gap-2">
				<p className="text-fd-muted-foreground text-sm">
					with <code>git worktree</code>
				</p>
				<Files className="my-0 flex-1">
					<Folder name="attendance-fix" defaultOpen>
						<File name="package.json" />
						<File name="src" />
					</Folder>
				</Files>
			</div>
			<div className="flex flex-col gap-2">
				<p className="text-fd-muted-foreground text-sm">
					with <code>gitto</code>
				</p>
				<Files className="my-0 flex-1">
					<Folder name="attendance-fix" defaultOpen>
						<File name="package.json" />
						<File name="src" />
						<File name="node_modules" />
						<File name="vendor" />
						<File name="build" />
						<File name="settings.local.json" />
					</Folder>
				</Files>
			</div>
		</div>
	);
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
	return (
		<a href={href} className="underline underline-offset-4">
			{children}
		</a>
	);
}

function Footer() {
	const items = [
		<FooterLink href={docsURL}>Docs</FooterLink>,
		<FooterLink href="https://github.com/eastriverlee/gitto">GitHub</FooterLink>,
		'MIT',
		'macOS and Linux',
		'© 2026 13e7 corp.',
	];
	return (
		<footer className="text-fd-muted-foreground flex flex-wrap items-center gap-x-2 text-sm">
			{items.map((item, index) => (
				<Fragment key={index}>
					{index > 0 && <span>·</span>}
					{item}
				</Fragment>
			))}
		</footer>
	);
}

export default function Home({ loaderData }: Route.ComponentProps) {
	const { samples: code } = loaderData;
	const layout = baseOptions();
	return (
		<HomeLayout {...layout} nav={{ ...layout.nav, url: '/' }} links={[{ text: 'Docs', url: docsURL, external: false }]}>
			<main className="landing mx-auto flex w-full max-w-2xl flex-col gap-16 px-5 py-10">
				<div className="flex flex-col items-center gap-4 pt-6">
					<Wordmark className="h-16 w-auto sm:h-20" />
					<p className="text-fd-muted-foreground text-center text-balance">
						Copy a whole working directory in seconds, for almost no disk.
					</p>
				</div>

				<Hero />

				<Section heading="Nothing to rebuild">
					<Prose>
						The whole directory comes along, and the filesystem shares its blocks until one side writes. What
						a worktree leaves you to rebuild is already there:
					</Prose>
					<FileTrees />
					<CodeSample sample={code.create} />
					<Prose>That copy carried 13 GB in 21 seconds and cost 60 MB of disk.</Prose>
				</Section>

				<Section heading="Install">
					<Prose>
						One POSIX shell script, no runtime. It goes in <code>~/.local/bin</code>, and it needs nothing
						but <code>git</code> and a filesystem that can share blocks.
					</Prose>
					<CodeSampleTabs tabs={loaderData.installTabs} />
					<Prose className="text-fd-muted-foreground text-sm">
						APFS on macOS, which is every Mac since 2017. On Linux, btrfs, XFS created with{' '}
						<code>reflink=1</code>, or OpenZFS 2.2 and later. Not ext4, which cannot share blocks at all.
					</Prose>
				</Section>

				<Section heading="Plugin">
					<Prose>
						The plugin adds the skill, which is what makes an agent reach for a clone when the
						work wants its own checkout. It also carries the reasoning behind each refusal, so
						a blocked command is read and answered.
					</Prose>
					<CodeSampleTabs tabs={loaderData.agentTabs} />
					<Prose className="text-fd-muted-foreground text-sm">
						The package follows the{' '}
						<a href="https://agent-plugins.org" className="underline underline-offset-4">
							Agent Plugins
						</a>{' '}
						layout around an{' '}
						<a href="https://agentskills.io" className="underline underline-offset-4">
							Agent Skills
						</a>{' '}
						skill, and <code>.agents/skills</code> is the directory its clients share.
					</Prose>
				</Section>

				<Section heading="Every clone is a real repository">
					<Prose>
						Not a worktree, so it holds its own history and its own branch, and two of them never share an
						index. The canonical checkout is the one nobody works in.
					</Prose>
					<CodeSample sample={code.list} />
					<Prose>
						A clone starts on <code>origin/HEAD</code> unless you name another base. Passing{' '}
						<code>HEAD</code> gives you the canonical exactly as it stands, uncommitted work included, which
						is how you hand an agent the mess you are in.
					</Prose>
				</Section>

				<Section heading="What a copy breaks">
					<Prose>
						Copying the files is one line. The work is that a checkout is full of references to where it
						lives, and a plain copy leaves every one of them pointing at the original: hook paths, worktree
						registrations at every submodule depth, symlinks into the directory you copied from.
					</Prose>
					<CodeSample sample={code.doctor} />
					<Prose>
						gitto re-addresses what it can and drops what cannot survive the move, such as a worktree the
						canonical keeps inside itself, whose history stays behind. What it cannot decide it reports
						instead of rewriting:
					</Prose>
					<CodeSample sample={code.doctorDirty} />
					<Prose>
						<code>doctor</code> knows what git knows. A reference from outside git, an editor workspace or a
						line in <code>~/.ssh/config</code>, is not on that list, so a clean report means nothing points
						at the canonical. It does not mean the directory is safe to delete.
					</Prose>
				</Section>

				<Section heading="Removing a clone">
					<Prose>
						A clone that holds unpushed commits, uncommitted changes, or the history of a worktree living
						somewhere else is not removed. The refusal names what would be orphaned.
					</Prose>
					<CodeSample sample={code.refuseRemove} />
					<Prose>
						The same care applies before anything is copied. gitto measures the filesystem first, so a
						machine that cannot share blocks is told so before it pays full price:
					</Prose>
					<CodeSample sample={code.refuseFilesystem} />
				</Section>

				<Footer />
			</main>
		</HomeLayout>
	);
}
