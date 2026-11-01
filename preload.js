const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {

  exportPDF: (options) =>
    ipcRenderer.invoke("export-pdf", options),

  exportJPG: (options) =>
    ipcRenderer.invoke("export-jpg", options),

  exportJPGHTML: (options) =>
    ipcRenderer.invoke("export-jpg-html", options),

  openTV: (html) =>
    ipcRenderer.invoke("open-tv", html),

  updateTV: (html) =>
    ipcRenderer.invoke("update-tv", html),

  closeTV: () =>
    ipcRenderer.invoke("close-tv"),

  // Ne pas renvoyer le résultat d'ipcRenderer.on à travers contextBridge :
  // Electron renvoie l'émetteur IPC, qui n'a pas à être exposé au renderer.
  onTVContent: (callback) => {
    ipcRenderer.on("tv-content", (event, html) => {
      callback(html);
    });
  },

  onTVClosed: (callback) => {
    ipcRenderer.on("tv-closed", () => {
      callback();
    });
  },

  exportExcel: (data) =>
    ipcRenderer.invoke("export-excel", data),

  importPilotsExcel: () =>
    ipcRenderer.invoke("import-pilots-excel"),

  exportParticipantsExcel: (data) =>
    ipcRenderer.invoke("export-participants-excel", data),


});