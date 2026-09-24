---
description: Put the gitto command on PATH
---

Install the `gitto` command on this machine.

1. Run the installer that ships with this plugin:

   ```sh
   sh "${CLAUDE_PLUGIN_ROOT}/skills/gitto/scripts/install.sh"
   ```

   It copies the script into `~/.local/bin` and checks that it parses. Pass
   `INSTALL_DIRECTORY` to put it somewhere else.

2. Confirm it answers:

   ```sh
   gitto 2>&1 | head -1
   ```

   The usage line means it is installed. A "command not found" here means
   `~/.local/bin` is missing from `PATH`. Say so and give the line to add,
   rather than moving the script somewhere else.

3. Check that this machine can actually clone blocks, since `gitto` refuses
   rather than making a full copy where it cannot:

   ```sh
   cd <a git checkout> && gitto list
   ```

   A filesystem complaint here is the answer, not a failure to work around.
   macOS needs APFS; Linux needs btrfs, XFS with `reflink=1`, OpenZFS 2.2+ or
   bcachefs.
