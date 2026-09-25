import type { Route } from './+types/home';
import { Fragment, type ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { Heading } from 'fumadocs-ui/components/heading';
import { baseOptions } from '@/lib/layout.shared';
import { docsOrigin, docsRoute, siteDescription, siteOrigin } from '@/lib/shared';
import { highlightSample, type HighlightedSample } from '@/lib/highlight';
import { agentTabs, installTabs, samples } from '@/lib/landing-samples';
import { CircleX, FolderOpen, GitBranch, Loader2 } from 'lucide-react';
import { CodeSample, CodeSampleTabs } from '@/components/code-sample';
import { Wordmark } from '@/components/logo';

const title = 'gitto: a second checkout, whatever it weighs';
const description = siteDescription;
const siteURL = siteOrigin + '/';
const imageURL = siteOrigin + '/og.png';
const docsURL = docsOrigin + docsRoute;
const comparisonURL = docsURL + '/comparison';
const repositoryURL = 'https://github.com/eastriverlee/gitto';

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

function Step({ icon, children, className }: { icon: ReactNode; children: ReactNode; className?: string }) {
	return (
		<div className="text-fd-muted-foreground flex min-h-4 items-center gap-2 text-sm">
			<span aria-hidden="true" className="size-4 shrink-0 [&_svg]:size-4">
				{icon}
			</span>
			<span className={className}>{children}</span>
		</div>
	);
}

function StepSeparator({ children }: { children: ReactNode }) {
	return (
		<div className="text-fd-muted-foreground before:bg-fd-border after:bg-fd-border flex items-center gap-2 text-sm before:h-px before:flex-1 after:h-px after:flex-1">
			{children}
		</div>
	);
}

function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
	return (
		<a
			href={href}
			className="bg-fd-primary text-fd-primary-foreground rounded-lg px-4 py-2 text-sm font-medium no-underline"
		>
			{children}
		</a>
	);
}

function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
	return (
		<a href={href} className="border-fd-border rounded-lg border px-4 py-2 text-sm font-medium no-underline">
			{children}
		</a>
	);
}

function Measured({ figure, of }: { figure: string; of: string }) {
	return (
		<div className="border-fd-border flex flex-col gap-1 rounded-lg border p-4">
			<span className="text-2xl font-semibold tracking-tight">{figure}</span>
			<span className="text-fd-muted-foreground text-sm">{of}</span>
		</div>
	);
}

function Arrival({ tool, gets }: { tool: ReactNode; gets: string }) {
	return (
		<div className="border-fd-border flex flex-col gap-1 border-b p-3 text-sm last:border-b-0 sm:flex-row sm:gap-4">
			<span className="shrink-0 font-medium [&_code]:bg-transparent! [&_code]:p-0! sm:w-44">{tool}</span>
			<span className="text-fd-muted-foreground">{gets}</span>
		</div>
	);
}

function Hero({ install }: { install: HighlightedSample }) {
	return (
		<section className="flex flex-col items-center gap-6 pt-6">
			<Wordmark className="h-16 w-auto sm:h-20" />
			<h1 className="text-center text-4xl leading-[1.08] font-semibold tracking-tight text-balance italic sm:text-5xl">
				<span className="block">A second checkout,</span>
				<span className="text-fd-primary block">whatever it weighs.</span>
			</h1>
			<Prose className="text-center">
				<code className="bg-transparent! p-0!">gitto</code> copies the working directory itself, with the
				filesystem's own clone call: history, submodules, dependencies, build output, the files you never
				commit. Nothing is duplicated until one side writes, so the copy costs a walk over the directory
				entries and the blocks you go on to change.
			</Prose>
			<div className="w-full max-w-md">
				<CodeSample sample={install} />
			</div>
			<div className="flex flex-wrap items-center justify-center gap-2">
				<PrimaryLink href={docsURL}>Read the docs</PrimaryLink>
				<SecondaryLink href={comparisonURL}>How it compares</SecondaryLink>
				<SecondaryLink href={repositoryURL}>GitHub</SecondaryLink>
			</div>
		</section>
	);
}

function Measurements() {
	return (
		<div className="grid gap-3 sm:grid-cols-3">
			<Measured figure="nothing duplicated" of="both checkouts point at the same blocks until one of them writes" />
			<Measured figure="nothing reinstalled" of="dependencies, build output and local files arrive with the copy" />
			<Measured figure="nothing dangling" of="hook paths, worktree registrations and submodule markers are re-addressed" />
		</div>
	);
}

function Problem() {
	return (
		<>
			<Prose>
				Each of them wants a checkout of its own, and a worktree hands it the tracked files and stops there.
			</Prose>
			<div className="flex max-w-prose flex-col gap-2">
				<Step icon={<GitBranch />}>git worktree add ../auth-fix -b auth-fix</Step>
				<StepSeparator>Preparing worktree</StepSeparator>
				<Step icon={<FolderOpen />}>cd ../auth-fix &amp;&amp; npm test</Step>
				<Step icon={<CircleX />}>vitest: command not found</Step>
				<Step icon={<Loader2 className="animate-spin" />} className="shimmer">
					installing 1,284 packages
				</Step>
			</div>
			<Prose>The usual ways to live with that:</Prose>
			<ol className="max-w-prose list-inside list-decimal">
				<li>Keep a pool of checkouts and reset them by hand.</li>
				<li>Install and build again in every lane.</li>
				<li>Work on one branch at a time.</li>
			</ol>
			<Prose>
				Discipline? A pool of three drifts into twenty-seven, and the slot labelled <code>main</code> turns out
				to be three weeks behind. Copying was never the expensive part. APFS and btrfs have shared blocks on
				write for a decade, and git has never asked them for it.
			</Prose>
			<Prose>
				The canonical checkout is the one nobody works in. Every lane is a copy of it that starts finished, and
				the two share their storage until one of them writes.
			</Prose>
		</>
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
					<Folder name="auth-fix" defaultOpen>
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
					<Folder name="auth-fix" defaultOpen>
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
		<FooterLink href={repositoryURL}>GitHub</FooterLink>,
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
	const install = loaderData.installTabs[0];
	const layout = baseOptions();
	return (
		<HomeLayout {...layout} nav={{ ...layout.nav, url: '/' }} links={[{ text: 'Docs', url: docsURL, external: false }]}>
			<main className="landing mx-auto flex w-full max-w-2xl flex-col gap-16 px-5 py-10">
				<Hero install={install} />

				<Measurements />

				<Section heading="Three agents, three checkouts">
					<Problem />
				</Section>

				<Section heading="Nothing to rebuild">
					<Prose>
						The whole directory comes along, and the filesystem shares its blocks until one side writes. What
						a worktree leaves you to rebuild is already there:
					</Prose>
					<FileTrees />
					<CodeSample sample={code.create} />
					<Prose className="text-fd-muted-foreground text-sm">
						Measured on a 13 GB checkout with four submodules: 21 seconds, and 60 MB of disk that was not
						shared. A repository twice the size copies in about the same time, because what is walked is
						the directory entries rather than the bytes.
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

				<Section heading="Ending a lane without losing it">
					<Prose>
						A clone holding unpushed commits, uncommitted changes, or the history of a worktree living
						somewhere else is not removed. Both counts read the submodules, where a commit nobody pushed
						leaves the top level looking clean:
					</Prose>
					<CodeSample sample={code.refuseSubmodule} />
					<Prose>
						<code>--archive</code> takes it anyway. The checkout and every submodule are bundled beside the
						canonical, work that was never committed is committed into the bundle, and every bundle is read
						back before anything is deleted. <code>prune --stale 7</code> does the same for the lanes an
						agent walked away from.
					</Prose>
					<CodeSample sample={code.archive} />
				</Section>

				<Section heading="Several at once">
					<Prose>
						Copying reads the canonical and <code>sync</code> writes to it, so both announce themselves in a
						lock the canonical carries. Any number of clones can be taken at the same time, and one taken
						during a sync waits for it rather than copying a tree that is moving.
					</Prose>
					<CodeSample sample={code.waiting} />
				</Section>

				<Section heading="How it compares">
					<Prose>
						Running several agents at once made a second checkout into a category, and most of it is built
						on <code>git worktree</code>. What a worktree gives you is a shared object store, which a
						shared-block copy hands over for free.
					</Prose>
					<div className="border-fd-border overflow-hidden rounded-lg border">
						<Arrival
							tool={<code>git clone</code>}
							gets="history over the network, tracked files, nothing else"
						/>
						<Arrival
							tool={<code>git worktree</code>}
							gets="tracked files; submodules uninitialised, ignored files gone, branches and the stash shared with every other worktree"
						/>
						<Arrival
							tool="worktree managers"
							gets="a worktree, and a declared step that copies the ignored directories back in"
						/>
						<Arrival
							tool={<code>gitto</code>}
							gets="the directory itself, submodules at every depth, re-addressed and independent from the first write"
						/>
					</div>
					<Prose>
						The rest of that table, including the other whole-tree copies and what each one does about a
						directory that still remembers where it lived, is in{' '}
						<FooterLink href={comparisonURL}>the comparison</FooterLink>.
					</Prose>
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
						The plugin adds the skill, which is what makes an agent reach for a clone when the work wants
						its own checkout. It also carries the reasoning behind each refusal, so a blocked command is
						read and answered.
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

				<section className="border-fd-border flex flex-col items-center gap-4 rounded-xl border p-8">
					<h2 className="text-center text-2xl font-bold tracking-tight text-balance">
						Give the next branch a checkout that starts finished
					</h2>
					<div className="w-full max-w-md">
						<CodeSample sample={install} />
					</div>
					<div className="flex flex-wrap items-center justify-center gap-2">
						<PrimaryLink href={docsURL}>Read the docs</PrimaryLink>
						<SecondaryLink href={repositoryURL}>GitHub</SecondaryLink>
					</div>
				</section>

				<Footer />
			</main>
		</HomeLayout>
	);
}
