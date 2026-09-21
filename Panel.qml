import QtQuick
import Quickshell
import qs.Commons
import qs.Ui
import "Model.js" as Model

Panel {
  id: root
  moduleName: "virtualmachinist.facet"
  manageIpc: false

  property var anchorItem: null
  property var hostWidget: null
  property var service: null

  readonly property string label: service
    ? Model.barLabel(service.probed, service.installed, service.ok, service.runs)
    : "Facet"
  readonly property string tooltip: {
    if (!service || !service.probed) return "Facet"
    if (!service.installed) return "Install the facet binary and put it on PATH"
    if (!service.ok) return Model.errorText(service.lastError)
    if (!service.runs || service.runs.length === 0) return "No runs"
    var run = service.runs[0]
    return run.requestPath ? run.requestPath : label
  }
  readonly property string collectionLabel: service
    ? Model.collectionName(service.workspace)
    : ""

  function open() {
    root.controller.show()
    if (service && service.refresh) service.refresh()
  }

  function close() {
    root.controller.hide()
  }

  function toggle() {
    if (root.opened) root.close()
    else root.open()
  }

  function switchPanel(direction) {
    if (root.bar && typeof root.bar.switchPanelFrom === "function")
      return root.bar.switchPanelFrom(root.hostWidget || root, direction)
    return false
  }

  function openFacet() {
    if (!service || !service.installed) return
    var path = service.resolvedPath && service.resolvedPath.ok ? service.resolvedPath.path : ""
    var command = ["omarchy-launch-tui", "--app-id=virtualmachinist.facet", "facet", "tui"]
    if (path) command.push(path)
    Quickshell.execDetached(command)
  }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchorItem
    owner: root.hostWidget || root
    bar: root.bar
    open: root.opened
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(Style.space(280))
    contentHeight: panel.fittedContentHeight(content.implicitHeight)

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }

      Column {
        id: content
        width: parent.width
        spacing: Style.space(8)

        Text {
          width: parent.width
          text: "Facet"
          color: root.barForeground
          font.family: root.bar ? root.bar.fontFamily : Style.font.family
          font.pixelSize: Style.font.subtitle
          font.bold: true
        }

        Text {
          width: parent.width
          wrapMode: Text.WordWrap
          text: {
            if (!root.service || !root.service.probed) return "Checking for facet…"
            if (!root.service.installed)
              return "Facet missing. Install the facet binary and put it on the Omarchy session PATH."
            if (!root.service.ok) return Model.errorText(root.service.lastError)
            if (root.collectionLabel !== "") return root.collectionLabel
            if (!root.service.runs || root.service.runs.length === 0)
              return "No collection. Set Collection path to a directory inside your API collection."
            return ""
          }
          visible: text !== ""
          color: root.barForeground
          font.family: root.bar ? root.bar.fontFamily : Style.font.family
          font.pixelSize: Style.font.body
        }

        Repeater {
          model: root.service && root.service.ok ? root.service.runs : []

          Column {
            id: runRow
            required property var modelData
            width: content.width
            spacing: Style.space(2)

            Text {
              width: parent.width
              text: (runRow.modelData.method || "RUN") + " " + Model.statusText(runRow.modelData)
                + (runRow.modelData.failed ? " failed" : "")
              color: root.barForeground
              font.family: root.bar ? root.bar.fontFamily : Style.font.family
              font.pixelSize: Style.font.body
              font.bold: true
              elide: Text.ElideRight
            }

            Text {
              width: parent.width
              text: runRow.modelData.requestPath || "—"
              color: root.barForeground
              font.family: root.bar ? root.bar.fontFamily : Style.font.family
              font.pixelSize: Style.font.caption
              elide: Text.ElideRight
            }

            Text {
              width: parent.width
              text: {
                var when = ""
                if (typeof runRow.modelData.startedAt === "number")
                  when = Qt.formatDateTime(new Date(runRow.modelData.startedAt), "yyyy-MM-dd HH:mm")
                var duration = typeof runRow.modelData.durationMs === "number"
                  ? runRow.modelData.durationMs + " ms"
                  : ""
                if (when && duration) return when + " · " + duration
                return when || duration || "—"
              }
              color: root.barForeground
              font.family: root.bar ? root.bar.fontFamily : Style.font.family
              font.pixelSize: Style.font.caption
              elide: Text.ElideRight
            }
          }
        }

        Text {
          width: parent.width
          text: "Open Facet"
          opacity: root.service && root.service.installed ? 1 : 0.45
          color: root.barForeground
          font.family: root.bar ? root.bar.fontFamily : Style.font.family
          font.pixelSize: Style.font.body
          font.bold: true

          MouseArea {
            anchors.fill: parent
            enabled: root.service && root.service.installed
            cursorShape: enabled ? Qt.PointingHandCursor : Qt.ArrowCursor
            onClicked: root.openFacet()
          }
        }
      }
    }
  }
}
