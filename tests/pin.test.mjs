import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"

const repoRoot = fileURLToPath(new URL("..", import.meta.url))

const PIN_FILES = ["README.md", "SPIKE.md", "Model.js"]
const VERB_FILES = ["Model.js", "Service.qml", "BarWidget.qml", "Panel.qml"]
const READ_FILES = [...new Set([...PIN_FILES, ...VERB_FILES])]

const BANNED_PIN = ["cargo install", "github.com/VirtualMachinist/facet"]
const REQUIRED_PIN = [
  "facet-cli-0.6.0-linux-x64.tar.gz",
  "https://github.com/Hedronite/facet/releases/tag/v0.6.0",
  "8156b4d15b7e8dd8111573c7070754b56a14b5adc9a1a037dd4d13e2a33b1965",
]
const HEADLINE =
  "Facet missing. Install facet-cli-0.6.0-linux-x64.tar.gz from https://github.com/Hedronite/facet/releases/tag/v0.6.0 and put facet on the Omarchy session PATH."
const BANNED_VERBS = ["facet mcp", "facet env", "facet blob", "--bodies", "--sql"]

function readTree(dir) {
  const texts = {}
  for (const name of READ_FILES) texts[name] = readFileSync(join(dir, name), "utf8")
  return texts
}

function audit(texts) {
  const failures = []
  for (const name of PIN_FILES) {
    for (const needle of BANNED_PIN) {
      if (texts[name].includes(needle)) failures.push(`${name} contains ${JSON.stringify(needle)}`)
    }
  }
  for (const name of ["README.md", "SPIKE.md"]) {
    for (const needle of REQUIRED_PIN) {
      if (!texts[name].includes(needle)) failures.push(`${name} lacks ${JSON.stringify(needle)}`)
    }
  }
  if (!texts["Model.js"].includes(HEADLINE)) failures.push("Model.js lacks the missing-binary headline")
  for (const name of VERB_FILES) {
    for (const needle of BANNED_VERBS) {
      if (texts[name].includes(needle)) failures.push(`${name} contains ${JSON.stringify(needle)}`)
    }
  }
  return failures
}

function auditTemp(texts, mutate) {
  const dir = mkdtempSync(join(tmpdir(), "omarchy-pin-"))
  try {
    const copy = { ...texts }
    mutate(copy)
    for (const name of READ_FILES) writeFileSync(join(dir, name), copy[name])
    return audit(readTree(dir))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test("shipped tree keeps the v0.6.0 pin and does not name unused verbs", () => {
  const texts = readTree(repoRoot)
  const failures = audit(texts)
  assert.deepEqual(failures, [], failures.join("\n"))
  assert.match(
    texts["SPIKE.md"],
    /Not invoked, on purpose: `facet mcp`, `facet env`, `facet blob`, `facet history --sql`, `facet history --bodies`\./
  )
})

test("matcher rejects a drifted temp copy and ignores that sentence in SPIKE.md", () => {
  const texts = readTree(repoRoot)
  const cases = [
    ["README.md", (t) => { t["README.md"] += "\ncargo install facet-cli\n" }, "cargo install"],
    ["SPIKE.md", (t) => { t["SPIKE.md"] += "\nhttps://github.com/VirtualMachinist/facet\n" }, "github.com/VirtualMachinist/facet"],
    ["Model.js", (t) => { t["Model.js"] += "\ncargo install facet-cli\n" }, "cargo install"],
    ["README.md", (t) => { t["README.md"] = t["README.md"].replaceAll("facet-cli-0.6.0-linux-x64.tar.gz", "facet-cli-drift.tar.gz") }, "facet-cli-0.6.0-linux-x64.tar.gz"],
    ["SPIKE.md", (t) => { t["SPIKE.md"] = t["SPIKE.md"].replaceAll("https://github.com/Hedronite/facet/releases/tag/v0.6.0", "https://example.invalid/drift") }, "https://github.com/Hedronite/facet/releases/tag/v0.6.0"],
    ["README.md", (t) => { t["README.md"] = t["README.md"].replaceAll("8156b4d15b7e8dd8111573c7070754b56a14b5adc9a1a037dd4d13e2a33b1965", "0".repeat(64)) }, "8156b4d15b7e8dd8111573c7070754b56a14b5adc9a1a037dd4d13e2a33b1965"],
    ["Model.js", (t) => { t["Model.js"] = t["Model.js"].replace(HEADLINE, "Facet missing") }, "headline"],
    ["Service.qml", (t) => { t["Service.qml"] += "\nfacet mcp\n" }, "facet mcp"],
    ["BarWidget.qml", (t) => { t["BarWidget.qml"] += "\nfacet env\n" }, "facet env"],
    ["Panel.qml", (t) => { t["Panel.qml"] += "\nfacet blob\n" }, "facet blob"],
    ["Model.js", (t) => { t["Model.js"] += "\n--bodies\n" }, "--bodies"],
    ["Service.qml", (t) => { t["Service.qml"] += "\n--sql\n" }, "--sql"],
  ]
  for (const [file, mutate, needle] of cases) {
    const failures = auditTemp(texts, mutate)
    assert.ok(
      failures.some((line) => line.includes(file) && (needle === "headline" || line.includes(needle))),
      `expected ${file} drift ${needle} to fail, got ${failures.join("; ") || "(none)"}`
    )
  }
  const spikeVerbs = auditTemp(texts, (t) => {
    t["SPIKE.md"] += "\nNot invoked, on purpose: facet mcp, facet env, facet blob, --bodies, --sql.\n"
  })
  assert.deepEqual(spikeVerbs, [])
})
