export const installTabs = [
	{ label: 'curl', code: 'curl -fsSL https://gitto.13e7.co/install | sh' },
	{
		label: 'From source',
		code: 'git clone https://github.com/eastriverlee/gitto\ncd gitto\ncp plugins/gitto/skills/gitto/scripts/gitto ~/.local/bin/',
	},
];

export const agentTabs = [
	{
		label: 'Claude Code',
		code: 'claude plugin marketplace add eastriverlee/gitto\nclaude plugin install gitto@13e7',
	},
	{
		label: 'Codex',
		code: 'codex plugin marketplace add eastriverlee/gitto\ncodex plugin add gitto@13e7',
	},
	{
		label: 'Other agents',
		code: 'mkdir -p .agents/skills/gitto\ncurl -fsSL https://gitto.13e7.co/skill -o .agents/skills/gitto/SKILL.md',
	},
];

export const samples = {
	create: {
		code: 'gitto new auth-fix',
		output: `cloning storefront -> storefront-auth-fix by clonefile
  repointed core.hooksPath at this clone's own hooks
  branch auth-fix on origin/main, 4 submodules
/Users/you/work/storefront-auth-fix`,
	},
	list: {
		code: 'gitto list',
		output: `canonical storefront  main
storefront-auth-fix      auth-fix               dirty=0     unpushed=0
storefront-search        feat/search-ranking    dirty=3     unpushed=2`,
	},
	doctor: {
		code: 'gitto doctor auth-fix',
		output: `storefront-auth-fix
  nothing points at the canonical`,
	},
	doctorDirty: {
		code: 'gitto doctor search',
		output: `storefront-search
  still pointing outside this clone:
    symlink  .agents -> /Users/you/work/storefront/.agents
    hosts    storefront-docs`,
	},
	refuseRemove: {
		code: 'gitto remove search',
		output: `gitto: search hosts the history of worktrees that live outside it:
        /Users/you/work/storefront-docs
      removing it would leave each of them without a repository.`,
	},
	refuseFilesystem: {
		code: 'gitto new auth-fix',
		output: `gitto: copying here costs the full size, so a clone would too.
      macOS needs APFS; Linux needs btrfs, XFS with reflink=1, or OpenZFS 2.2+.
      ext4 and tmpfs cannot share blocks at all.`,
	},
};
