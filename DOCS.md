# Overview

Copy a whole working directory, dependencies and build output included.

## Why it exists

Open a second branch and you open a second checkout. `git worktree add` makes
one in a moment, and hands you the files git tracks. Everything else you were
working with stays behind: installed dependencies, compiled artifacts,
initialised submodules, the local configuration you never commit.

So each checkout begins with the install and the build you already ran. Three
of them at once, which is what running several agents means, and you have paid
for the same build three times before any of them starts.

Filesystems have been able to avoid this for years. APFS, btrfs, XFS and
OpenZFS all copy a file by pointing at the same blocks and splitting them only
when one side writes, so a copy of a 13 GB checkout costs the time to walk its
directory entries and almost no space. `gitto` copies the directory that way
and repairs what a copy would otherwise break.

## What it is

One POSIX shell script. It copies the canonical checkout with the filesystem's
own clone call, puts the copy on a new branch, and re-addresses the references
that would still point at the original.

A copy of a checkout is not immediately a working checkout, because a checkout
is full of paths to where it lives: `core.hooksPath`, worktree registrations at
every submodule depth, symlinks into the directory it came from. `gitto`
repairs those it can, drops what cannot survive the move, and reports the rest.

Measured on a 13 GB checkout with four submodules: 21 seconds, 60 MB of real
disk.

## What it is not

It does not replace `git clone`, which is how a repository reaches a machine
for the first time. It does not sync, watch or merge anything. It never writes
to the canonical checkout, and it never reaches the network except through the
`git fetch` that `new` runs before it picks a base.

## Setting up the shell

A command cannot change the directory of the shell that started it. Add the
function once and `gitto new` takes you to what it made:

```sh
eval "$(gitto shell-init)"
```

## Where to go next

Read [Concepts](/docs/concepts) for the four words the refusals are written in,
[Commands](/docs/commands) for what each one takes, and
[Caveats](/docs/caveats) before you trust `doctor` with a deletion.

# Concepts

Four words carry the whole tool. The commands and their refusals are written in
them.

## Canonical

The checkout that clones are made from. It is an ordinary git checkout that
nobody works in: it sits on the line you branch from, its dependencies are
installed, its submodules are initialised, and its working tree is clean.

`gitto` finds it from wherever you run it. Inside a clone it reads the `.gitto`
file that records where the clone came from; anywhere else it takes the
repository you are standing in.

A canonical with uncommitted changes passes them to every clone it makes, which
is occasionally what you want and usually a nuisance: those changes then count
as the clone's own, so `remove` refuses to delete it.

## Clone

A copy of the canonical, on its own branch, in its own directory beside it.

It is a real repository. It holds its own history, its own index and its own
reflog, so two clones never contend for one index and a rebase in one is
invisible to the other. Its submodules resolve to git directories inside it,
at every depth.

It is also a real *copy*, which is the part a worktree cannot offer: whatever
the canonical had that git does not track came along, so the tests run before
you have installed anything.

## Address

Everything inside a checkout that records where the checkout lives.

`core.hooksPath` when it was set to an absolute path. The registrations under
`.git/worktrees`, and the same registrations inside every submodule's git
directory. Symlinks whose target is the directory the copy came from. A
virtualenv's activation script, which exports the path it was created at.

A plain `cp` leaves every one of them pointing at the original, which is how a
copy runs the original's hooks and claims the original's worktrees. Handling
them is most of what `gitto` does; [How it works](/docs/how-it-works) lists the
three dispositions it applies.

## Shared blocks

Two files on the same filesystem holding the same storage until one of them is
written to.

The system call has several names. macOS calls it `clonefile` and exposes it as
`cp -c`. Linux calls it a reflink and exposes it as `cp --reflink`. btrfs, XFS
formatted with `reflink=1`, OpenZFS 2.2 and bcachefs all implement it. ext4 and
tmpfs have no way to share blocks between two files.

`gitto` measures rather than asking the filesystem its name, because `cp -c` on
a filesystem without the call succeeds by making a full copy and reports
success either way. See [Measuring the filesystem](/docs/how-it-works/measuring-the-filesystem).

# Commands

Every command finds the canonical from wherever you run it, so a clone answers
the same as the checkout it came from.

## new

```
gitto new <name> [<base>] [--branch <branch>]
```

Copies the canonical into `<canonical>-<name>` beside it, puts the copy on a new
branch, and prints where it landed. The copy carries everything: history,
submodules at every depth, dependencies, build output, and the files git was
told to ignore.

```
$ gitto new auth-fix
cloning storefront -> storefront-auth-fix by clonefile
  repointed core.hooksPath at this clone's own hooks
  branch auth-fix on origin/main, 4 submodules, 60 MB of disk
/Users/you/work/storefront-auth-fix
```

The last line is the path, so `cd "$(gitto new auth-fix | tail -1)"` works in any
shell. The shell function from `shell-init` does it for you.

### Choosing a base

The base defaults to `origin/HEAD`, which is what you want for a branch off the
main line. Pass `HEAD` to take the canonical exactly as it stands, including
work it has not committed, and its submodules stay where they are.

Any other base moves the tree and the submodules to what that revision records.

### Naming the branch

The branch takes the clone's name. When the branch has to be something a
directory name cannot hold, name it:

```
gitto new auth-fix --branch feat/auth-token-refresh
```

### What it refuses

A filesystem that cannot share blocks, which is measured before anything is
copied. A canonical that is a worktree, because its history lives elsewhere.
A name already taken. A base that collides with uncommitted work in the
canonical, which `HEAD` avoids.

Any failure removes the half-built clone before it exits.

## list

```
gitto list [--json]
```

One line per clone: its name, its branch, how much is uncommitted, how much is
unpushed, and what it costs on disk. The first line is the canonical and says
how far behind its upstream it is.

```
$ gitto list
canonical storefront  main  3 behind origin/main
auth-fix          auth-fix           dirty=0     unpushed=0    60 MB
search-ranking    feat/search        dirty=3     unpushed=2    210 MB
```

The disk figure is what the copy actually consumed, measured while it was made.
`du` cannot tell you this, because it counts a shared block once for every file
that points at it.

### Reading it as a machine

`--json` gives the same thing typed, with the name each command takes:

```json
{
  "canonical": { "path": "…", "branch": "main", "behind": 3 },
  "clones": [
    { "name": "auth-fix", "branch": "auth-fix", "dirty": 0,
      "unpushed": 0, "diskKilobytes": 61440, "path": "…" }
  ]
}
```

## sync

```
gitto sync
```

Fetches, moves the canonical forward when it can do so without a merge, and then
runs whatever the project says brings it up to date.

```
$ gitto sync
canonical storefront moved 3 commits forward
  running .gitto-refresh
```

### What the project declares

gitto cannot know what your project has to rebuild after a fetch. The project
does, so it writes it down in `.gitto-refresh` at the root of the canonical:

```sh
bun install --frozen-lockfile
make build
```

`sync` runs that file with `sh` in the canonical and says so before it starts.
Without the file, `sync` fetches and fast-forwards and stops there.

### Why it matters

Every clone starts as a copy of the canonical, so a canonical three weeks behind
hands three-week-old dependencies to every lane you open. Nothing breaks loudly
when that happens; the install you thought you had skipped comes back. `list`
prints the distance on its first line so the drift stays visible.

## prune

```
gitto prune [--remove]
```

Lists the clones whose branch is already merged into the canonical's upstream and
which hold nothing uncommitted or unpushed. With `--remove`, it removes them.

```
$ gitto prune
auth-fix          merged into origin/main
docs-typo         merged into origin/main
2 clones can go. Pass --remove to remove them.
```

### What it leaves alone

A clone with uncommitted changes, a clone with commits no remote has, a clone on
a branch that is not merged, and a clone whose submodules host the history of
worktrees living outside it. Each of those is what `remove` refuses, and `prune`
refuses the same things without saying a word about them.

## doctor

```
gitto doctor [<name>] [--json]
```

Reports what still points outside a clone after the copy: symbolic links into the
canonical, virtual environments holding the old path, submodule history that did
not come along, worktrees the clone hosts for someone else, and settings files in
fixed places that name the clone by path.

```
$ gitto doctor
auth-fix
  nothing git can see points at the canonical
```

### What it can see

Everything git records, and the two cases that bite most often: a symbolic link
whose target resolves outside the clone, and a virtual environment whose
`activate` exports the path it was built at.

It also reads a short list of settings files that live at a fixed address, since
a path written there survives every move and reports nothing when it breaks:
`~/.ssh/config`, `~/.gitconfig`, `/etc/fstab`, launch agents under
`~/Library/LaunchAgents`, unit files under `~/.config/systemd/user`, and the
calling user's crontab.

### What it cannot see

Anything else outside git that names a path: an editor workspace, a build cache,
a shell sitting in the directory, a script in a place nobody thought to look. The
fixed list above is a sample, so a clean report means the references git knows
about are in order and those few files say nothing. It does not mean the
directory is safe to delete.

## remove

```
gitto remove <name>
```

Removes a clone once it holds nothing you would miss.

### What it refuses

Uncommitted changes. Commits no remote has. Worktrees living outside the clone
whose history its submodules hold, because removing it would leave each of them
a directory of files with no repository.

```
$ gitto remove auth-fix
gitto: auth-fix hosts the history of worktrees that live outside it:
        /Users/you/work/storefront-docs
      removing it would leave each of them without a repository.
```

## shell-init

```
eval "$(gitto shell-init)"
```

Emits a shell function and completions for bash and zsh. The function moves you
into a clone as it is made and adds `gitto cd`:

```sh
gitto new auth-fix        # makes it and takes you there
gitto cd search-ranking   # moves between clones
gitto cd                  # lists them
```

A child process cannot change the directory of the shell that started it, which
is why moving into a new clone needs a function rather than a command.

## path

```
gitto path <name>
```

Prints where a clone lives, for scripts and for `cd`.

## adopt

```
gitto adopt <canonical>
```

Points the current directory at that canonical. It does one of two things,
depending on what the directory already is.

### A clone whose canonical moved

Every clone records the canonical's path. Move or rename the canonical and that
path stops resolving, so the clone's commands say the canonical is missing.
Running `adopt` from inside the clone rewrites the record.

### A git worktree

A worktree borrows its history from the repository that created it, which is why
it cannot be moved, why its submodules point back into that repository, and why
the repository cannot be retired while any worktree survives. `adopt` gives the
directory a repository of its own, copied from the canonical block by block, and
takes it off the host's register.

Nothing moves. The directory keeps its path, its branch, and every file at every
submodule depth, tracked, ignored and untracked alike. That matters most for work
sitting inside a submodule, which `git ls-files --others` at the top level does
not see and a copy-the-files migration silently drops.

Before the swap it records the commit, the branch and the status at every depth.
After it, it compares the status against what it recorded and puts the worktree
back exactly as it was if the two differ.

## update

```
gitto update
```

Replaces the running script with what `https://gitto.13e7.co/gitto` serves, after
checking that what arrived parses. `GITTO_SOURCE_URL` points it somewhere else.

```
$ gitto update
gitto 0.2.0 -> 0.3.0 at /Users/you/.local/bin/gitto
```

### When it refuses

A script that is a symbolic link into a checkout already follows whatever that
checkout holds, so replacing it would break the link rather than update anything.
Pull in the checkout instead.

The plugin carries its own copy, which each client updates on its own:
`claude plugin update gitto@13e7`, or for Codex,
`codex plugin marketplace upgrade 13e7` followed by a remove and add.

## version

```
gitto version
```

Prints the version the installed script carries.

# How it works

A run does three things in order, and the first is the cheap one.

## Copying

`gitto` copies the whole directory with the filesystem's clone call, so the
copy shares its blocks with the canonical and costs only the metadata. Nothing
is excluded and nothing is rebuilt: `.git`, the submodules, `node_modules`, the
build directory and the untracked local files all come along.

The time a run takes is the number of files, not their size. A 13 GB checkout
with several hundred thousand entries takes about twenty seconds; the 2.4 GB
prebuilt dependency inside it costs nothing.

## Re-addressing

Then it walks what the copy now claims about itself and applies one of three
dispositions.

| Disposition | What it applies to |
| --- | --- |
| Repair | `core.hooksPath`, which is rewritten to the clone's own hooks |
| Drop | worktree registrations, at the top level and inside every submodule's git directory |
| Report | symlinks and virtualenvs, which `doctor` names and leaves alone |

Dropping the registrations is what keeps a clone from claiming the canonical's
worktrees. Those registrations are copied along with the submodule git
directories that hold them, and a clone that inherits them tells `remove` it is
hosting worktrees it has never seen.

## Measuring the filesystem

Before any of that, `gitto` writes a 32 MB probe file, clones it with the
system call, and compares free space before and after. A copy that consumed the
probe's own size was a full copy, whatever the exit status said.

This matters because `cp -c` on macOS falls back to a full copy on a filesystem
without `clonefile` and reports success. A check that read the exit status
would call a 13 GB full copy a clone.

# Q&A

### Why not use a worktree?

Use one when the tracked files are all you need. A worktree shares one
repository, which is why it costs almost nothing and why it carries almost
nothing: no dependencies, no build output, no initialised submodules, and a
branch that no second worktree may check out.

### Does this work on Linux?

The script is POSIX and uses no BSD-only spelling, so the reflink path calls
`cp --reflink=always` and reads free space through `df -k`. It has not been run
on Linux. The probe measures what a copy actually consumed, so a filesystem it
guesses wrong about refuses the clone rather than making a full copy of 13 GB.

### What happens on ext4?

It refuses and says why. ext4 has no way to share blocks between two files, so
every copy would cost the full size.

```
gitto: copying here costs the full size, so a clone would too.
      macOS needs APFS; Linux needs btrfs, XFS with reflink=1, or OpenZFS 2.2+.
      ext4 and tmpfs cannot share blocks at all.
```

### Can I run it from inside a clone?

Yes, and what you get is another clone of the same canonical. Each clone
records where it came from in a `.gitto` file, so every command resolves the
canonical from wherever you are standing, and a chain of clones of clones
cannot form.

### How do I keep the canonical current?

`gitto sync` fetches, fast-forwards it, and runs `.gitto-refresh` if the project
carries one. `gitto list` prints how far behind the canonical is on its first
line, so the drift is visible before it costs you anything.

### How do I undo one?

`gitto remove <name>`, which refuses while anything would be lost. There is
nothing else to clean up: a clone is one directory, and removing it leaves the
canonical untouched.

### What if the canonical moves?

Every clone records the path it came from, so they report that the canonical is
missing. Move it back, or make fresh clones from its new
location.

### Does it need GitHub, or a remote at all?

`new` runs `git fetch` before it resolves the default base, so a repository
with no remote needs an explicit base, such as `gitto new auth-fix HEAD`.
Nothing else in the tool reaches the network.

### How is this different from a fresh `git clone`?

A clone from a remote downloads the history again and gives you a checkout with
nothing built in it. This copies the local directory, including everything git
does not track, and pays for neither the download nor the build.

# Caveats

## What doctor cannot see

Only git's own records and two file formats that write their own path. Anything
else that points into a directory, including a line in a shell profile or a
process whose working directory is inside it, is invisible to the report.

## What a clone cannot carry

Absolute paths inside files that `doctor` does not know the format of. A
compiled artifact with a build path baked into it, a database with a stored
data directory, a lockfile that recorded where it ran. They are copied
faithfully and they still name the original.

## Which filesystems can share blocks

| System | Works | Does not |
| --- | --- | --- |
| macOS | APFS | HFS+, exFAT |
| Linux | btrfs, XFS with `reflink=1`, OpenZFS 2.2+, bcachefs | ext4, tmpfs, f2fs |

A filesystem missing from this table is measured like any other, so the answer
comes from the probe.
