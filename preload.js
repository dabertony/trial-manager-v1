const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {

  exportPDF: (options) =>
    ipcRenderer.invoke("export-pdf", options),

  openTV: (html) =>
    ipcRenderer.invoke("open-tv", html),

  updateTV: (html) =>
    ipcRenderer.invoke("update-tv", html),

  closeTV: () =>
    ipcRenderer.invoke("close-tv"),

  onTVContent: (callback) =>
    ipcRenderer.on("tv-content", (event, html) => {
      callback(html);
    }),

  onTVClosed: (callback) =>
    ipcRenderer.on("tv-closed", () => {
    callback();
  }),

  exportExcel: (data) =>
    ipcRenderer.invoke("export-excel", data),

  importPilotsExcel: () =>
    ipcRenderer.invoke("import-pilots-excel"),

  exportParticipantsExcel: (data) =>
    ipcRenderer.invoke("export-participants-excel", data),

  exportDoublePointageMatin: (data) =>
    ipcRenderer.invoke("export-double-pointage-matin", data),

  exportDoublePointageApresMidi: (data) =>
    ipcRenderer.invoke("export-double-pointage-apres-midi",  data)

});