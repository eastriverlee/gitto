# gitto

A second checkout of the repository you are working in, whatever it weighs.

```
$ gitto new auth-fix
cloning storefront -> storefront-auth-fix by clonefile
  repointed core.hooksPath at this clone's own hooks
  branch auth-fix on origin/main, 4 submodules

$ cd ../storefront-auth-fix && ls
node_modules/  vendor/  build/  src/  ...
```

`gitto` copies the working directory itself, with the clone call the filesystem
already has. Nothing is duplicated until one side writes, so what a copy costs
is a walk over the directory entries and the blocks you go on to change. Size
does not decide the time.

Measured on a 13 GB checkout with four submodules: 21 seconds, and 60 MB of
disk that was not shared.

[Docs](https://gitto.13e7.co/docs) ·
[Comparison](https://gitto.13e7.co/docs/comparison) ·
[Commands](https://gitto.13e7.co/docs/commands)

## Install

```sh
curl -fsSL https://gitto.13e7.co/install | sh
```

## What a second checkout usually costs

`git clone` copies history. `git worktree` shares history and gives you a
second checkout of the tracked files. Both leave behind everything git does not
track, so every new checkout reinstalls and rebuilds what the last one already
has on disk.

A working directory is also more than files. It is files plus references to
where those files are: git's worktree registry, submodule git directories,
`core.hooksPath`, virtualenv activation scripts, symlinks. Copy the files and
you get a directory that still points at the original, quietly running its
hooks and reading its configuration.

That second half is the work. Copying is one line.

## Plugin

The plugin carries a skill that teaches an agent when to reach for `gitto`, how
to read what `doctor` reports, and how to repair a checkout whose git directory
was lost.

**Claude Code**

```sh
claude plugin marketplace add eastriverlee/gitto
claude plugin install gitto@13e7
```

**Codex**

```sh
codex plugin marketplace add eastriverlee/gitto
codex plugin add gitto@13e7
```

Either one then installs the command with `/gitto:install`.

## Commands

```
gitto new <name> [<base>] [--branch <branch>]   make a clone of the canonical
gitto list [--json] [--measure]                 show every clone, its age and its cost
gitto sync                                      bring the canonical up to date
gitto prune [--remove] [--stale <days>]         drop the clones whose work landed
gitto remove <name> [--archive]                 remove one, keeping what it holds
gitto doctor [<name>] [--json]                  report what points outside a clone, and what it hosts
gitto path <name>                               print where a clone lives
gitto adopt <canonical>                         re-point a clone at a moved canonical
gitto shell-init                                emit the shell function
gitto update                                    replace this script with what the site serves
gitto version                                   print the version
```

Add the shell function once and `gitto new` takes you to what it made:

```sh
eval "$(gitto shell-init)"
```

A command cannot change the directory of the shell that started it, so moving
into a new clone needs a function. It also adds `gitto cd` and completions for
bash and zsh.

## Several at once

Copying reads the canonical and `sync` writes to it, so both announce themselves
in a lock the canonical carries. Any number of clones can be taken at once; a
clone taken during a `sync` waits for it rather than copying a tree that is
moving.

A clone is removed only when nothing would be lost, and both counts read the
submodules: a commit made inside one and pushed nowhere stops the removal, where
`git status` at the top level shows a clean tree. `remove --archive` and
`prune --stale <days>` take one anyway, bundling the checkout and every
submodule beside the canonical and reading each bundle back before anything is
deleted.

## What it repairs

| what remembers its address | what `gitto` does |
| --- | --- |
| `core.hooksPath` | repoints it at the clone's own hooks |
| inherited worktree registrations | detaches them, in submodules at any depth too |
| worktrees nested inside the canonical | drops them, since their history stayed behind |
| submodule git directories | verifies none escapes the clone |
| symlinks, virtualenvs, other git config | reports them, and `doctor` runs the same scan later |

Submodules survive a whole-directory copy because their `.git` files address
their parent by a relative path. Three levels of nesting follow a copy intact.
A worktree's submodule addresses the host repository absolutely, and does not.

With no name, `doctor` reports the canonical alongside the clones, and holds
every worktree a checkout hosts against that worktree's own marker. Renaming a
checkout frees the address its markers carry, so run it before moving one.

`doctor` reports what git can see. Nothing in git records that a shell has its
cwd inside a directory, that `~/.ssh/config` runs a script from one, or that a
launch agent watches one. A clean report means the references git knows about
are in order. It does not mean the directory is safe to delete.

## Requirements

A filesystem that shares blocks between a file and its copy.

| | |
| --- | --- |
| macOS | APFS, which every Mac has had since 2017 |
| Linux | btrfs · XFS created with `reflink=1` · OpenZFS 2.2+ · bcachefs |
| Neither | **ext4** and tmpfs, which cannot share blocks at all |

ext4 is the installer default on Ubuntu and Debian, so a clone there would cost
a full copy and `gitto` refuses to make one. Fedora and openSUSE default to
btrfs, and the RHEL family to XFS, where `mkfs.xfs` has enabled reflink by
default since xfsprogs 5.1.

`gitto` decides by measuring: it
writes a 32 MB probe, copies it, and reads how much free space the copy
consumed. macOS `cp -c` falls back to a full byte copy where clonefile is
unavailable and still exits zero, so a probe that only checks the exit status
reports a clone that never happened.

## From source

```sh
git clone https://github.com/eastriverlee/gitto
sh gitto/plugins/gitto/skills/gitto/scripts/install.sh
```

The test suite builds a repository for each case and runs the real script
against it, including one on a disk image that cannot share blocks.

```sh
sh gitto/tests/run
```

## Name

`git` + `ditto`, after the macOS command that copies a directory whole.

## License

MIT
