# gitto

Copy a whole working directory, dependencies and build output included.

```
$ gitto new auth-fix
cloning storefront -> storefront-auth-fix by clonefile
  repointed core.hooksPath at this clone's own hooks
  branch auth-fix on origin/main, 4 submodules

$ cd ../storefront-auth-fix && ls
node_modules/  vendor/  build/  src/  ...
```

A 13 GB checkout in 21 seconds, for 60 MB of real disk. Submodules at every
depth, dependencies and build output all present, nothing to install.

## The problem

`git clone` copies history. `git worktree` shares history and gives you a
second checkout of the tracked files. Both leave behind everything git does not
track, so every new checkout reinstalls and rebuilds what the last one already
has on disk.

A working directory is also more than files. It is files plus references to
where those files are: git's worktree registry, submodule git directories,
`core.hooksPath`, virtualenv activation scripts, symlinks. Copy the files and
you get a directory that still points at the original, quietly running its
hooks and reading its configuration.

`gitto` copies the whole directory for free, then repoints what the move broke.

## Install

```sh
curl -fsSL https://gitto.13e7.co/install | sh
```

### As a plugin

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

### From source

```sh
git clone https://github.com/eastriverlee/gitto
sh gitto/plugins/gitto/skills/gitto/scripts/install.sh
```

## Commands

```
gitto new <name> [<base>]   make a clone of the canonical checkout
gitto list                  show every clone beside the canonical
gitto remove <name>         remove a clone holding nothing unpushed
gitto doctor [<name>]       report references pointing outside a clone
```

One checkout is the canonical, and nothing is worked on there. Clones appear
beside it as `<canonical>-<name>`, and each records where it came from in a
`.gitto` file, so the commands work from either side.

`<base>` defaults to `origin/HEAD`, and submodules move to the pointers it
records. Pass `HEAD` to branch where the canonical stands, carrying its
uncommitted work and leaving its submodules exactly as they are.

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

## Name

`git` + `ditto`, after the macOS command that copies a directory whole.

## License

MIT
