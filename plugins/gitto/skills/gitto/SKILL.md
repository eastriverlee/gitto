---
name: gitto
description: Make a second, independent checkout of a repository that already has its submodules, node_modules, build output and local configuration in place, for free. Use when work needs its own checkout, when several tasks or agents run on one repository at once, when reaching for `git worktree`, when a checkout is needed only until the work merges, or when asked where a clone came from or whether one is safe to delete.
---

# gitto

`git clone` copies history. `git worktree` shares history and gives a second
checkout of the tracked files. Both leave behind everything git does not track,
so each new checkout installs and builds again what the last one already has.

`gitto` copies the whole working directory through the filesystem, which costs
nothing until either side writes, and then repoints what the move broke.

    cd <the canonical checkout>
    gitto new auth-fix
    cd ../<canonical>-auth-fix

Measured on a 13 GB checkout with four submodules: 21 seconds, 60 MB of real
disk, `node_modules` and a 2.4 GB prebuilt dependency already in place.

## When to reach for it

Reach for it when work wants its own checkout: parallel tasks, a risky refactor,
a build that must not disturb the one running, a branch kept until it merges.

Reach for it instead of `git worktree` on a filesystem that shares blocks.
A worktree's advantage is a shared object store, which is free here anyway, so
only its costs remain: submodules arrive uninitialised, ignored files are gone,
and the branch namespace and stash stack stay shared with every other worktree.

Do not reach for it to read a different revision. `git show`, `git diff` and
`git cat-file` answer that without a second directory.

## Commands

    gitto new <name> [<base>]   make a clone of the canonical checkout
    gitto list                  show every clone beside the canonical
    gitto remove <name>         remove a clone holding nothing unpushed
    gitto doctor [<name>]       report what points outside a clone, and what it hosts

`<base>` defaults to `origin/HEAD`, and submodules move to the pointers it
records. Pass `HEAD` to branch where the canonical stands, carrying its
uncommitted work and leaving its submodules exactly as they are.

Run any of these from the canonical checkout or from a clone of it. Each clone
records where it came from in a `.gitto` file, so the commands find the
canonical either way.

## The canonical

One checkout is the canonical, and nothing is worked on there. Clones appear
beside it as `<canonical>-<name>`.

Keep the canonical clean. Untracked files there are inherited by every clone,
which then reports them as uncommitted forever, and `gitto remove` refuses a
clone with uncommitted changes. A dirty canonical therefore disables that
safety check.

`gitto new` prints what it carried from the canonical. When that line names
commits or files you did not expect, the canonical is where to fix it.

## What it refuses, and why

**A canonical that is itself a worktree.** Its history lives in another
repository, so a copy of it is not independent. Make the canonical a real clone
once, and take every later checkout from it.

**A filesystem that cannot share blocks.** macOS needs APFS; Linux needs btrfs,
XFS created with `reflink=1`, OpenZFS 2.2+ or bcachefs. ext4 and tmpfs cannot,
and ext4 is the installer default on Ubuntu and Debian. The refusal is
deliberate: a clone there would cost a full copy.

**A clone other worktrees live off.** A clone's submodules can host worktrees
that sit outside it, and removing the clone would delete their git directories
and leave each one a tree of files with a `.git` pointing at nothing. The
refusal names them.

**A base that collides with the canonical's uncommitted work.** Commit or drop
it there, or take the clone at `HEAD`, which carries it along.

## A worktree that already exists

`gitto adopt <canonical>`, run from inside a git worktree, gives that directory a
repository of its own without moving it. Reach for it before copying files out of
a worktree: untracked work inside a submodule never appears in `git ls-files
--others` at the top level, so a copy leaves it behind without saying so.

## What doctor can see

`doctor` reports references that point outside a clone: git configuration,
symlinks, virtualenv activation scripts, submodule git directories that escaped,
and worktrees the clone hosts.

Given no name it reports the canonical as well. A canonical hosts worktrees like
any other checkout, and it is the one nobody checks before renaming it. For each
hosted worktree, at the top level and at every submodule depth, it holds the
registration against that worktree's own `gitdir` marker and says when the two
disagree. A marker carries an absolute path, so renaming a checkout frees that
address for whatever moves in next, and the marker goes on resolving to a
repository that never registered it.

Never read such a worktree's state from output alone. `git status` inside one
fails with `not a git repository`. The exit status says so; a count of output
lines reports a clean tree. Run `doctor` before renaming, retiring or deleting
any checkout.

It reports what git can see. Nothing in git records that a shell has its cwd
inside a directory, that `~/.ssh/config` runs a script from one, or that a
launch agent watches one. A clean `doctor` means the references git knows about
are in order, and never that a directory is safe to delete. Say it that way.

## Repairing a clone whose git directory was lost

When a directory is left with a `.git` pointing at nothing, the files are
usually intact and only the link is gone. Do not delete it and do not guess
which branch it held.

1. Copy a live git directory for that repository into it (`cp -c -R` on APFS
   costs nothing), then strip `core.worktree` and `core.bare` from the copied
   `config` before running git, or git cannot open the repository at all.
2. Read each candidate into the index without touching the working tree:
   `git read-tree <ref>`, then `git update-index --refresh`, then
   `git diff --shortstat` and `git ls-files --others --exclude-standard`.
   The ref that reports no differences and no untracked files is the one it
   held. Comparing with a stale index instead reports files as deleted that are
   sitting on disk.
3. Point the branch and HEAD at that ref with `update-ref` and `symbolic-ref`
   `checkout` refuses while the index disagrees.
