# gitto

A clone of your working directory, not of the repository.

`git clone` copies history. `git worktree` copies tracked files. Neither copies
the dependencies you installed or the artifacts you built, so every parallel
lane pays for them again. gitto copies the whole checkout through the
filesystem's own copy-on-write, which takes seconds and costs no disk until one
side writes.

## Install

One POSIX shell script, no runtime.

```bash
curl -fsSL https://gitto.13e7.co/install | sh
```

It lands in `~/.local/bin`. From source, copy
`plugins/gitto/skills/gitto/scripts/gitto` anywhere on your `PATH`.

As an agent plugin it also carries a skill, so a client knows when a clone is
the right move and how to read what `doctor` reports.

```bash
claude plugin marketplace add eastriverlee/gitto
claude plugin install gitto@gitto
```

```bash
codex plugin marketplace add eastriverlee/gitto
codex plugin add gitto@gitto
```

## Commands

Run them from the canonical checkout, or from any clone of it.

```bash
gitto new <name> [<base>]
gitto list
gitto doctor [<name>]
gitto remove <name>
```

`new` makes a clone beside the canonical, named `<canonical>-<name>`, on a
branch of the same name. `<base>` defaults to `origin/HEAD`. Passing `HEAD`
gives you the canonical exactly as it stands, uncommitted work included.

`list` prints every clone with its branch, its uncommitted count and its
unpushed count. `doctor` reports references that still point outside a clone.
`remove` deletes one, and refuses while anything would be lost.

## Why a clone and not a worktree

A worktree shares one repository, which is why it is cheap and why it is
limited. It carries tracked files only, so dependencies, build output and
untracked local configuration are absent from every new one. Its submodules
start uninitialized. Two worktrees share a branch namespace, a stash stack and
a set of registrations, so a name collision in one reaches the other.

A clone made this way shares nothing but disk blocks. It holds its own history,
its own branches and its own index. The filesystem keeps the storage shared
until one side writes, so the independence costs what a worktree costs.

The submodule case is the one that decides it. A submodule's `.git` file is a
relative path, so copying a whole checkout carries every submodule at every
depth along with it. A worktree cannot inherit them, because its submodule
git directories live in the host repository.

## What a copy breaks

A working directory is a web of references to where it lives, and a plain copy
leaves all of them pointing at the original. gitto handles each by what can be
known about it.

| what remembers its address | disposition |
| --- | --- |
| `core.hooksPath` | repointed at the clone's own hooks |
| worktree registrations, at every submodule depth | detached |
| worktrees the canonical keeps inside itself | dropped, their history stays behind |
| symlinks and virtualenvs | reported, never rewritten |

`doctor` knows what git knows. A reference from outside git, an editor
workspace or a line in `~/.ssh/config`, is not on that list. A clean report
means nothing points at the canonical; it never means a directory is safe to
delete.

Removing a clone reads the same web backwards. A clone that hosts the history
of a worktree living elsewhere is refused, because deleting it would leave that
worktree with files and no repository.

## Requirements

A filesystem that can share blocks between two files.

| | |
| --- | --- |
| macOS | APFS, every Mac since 2017 |
| Linux | btrfs, XFS created with `reflink=1`, OpenZFS 2.2 and later |
| Not | ext4 and tmpfs, which cannot share blocks at all |

gitto measures this before it copies anything: it writes a probe file, clones
it, and compares free space across the operation. A filesystem that silently
falls back to a full copy is caught by the measurement, because its exit status
reports success either way.

## Recovering a checkout that lost its git directory

A worktree whose host repository was moved or pruned keeps its files and loses
its history. The files are usually all that mattered, and you can prove it.

Give the orphan a git directory copied from a repository that has the objects,
then read each candidate commit into the index and compare:

```bash
git read-tree <candidate>
git diff --shortstat
git status --porcelain
```

The candidate that leaves both empty is the commit the working tree holds. A
comparison without that first step is misleading, because `git diff <ref>`
resolves paths through the index, and a stale index reports files that are
present on disk as deleted.
