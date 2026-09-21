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

The bar shows the method and HTTP status of the newest run (`GET 200`), **Facet** when there are no runs or the last poll failed, and **Facet missing** when the binary is not on `PATH`. A failed poll clears the list.

Click the bar item for the last few runs and **Open Facet**. That button runs `omarchy-launch-tui` on `facet tui`.

Facet looks for a collection by walking up from its working directory. The shell's directory is usually not a collection, so set **Collection path** in the widget settings to any file or directory inside the collection. Leave it empty to use the process directory.

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

`omarchy plugin validate` checks the manifest. `qmllint` checks the QML against the installed shell imports. Both need an Omarchy machine. Parser checks in this repo do not:

```sh
node tests/model.test.mjs
```

## License

MIT. See [LICENSE](LICENSE).
