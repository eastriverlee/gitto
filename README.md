# gitto

Clone a working directory, not a repository.

```
$ gitto new auth-fix
cloning internkim -> internkim-auth-fix by clonefile
  detached 26 inherited worktree registrations
  dropped 8 worktrees the canonical keeps inside itself
  repointed core.hooksPath at this replica's own hooks
  branch auth-fix on origin/main, 2 submodules
```

An 18 GB checkout in 122 seconds, for 129 MB of actual disk. Submodules at
every depth, `node_modules`, build output and local files all come along.

## What it is for

`git clone` copies history. `git worktree` shares history and gives you a
second checkout of the tracked files. Both leave behind everything git does not
track, so you install and build again in each one.

A working directory is also more than files. It is files plus a web of
references to where those files are: git's worktree registry, submodule git
directories, `core.hooksPath`, virtualenv activation scripts, symlinks. Copy
the files and you get a directory that still thinks it lives somewhere else.

`gitto` copies the whole directory for free and then re-addresses it.

| what remembers its address | what `gitto` does |
| --- | --- |
| `core.hooksPath` | repoints it at the replica's own hooks |
| inherited worktree registrations | detaches them |
| worktrees nested inside the canonical | drops them — their history stayed behind |
| submodule git directories | verifies none escapes the replica |
| symlinks, virtualenvs, other git config | reports them; `doctor` runs the same scan later |

## Commands

```
gitto new <name> [<base>]   clone the canonical checkout into a new replica
gitto list                  show every replica beside the canonical
gitto remove <name>         remove a replica holding nothing unpushed
gitto doctor [<name>]       report references still pointing outside the replica
```

`<base>` defaults to `origin/HEAD`, and submodules move to the pointers it
records. Pass `HEAD` to branch where the canonical stands, carrying its
uncommitted work and leaving its submodules exactly as they are.

Run from the canonical checkout, or from any replica made out of it — each
replica records where it came from in a `.gitto` file.

A canonical that is itself a worktree is refused: its history lives elsewhere,
so a copy of it is not independent.

## Requirements

A filesystem that shares blocks between a file and its copy.

| | |
| --- | --- |
| macOS | APFS, which every Mac has had since 2017 |
| Linux | btrfs · XFS created with `reflink=1` · OpenZFS 2.2+ · bcachefs |
| Neither | **ext4** and tmpfs, which cannot share blocks at all |

ext4 is the installer default on Ubuntu and Debian, so a replica there would
cost a full copy and `gitto` refuses to make one. Fedora and openSUSE default
to btrfs, and the RHEL family to XFS, where `mkfs.xfs` has enabled reflink by
default since xfsprogs 5.1.

`gitto` decides by measuring rather than by asking the filesystem its name: it
writes a 32 MB probe, copies it, and reads how much free space the copy
consumed. macOS `cp -c` falls back to a full byte copy where clonefile is
unavailable and still exits zero, so a probe that only checks the exit status
reports a clone that never happened.

## Name

`git` + `ditto`, after the macOS command that copies a directory whole.
