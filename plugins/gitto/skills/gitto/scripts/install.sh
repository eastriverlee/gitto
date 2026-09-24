#!/bin/sh
# Put gitto on PATH.
#
#   sh install.sh                                  into ~/.local/bin
#   INSTALL_DIRECTORY=/usr/local/bin sh install.sh
#
# Run beside the gitto script it installs, or on its own, in which case it
# fetches the script from the repository.
set -eu

INSTALL_DIRECTORY="${INSTALL_DIRECTORY:-$HOME/.local/bin}"

scriptDirectory=$(cd "$(dirname "$0")" && pwd)
destination="$INSTALL_DIRECTORY/gitto"

mkdir -p "$INSTALL_DIRECTORY"

if [ -f "$scriptDirectory/gitto" ]; then
    cp "$scriptDirectory/gitto" "$destination"
    echo "installed $destination from $scriptDirectory/gitto"
else
    url="${GITTO_SOURCE_URL:-https://gitto.13e7.co/gitto}"
    curl -fsSL "$url" -o "$destination"
    echo "installed $destination from $url"
fi

chmod +x "$destination"

if ! sh -n "$destination"; then
    rm -f "$destination"
    echo "the installed script does not parse; nothing was left behind" >&2
    exit 1
fi

case ":$PATH:" in
    *":$INSTALL_DIRECTORY:"*) ;;
    *)
        echo
        echo "$INSTALL_DIRECTORY is not on PATH. Add this line to your shell profile:"
        echo "  export PATH=\"$INSTALL_DIRECTORY:\$PATH\""
        ;;
esac
