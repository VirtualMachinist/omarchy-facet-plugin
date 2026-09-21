import { readFileSync } from "node:fs"
import { createContext, runInContext } from "node:vm"
import { test } from "node:test"
import assert from "node:assert/strict"

const source = readFileSync(new URL("../Model.js", import.meta.url), "utf8")
  .replace(/^\.pragma library\s*/, "")
const context = createContext({})
runInContext(source + "\nthis.model = { intSetting, collectionPath, historyArgs, parseHistory, barLabel, panelHeadline, statusText, collectionName, defaultHistoryLimit }", context)
const model = context.model
const data = (value) => JSON.parse(JSON.stringify(value))

const sample = {
  schemaVersion: 1,
  workspace: { id: "ws", path: "/home/ada/collections/pets" },
  runs: [
    {
      id: "01JAB",
      startedAt: 1757160000123,
      durationMs: 128,
      requestPath: "items/0",
      method: "POST",
      url: "http://example.test/secret",
      status: 200,
      error: null,
      request: { headers: [{ name: "Authorization", value: "nope" }] }
    },
    {
      id: "01JAC",
      startedAt: 1757160000000,
      durationMs: null,
      requestPath: "items/1",
      method: "GET",
      status: null,
      error: "connection reset"
    }
  ]
}

test("history argv never enables bodies", () => {
  assert.deepEqual(data(model.historyArgs(8, "")), ["facet", "history", "--limit", "8", "--json"])
  assert.deepEqual(
    data(model.historyArgs(3, "/tmp/pets")),
    ["facet", "history", "--limit", "3", "--json", "/tmp/pets"]
  )
})

test("collection path rejects flags and keeps empty as cwd walk", () => {
  assert.deepEqual(data(model.collectionPath({})), { ok: true, path: "" })
  assert.deepEqual(data(model.collectionPath({ collectionPath: "  /tmp/pets  " })), { ok: true, path: "/tmp/pets" })
  assert.deepEqual(data(model.collectionPath({ collectionPath: "--sql" })), { ok: false, path: "" })
  assert.deepEqual(data(model.collectionPath({ collectionPath: "bad\npath" })), { ok: false, path: "" })
})

test("parses a history document and drops payload fields", () => {
  const parsed = model.parseHistory(JSON.stringify(sample))
  assert.equal(parsed.ok, true)
  assert.equal(parsed.workspace.path, "/home/ada/collections/pets")
  assert.equal(parsed.runs.length, 2)
  assert.deepEqual(Object.keys(parsed.runs[0]).sort(), [
    "durationMs", "failed", "id", "method", "requestPath", "startedAt", "status"
  ])
  assert.equal(parsed.runs[0].failed, false)
  assert.equal(parsed.runs[1].status, null)
  assert.equal(parsed.runs[1].failed, true)
  assert.equal(JSON.stringify(parsed).includes("Authorization"), false)
  assert.equal(JSON.stringify(parsed).includes("secret"), false)
})

test("empty store is an empty list, not a fake run", () => {
  const parsed = model.parseHistory(JSON.stringify({ schemaVersion: 1, workspace: null, runs: [] }))
  assert.equal(parsed.ok, true)
  assert.equal(parsed.workspace, null)
  assert.deepEqual(data(parsed.runs), [])
  assert.equal(model.barLabel(true, true, true, parsed.runs), "No runs")
})

test("fail closed on missing binary, bad json, and error envelopes", () => {
  assert.equal(model.barLabel(false, false, false, []), "Facet")
  assert.equal(model.barLabel(true, false, false, []), "Facet missing")
  assert.equal(model.parseHistory("").ok, false)
  assert.equal(model.parseHistory("ID\tSTATUS\n").ok, false)
  assert.equal(model.parseHistory(JSON.stringify({ schemaVersion: 2, runs: [] })).error, "schema")
  const envelope = model.parseHistory(JSON.stringify({
    schemaVersion: 1,
    error: { category: "invalid_arguments", exitCode: 2, message: "/home/secret leaked" }
  }))
  assert.equal(envelope.ok, false)
  assert.equal(envelope.error, "invalid_arguments")
  assert.equal(JSON.stringify(envelope).includes("leaked"), false)
  assert.equal(model.barLabel(true, true, false, [{ method: "GET", status: 200 }]), "Offline")
})

test("bar chip counts runs and never prints method or status", () => {
  const parsed = model.parseHistory(JSON.stringify(sample))
  assert.equal(model.barLabel(true, true, true, parsed.runs), "2 runs")
  assert.equal(model.barLabel(true, true, true, [parsed.runs[0]]), "1 run")
  assert.equal(model.barLabel(true, true, true, parsed.runs).includes("POST"), false)
  assert.equal(model.barLabel(true, true, true, parsed.runs).includes("200"), false)
  assert.equal(model.statusText(parsed.runs[1]), "ERR")
  assert.equal(model.collectionName(parsed.workspace), "pets")
})

test("empty poll with no collection path asks for one settings step", () => {
  const unset = { ok: true, path: "" }
  const set = { ok: true, path: "/tmp/pets" }
  const rejected = { ok: false, path: "" }
  assert.equal(
    model.panelHeadline(true, true, true, 0, unset, ""),
    "No runs. Set Collection path in this widget's settings to a directory inside your API collection."
  )
  assert.equal(model.panelHeadline(true, true, true, 0, set, ""), "No runs in that collection.")
  assert.equal(model.panelHeadline(true, true, true, 2, set, "pets"), "pets")
  assert.equal(
    model.panelHeadline(true, true, false, 0, rejected, ""),
    "Collection path was rejected. Use a directory inside your API collection."
  )
  assert.equal(model.panelHeadline(true, true, false, 3, unset, ""), "Offline. The last poll did not return runs.")
  assert.equal(model.panelHeadline(true, true, false, 0, unset, "").includes("/tmp"), false)
})

test("limits clamp and the default list is three rows", () => {
  assert.equal(model.defaultHistoryLimit(), 3)
  assert.equal(model.intSetting({}, "historyLimit", model.defaultHistoryLimit(), 1, 50), 3)
  assert.equal(model.intSetting({ historyLimit: 0 }, "historyLimit", 3, 1, 50), 1)
  assert.equal(model.intSetting({ historyLimit: "nope" }, "historyLimit", 3, 1, 50), 3)
  const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"))
  assert.equal(manifest.barWidget.defaults.historyLimit, 3)
  const field = manifest.barWidget.schema.find((entry) => entry.key === "historyLimit")
  assert.equal(field.defaultValue, 3)
})
