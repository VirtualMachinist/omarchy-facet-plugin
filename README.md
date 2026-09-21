# Facet for Omarchy

A bar plugin for [Omarchy](https://omarchy.org) that shows the latest request recorded by [Facet](https://github.com/VirtualMachinist/facet). Click the bar item for recent runs, or open the Facet terminal UI.

The plugin shells `facet history --json` and renders that document. Facet's files stay on disk.

Linux Omarchy only, not Darwin.

## Install the Facet binary first

Install the `facet` binary yourself, on the PATH of the Omarchy graphical session (the session that starts Quickshell), then check:

```sh
facet --version
facet history --limit 1 --json
```

If `command -v facet` fails in that session, the bar shows **Facet missing**.

Install the binary, not the library:

- **Cargo.** The CLI is not `cargo install facet`.

  ```sh
  cargo install --git https://github.com/VirtualMachinist/facet --package facet-cli --bin facet
  ```

  A release archive from that repository is the shorter path. Extract `facet` onto `PATH` (for example `~/.local/bin`).

- **Nix.** The public Facet flake is a development shell, not an installable package. Build the `facet` binary from that repository and put it on `PATH`.

- **crates.io.** [`facet-lattice`](https://crates.io/crates/facet-lattice) is the run-history library. The `facet` executable comes from the Facet repository above. `cargo add facet-lattice` leaves this plugin without a binary.

`cargo install` lands in `~/.cargo/bin`. That directory has to be on the graphical session PATH, not only in an interactive login shell.

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

`omarchy plugin validate` checks the manifest. `qmllint` checks the QML against the installed shell imports. Both run on Omarchy Linux. Together they are the check for v0.1.1 and for marking the pull request ready. Parser checks in this repo do not replace them:

```sh
node tests/model.test.mjs
```

## License

MIT. See [LICENSE](LICENSE).
