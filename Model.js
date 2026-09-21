.pragma library

// Presentation of `facet history --json`. This file does not run Facet,
// open its store, or fill in runs that the CLI did not return.

function intSetting(settings, name, fallback, minimum, maximum) {
  var source = settings && settings[name] !== undefined && settings[name] !== null
    ? settings[name]
    : fallback
  var value = parseInt(String(source), 10)
  if (!isFinite(value)) value = fallback
  if (value < minimum) value = minimum
  if (value > maximum) value = maximum
  return value
}

// Empty means "omit the path and let Facet walk from its working directory".
// A value that could be read as a flag is rejected so it is never passed through.
function collectionPath(settings) {
  var raw = settings ? settings.collectionPath : ""
  if (raw === undefined || raw === null) return { ok: true, path: "" }
  var path = String(raw).trim()
  if (path === "") return { ok: true, path: "" }
  if (path.charAt(0) === "-" || path.indexOf("\n") !== -1 || path.indexOf("\r") !== -1 || path.indexOf("\0") !== -1)
    return { ok: false, path: "" }
  return { ok: true, path: path }
}

function defaultHistoryLimit() {
  return 3
}

function historyArgs(limit, path) {
  var args = ["facet", "history", "--limit", String(limit), "--json"]
  if (path) args.push(path)
  return args
}

function parseHistory(text) {
  var raw = String(text || "").trim()
  if (raw === "") return { ok: false, error: "empty" }
  var value
  try {
    value = JSON.parse(raw)
  } catch (e) {
    return { ok: false, error: "not_json" }
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { ok: false, error: "not_object" }
  if (value.schemaVersion !== 1) return { ok: false, error: "schema" }
  if (value.error && typeof value.error === "object") {
    var category = typeof value.error.category === "string" && value.error.category !== ""
      ? value.error.category
      : "error"
    return { ok: false, error: category }
  }
  if (!Array.isArray(value.runs)) return { ok: false, error: "no_runs" }

  var runs = []
  for (var i = 0; i < value.runs.length; i++) {
    var row = value.runs[i]
    if (!row || typeof row !== "object" || Array.isArray(row)) continue
    runs.push({
      id: typeof row.id === "string" ? row.id : "",
      method: typeof row.method === "string" ? row.method : "",
      status: typeof row.status === "number" && isFinite(row.status) ? row.status : null,
      requestPath: typeof row.requestPath === "string" ? row.requestPath : "",
      durationMs: typeof row.durationMs === "number" && isFinite(row.durationMs) ? row.durationMs : null,
      startedAt: typeof row.startedAt === "number" && isFinite(row.startedAt) ? row.startedAt : null,
      failed: row.error !== null && row.error !== undefined
    })
  }

  var workspace = null
  if (value.workspace && typeof value.workspace === "object" && !Array.isArray(value.workspace)) {
    workspace = {
      path: typeof value.workspace.path === "string" ? value.workspace.path : ""
    }
  }
  return { ok: true, runs: runs, workspace: workspace }
}

function barLabel(probed, installed, ok, runs) {
  if (!probed) return "Facet"
  if (!installed) return "Facet missing"
  if (!ok) return "Offline"
  var count = runs && runs.length ? runs.length : 0
  if (count === 0) return "No runs"
  if (count === 1) return "1 run"
  return count + " runs"
}

// Panel sentence above the run list. The settings nudge appears only when
// the poll succeeded, the list is empty, and Collection path is still blank.
function panelHeadline(probed, installed, ok, runCount, pathResult, collectionLabel) {
  if (!probed) return "Checking for facet…"
  if (!installed)
    return "Facet missing. Install the facet binary and put it on the Omarchy session PATH."
  if (!ok) {
    if (pathResult && pathResult.ok === false)
      return "Collection path was rejected. Use a directory inside your API collection."
    return "Offline. The last poll did not return runs."
  }
  if (collectionLabel) return collectionLabel
  if (!runCount) {
    if (!pathResult || !pathResult.path)
      return "No runs. Set Collection path in this widget's settings to a directory inside your API collection."
    return "No runs in that collection."
  }
  return ""
}

function statusText(run) {
  if (!run) return ""
  if (run.status === null || run.status === undefined) return "ERR"
  return String(run.status)
}

function collectionName(workspace) {
  if (!workspace || !workspace.path) return ""
  var path = String(workspace.path)
  var trimmed = path.replace(/\/+$/, "")
  var slash = trimmed.lastIndexOf("/")
  return slash >= 0 ? trimmed.substring(slash + 1) : trimmed
}
