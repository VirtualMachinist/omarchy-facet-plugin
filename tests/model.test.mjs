import { readFileSync } from "node:fs"
import { createContext, runInContext } from "node:vm"
import { test } from "node:test"
import assert from "node:assert/strict"

const source = readFileSync(new URL("../Model.js", import.meta.url), "utf8")
  .replace(/^\.pragma library\s*/, "")
const context = createContext({})
runInContext(source + "\nthis.model = { intSetting, collectionPath, historyArgs, parseHistory, barLabel, statusText, collectionName, errorText }", context)
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
  assert.equal(model.barLabel(true, true, true, parsed.runs), "Facet")
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
  assert.equal(model.errorText(envelope.error), "invalid_arguments")
  assert.equal(model.barLabel(true, true, false, [{ method: "GET", status: 200 }]), "Facet")
})

test("bar status comes from the newest row only", () => {
  const parsed = model.parseHistory(JSON.stringify(sample))
  assert.equal(model.barLabel(true, true, true, parsed.runs), "POST 200")
  assert.equal(model.statusText(parsed.runs[1]), "ERR")
  assert.equal(model.collectionName(parsed.workspace), "pets")
})

test("limits clamp", () => {
  assert.equal(model.intSetting({}, "historyLimit", 8, 1, 50), 8)
  assert.equal(model.intSetting({ historyLimit: 0 }, "historyLimit", 8, 1, 50), 1)
  assert.equal(model.intSetting({ historyLimit: "nope" }, "historyLimit", 8, 1, 50), 8)
})
