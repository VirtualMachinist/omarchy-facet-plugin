# Facet for Omarchy

A bar plugin for [Omarchy](https://omarchy.org) that shows the latest request recorded by [Facet](https://github.com/Hedronite/facet). Click the bar item for recent runs, or open the Facet terminal UI.

The plugin shells `facet history --json` and renders that document. Facet's files stay on disk.

Linux Omarchy only, not Darwin.

## Install the Facet binary first

This plugin does not install the `facet` binary. Install Facet 0.6.0 yourself before `omarchy plugin add`.

1. Download `facet-cli-0.6.0-linux-x64.tar.gz` from the release <https://github.com/Hedronite/facet/releases/tag/v0.6.0>.
2. Check its sha256 is `8156b4d15b7e8dd8111573c7070754b56a14b5adc9a1a037dd4d13e2a33b1965`:

   ```sh
   echo "8156b4d15b7e8dd8111573c7070754b56a14b5adc9a1a037dd4d13e2a33b1965  facet-cli-0.6.0-linux-x64.tar.gz" | sha256sum -c -
   ```

3. Extract `facet` and put it on the PATH of the Omarchy graphical session (the session that starts Quickshell), for example `~/.local/bin`. A directory exported only by an interactive login shell is not enough.

Then check, from that session:

```sh
facet --version
facet history --limit 1 --json
```

`facet --version` prints `facet 0.6.0 (probe 0.5.9)`. If `command -v facet` fails in that session, the bar shows **Facet missing**.

crates.io [`facet-lattice`](https://crates.io/crates/facet-lattice) is the run-history library, not the `facet` executable. `cargo add facet-lattice` leaves this plugin without a binary.

## Install the plugin

```sh
omarchy plugin add https://github.com/VirtualMachinist/omarchy-facet-plugin.git --enable
```

The widget defaults to the right side of the bar. Move it with:

```sh
omarchy bar move virtualmachinist.facet --section right
```

Remove it with:

```sh
omarchy plugin remove virtualmachinist.facet
```

Removing the plugin leaves the `facet` binary in place.

## Use

The bar chip stays short:

- **Facet missing** when `facet` is not on `PATH`
- **No runs** when the binary answered and the list is empty
- **3 runs** (or **1 run**) for however many runs came back
- **Offline** when a poll fails

A failed poll clears the list.

Click the chip for those runs and **Open Facet**. That button runs `omarchy-launch-tui` on `facet tui`. The panel shows about three runs by default (`historyLimit` is 3). Raise **Recent runs** in the widget settings if you want a longer list.

If the chip says **No runs**, the shell's working directory is usually outside your API collection. One settings step: open the widget settings and set **Collection path** to any file or directory inside that collection. Leave the field empty only when Facet should search from the shell's own directory. A path that starts with `-` or contains a newline is ignored.

The plugin runs only:

```text
command -v facet
facet history --limit <n> --json [<collection-path>]
omarchy-launch-tui --app-id=virtualmachinist.facet facet tui [<collection-path>]
```

The history call is metadata only: `--limit` and `--json`. Stored bodies stay out of the poll.

## Check the plugin

From a checkout, on Omarchy:

```sh
omarchy plugin validate .
qmllint -I "$OMARCHY_PATH/shell" Service.qml BarWidget.qml Panel.qml
```

`omarchy plugin validate` checks the manifest. `qmllint` checks the QML against the installed shell imports. Both run on Omarchy Linux. Together they are the check for plugin version 0.1.0 and for marking the pull request ready. Parser checks in this repo do not replace them:

```sh
node tests/model.test.mjs
```

## License

MIT. See [LICENSE](LICENSE).
