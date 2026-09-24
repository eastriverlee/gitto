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

Every command takes the canonical from where you run it, and every one of them
refuses when it cannot be sure.

## new

```
gitto new <name> [<base>]
```

Copies the canonical into `<canonical>-<name>` beside it, puts the copy on a
branch called `<name>`, and prints the path.

```
$ gitto new auth-fix
cloning storefront -> storefront-auth-fix by clonefile
  repointed core.hooksPath at this clone's own hooks
  branch auth-fix on origin/main, 4 submodules
/Users/you/work/storefront-auth-fix
```

### Choosing a base

`<base>` is any revision, and it defaults to `origin/HEAD` after a fetch, so a
clone starts from the line you branch from however stale the canonical is.

Passing `HEAD` means the canonical exactly as it stands, uncommitted work
included, which is how you hand an agent the state you are in. With any other
base the submodules move to the pointers that revision records; with `HEAD`
they are left alone, because you asked for what is there.

### What it refuses

A filesystem that cannot share blocks, which is measured before anything is
copied. A canonical that is itself a worktree, since its history lives in another
directory and the copy would have none. A destination that already exists.

A failure after the copy has begun removes the partial clone before it exits,
so a run that dies has left nothing behind.

## list

```
gitto list
```

Prints the canonical and every clone beside it, with each one's branch, how
many uncommitted changes it holds and how many commits it has that its upstream
does not.

```
$ gitto list
canonical storefront  main
storefront-auth-fix      auth-fix               dirty=0     unpushed=0
storefront-search        feat/search-ranking    dirty=3     unpushed=2
```

The two counts are what `remove` reads, so this is the list of what you would
lose.

## doctor

```
gitto doctor [<name>]
```

Reports what still points outside a clone: symlinks into the canonical,
absolute hook paths, submodule git directories that escaped, and worktrees the
clone hosts for someone else.

```
$ gitto doctor search
storefront-search
  still pointing outside this clone:
    symlink  .agents -> /Users/you/work/storefront/.agents
    hosts    storefront-docs
```

### What it can see

Everything git records: configuration, worktree registrations at every
submodule depth, and the git directory each submodule resolves to. Symlinks and
virtualenv activation scripts, because both write their own path into a file.

### What it cannot see

Any reference that lives outside git. An editor workspace, a launch agent, a
line in `~/.ssh/config`, the working directory of a shell someone left open.

A clean report therefore means that nothing git knows about points at the
canonical. Treating it as permission to delete a directory is a mistake the
report cannot warn you about.

## remove

```
gitto remove <name>
```

Deletes a clone, once it has established that nothing would be lost.

### What it refuses

Uncommitted changes. Commits the upstream does not have. And the case that is
easy to miss: a clone whose submodules host the git directory of a worktree
living somewhere else.

```
$ gitto remove search
gitto: search hosts the history of worktrees that live outside it:
        /Users/you/work/storefront-docs
      removing it would leave each of them without a repository.
```

Deleting that clone would leave those worktrees as directories of files with no
repository behind them, which git reports as a missing path long after the
cause is gone.

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
