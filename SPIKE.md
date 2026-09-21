# SPIKE — Facet CLI contract for the Omarchy plugin

Checked against the public Facet tree on 2026-09-21:

- [docs/FACET.md](https://github.com/VirtualMachinist/facet/blob/main/docs/FACET.md) command list and `history` JSON
- [docs/install.md](https://github.com/VirtualMachinist/facet/blob/main/docs/install.md)
- `crates/facet/src/lib.rs` help text and `--json` stripping
- `crates/facet/src/history.rs` (`history` / `last`)

This machine has no `facet` binary and no Omarchy shell, so nothing here was confirmed by executing `facet --help`.

## What the plugin calls

There is no `facet status` subcommand in the public help or in `docs/FACET.md`. Status on the bar is the first row of a real history poll, not a synthetic status document.

```text
command -v facet
facet history --limit <n> --json [<collection-path>]
```

`<n>` comes from the widget setting `historyLimit` (default 3, clamped 1–50). The panel shows that many rows. `<collection-path>` is omitted when the setting is empty. A path that starts with `-` or contains a newline is not passed.

`Open Facet` is not a Facet status call:

```text
omarchy-launch-tui --app-id=virtualmachinist.facet facet tui [<collection-path>]
```

## JSON the plugin accepts

Success (`schemaVersion` is added by Facet's `--json` renderer):

```json
{
  "schemaVersion": 1,
  "workspace": { "id": "…", "path": "…" },
  "runs": [
    {
      "id": "01J…",
      "startedAt": 1757160000123,
      "durationMs": 128,
      "requestPath": "items/0",
      "method": "POST",
      "status": 200,
      "error": null
    }
  ]
}
```

No store, from `history.rs` when the walk finds nothing: `workspace` is JSON `null` and `runs` is `[]`, exit 0. The plugin shows an empty state. It does not invent a run.

A JSON error envelope (`schemaVersion`, `error.category`, `error.exitCode`, `error.message`) or any non-zero exit clears the list. The panel shows `error.category` only. It does not parse `error.message`.

Fields read: `schemaVersion`, `workspace.path`, `runs[].id`, `method`, `status`, `requestPath`, `durationMs`, `startedAt`, and whether `error` is null. Headers, URLs, bodies, hashes, tags, and session ids are ignored. `--bodies` is never passed.

`status: null` is shown as `ERR` (the human table prints `ERR` for that case).

## Still needs a binary to confirm

1. `facet history --limit 8 --json` on a current release prints the document above, including `schemaVersion: 1`, and exits 0 for an empty store.
2. The Omarchy session PATH can see `facet`. A Cargo install under `~/.cargo/bin` is invisible to Quickshell if that directory is not exported to the graphical session. The plugin then stays on **Facet missing**.
3. `omarchy-launch-tui --app-id=virtualmachinist.facet facet tui` opens the TUI. `facet tui [<path>]` is in the public help; the launcher invocation was taken from `bin/omarchy-launch-tui` (`xdg-terminal-exec --app-id=… -e facet tui`).
4. The bar widget reaches the poller with `bar.shell.serviceFor("virtualmachinist.facet")`. That is how other third-party service + bar-widget plugins do it. The shell injects `service` into panel-kind plugins, and this plugin deliberately does not declare a panel kind. A replacement bar that withholds `serviceFor` will leave the widget on "Facet" with no runs.

## Gap that is not a missing `--json` flag

`facet history` with no path walks upward from the process working directory looking for the collection store (`locate_root` in the history command). `omarchy-shell` is not started inside a collection, so an empty **Collection path** setting will usually poll as "no store". The setting is the workaround. A machine-wide "recent runs" JSON command would let the bar omit that setting. `facet last --json` is the wrong poll: no match exits 4 with `run_not_found`, which this plugin would treat as a failed poll and clear the list.

`facet doctor --json` exists and was not used. It reports store paths and secret-backend names, and its exit code is 0, 1, or 9. It is not a run list.

The public `flake.nix` exposes a dev shell only. crates.io `facet-lattice` is the library, not the `facet` binary.

Not invoked, on purpose: `facet mcp`, `facet env`, `facet blob`, `facet history --sql`, `facet history --bodies`.
