import QtQuick
import Quickshell
import Quickshell.Io
import "Model.js" as Model

// Headless poller. The only Facet commands it runs are:
//   command -v facet
//   facet history --limit <n> --json [<collection-path>]
// It does not read Facet's files, request bodies, or environment values.
Item {
  id: root

  property var settings: ({})
  property bool probed: false
  property bool installed: false
  property bool refreshing: false
  property bool ok: false
  property var runs: []
  property var workspace: null
  property string lastError: ""
  property date lastUpdated: new Date(0)

  readonly property int refreshIntervalSec: Model.intSetting(settings, "refreshIntervalSec", 30, 10, 600)
  readonly property int historyLimit: Model.intSetting(settings, "historyLimit", 8, 1, 50)
  readonly property var resolvedPath: Model.collectionPath(settings)

  property int _generation: 0
  property int _probeGeneration: 0
  property int _historyGeneration: 0
  property bool _refreshQueued: false
  property string _probeOutput: ""
  property string _historyOutput: ""

  function refresh() {
    if (probeProcess.running || historyProcess.running) {
      _refreshQueued = true
      return
    }
    refreshing = true
    _generation += 1
    _probeGeneration = _generation
    _probeOutput = ""
    probeProcess.running = true
  }

  function settle() {
    refreshing = false
    if (!_refreshQueued) return
    _refreshQueued = false
    Qt.callLater(root.refresh)
  }

  function finishProbe(stdout) {
    if (_probeGeneration !== _generation) {
      settle()
      return
    }
    var text = String(stdout || "").trim()
    probed = true
    if (text !== "present") {
      installed = false
      ok = false
      runs = []
      workspace = null
      lastError = ""
      settle()
      return
    }
    installed = true
    if (!resolvedPath.ok) {
      ok = false
      runs = []
      workspace = null
      lastError = "invalid_collection_path"
      settle()
      return
    }
    _historyGeneration = _generation
    _historyOutput = ""
    historyProcess.command = Model.historyArgs(historyLimit, resolvedPath.path)
    historyProcess.running = true
  }

  function finishHistory(exitCode, stdout) {
    if (_historyGeneration !== _generation) {
      settle()
      return
    }
    var parsed = Model.parseHistory(stdout)
    if (exitCode !== 0 || !parsed.ok) {
      ok = false
      runs = []
      workspace = null
      lastError = parsed.ok ? "history_failed" : parsed.error
      lastUpdated = new Date()
      settle()
      return
    }
    ok = true
    runs = parsed.runs.slice(0, historyLimit)
    workspace = parsed.workspace
    lastError = ""
    lastUpdated = new Date()
    settle()
  }

  onSettingsChanged: refresh()

  Timer {
    interval: root.refreshIntervalSec * 1000
    repeat: true
    running: true
    triggeredOnStart: true
    onTriggered: root.refresh()
  }

  Process {
    id: probeProcess
    running: false
    // bash exits even when `facet` is not installed. A bare `facet` process
    // would never emit `exited` in that case, and the poll would stick.
    command: ["bash", "-c", "command -v facet >/dev/null 2>&1 && echo present || echo missing"]
    stdout: StdioCollector {
      id: probeStdout
      waitForEnd: true
      onStreamFinished: root._probeOutput = text
    }
    onExited: function(exitCode) {
      root.finishProbe(String(probeStdout.text || root._probeOutput || ""))
    }
  }

  Process {
    id: historyProcess
    running: false
    command: ["facet", "history", "--limit", "8", "--json"]
    stdout: StdioCollector {
      id: historyStdout
      waitForEnd: true
      onStreamFinished: root._historyOutput = text
    }
    stderr: StdioCollector {
      id: historyStderr
      waitForEnd: true
    }
    onExited: function(exitCode) {
      root.finishHistory(exitCode, String(historyStdout.text || root._historyOutput || ""))
    }
  }
}
