const { app, BrowserWindow, ipcMain, dialog, screen } = require("electron");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
let mainWindow;
let tvWindow = null;

// Nettoie les noms proposés aux boîtes d’enregistrement Windows/macOS/Linux.
// Les noms proviennent parfois du nom libre d’une compétition, qui peut
// contenir des caractères interdits dans un nom de fichier.
function sanitizeSuggestedFileName(value, fallback = "Document") {
  const raw = String(value ?? "");
  if (!raw.trim()) return fallback;

  const cleaned = raw
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/[. _]+$/g, "");

  if (!cleaned) return fallback;
  if (cleaned.length <= 180) return cleaned;

  // Garder l’extension : une compétition très longue ne doit pas produire
  // un fichier qui perd son .pdf ou son .xlsx dans la boîte d’enregistrement.
  const extension = cleaned.match(/\.[A-Za-z0-9]{1,10}$/)?.[0] || "";
  if (!extension) return cleaned.slice(0, 180);

  const base = cleaned.slice(0, -extension.length);
  return `${base.slice(0, Math.max(1, 180 - extension.length))}${extension}`;
}

function getMainCategory(cat){

  if(cat.startsWith("Elite")) return "Elite";

  if(cat.startsWith("N1")) return "N1";
  if(cat.startsWith("N2")) return "N2";
  if(cat.startsWith("N3")) return "N3";
  if(cat.startsWith("N4")) return "N4";
  if(cat.startsWith("N5")) return "N5";

  return cat;
}

const mainCategoryOrder = [
  "Elite",
  "N1",
  "N2",
  "N3",
  "N4",
  "N5"
];

const colorMap = {

  "Elite":"FACC15",
  "Elite F":"EC4899",
  "Elite V":"6B7280",

  "N1":"DC2626",
  "N1 F":"EC4899",
  "N1 V":"6B7280",

  "N2":"2563EB",
  "N2 F":"EC4899",
  "N2 V":"6B7280",

  "N3":"16A34A",
  "N3 F":"EC4899",
  "N3 V":"6B7280",

  "N4":"FFFFFF",
  "N4 F":"EC4899",
  "N4 V":"6B7280",

  "N5":"EA580C",
  "N5 F":"EC4899",
  "N5 V":"6B7280"
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile("index.html");
  mainWindow.maximize();
}

app.whenReady().then(createWindow);

ipcMain.handle("export-pdf", async (event, options = {}) => {

  try {
    const filePath = dialog.showSaveDialogSync(mainWindow, {
      defaultPath: sanitizeSuggestedFileName(options.fileName, "Document.pdf"),
      filters: [{ name: "Document PDF", extensions: ["pdf"] }]
    });

    // Annuler la boîte de dialogue est un choix normal, pas une erreur.
    if (!filePath) {
      return false;
    }

    const pdfBuffer = await mainWindow.webContents.printToPDF({
      landscape: options.landscape ?? true,
      printBackground: true,
      displayHeaderFooter: false,
      pageSize: "A4",
      margins: options.margins || {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      },
      headerTemplate: "<div></div>",
      footerTemplate: "<div></div>"
    });

    fs.writeFileSync(filePath, pdfBuffer);
    return true;
  } catch (error) {
    console.error("Erreur pendant l’export PDF :", error);
    dialog.showErrorBox(
      "Export PDF impossible",
      "Le fichier PDF n’a pas pu être créé ou enregistré.\n\nVérifie que le dossier est accessible et que le fichier n’est pas déjà utilisé."
    );
    return false;
  }
});

ipcMain.handle("export-jpg", async (event, options = {}) => {
  try {
    const filePath = dialog.showSaveDialogSync(mainWindow, {
      defaultPath: sanitizeSuggestedFileName(options.fileName, "Classement.jpg"),
      filters: [{ name: "Image JPEG", extensions: ["jpg", "jpeg"] }]
    });
    if (!filePath) return false;

    const dataUrl = String(options.dataUrl || "");
    const match = dataUrl.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
    if (!match) throw new Error("Format d’image invalide.");
    const imageBuffer = Buffer.from(match[1], "base64");
    if (!imageBuffer.length || imageBuffer.length > 40 * 1024 * 1024) {
      throw new Error("Taille d’image invalide.");
    }
    fs.writeFileSync(filePath, imageBuffer);
    return true;
  } catch (error) {
    console.error("Erreur pendant l’export JPG :", error);
    dialog.showErrorBox(
      "Export JPG impossible",
      "L’image n’a pas pu être créée ou enregistrée. Vérifie que le dossier est accessible et que le fichier n’est pas déjà utilisé."
    );
    return false;
  }
});

ipcMain.handle("export-jpg-html", async (event, options = {}) => {
  let captureWindow = null;
  try {
    const width = Math.ceil(Number(options.width));
    const height = Math.ceil(Number(options.height));
    const html = String(options.html || "");
    if (!html || html.length > 12 * 1024 * 1024 || !Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width > 6000 || height > 16000) {
      throw new Error("Dimensions ou contenu de l’image invalides.");
    }

    captureWindow = new BrowserWindow({
      show: false,
      width,
      height,
      useContentSize: true,
      backgroundColor: "#ffffff",
      webPreferences: {
        offscreen: true,
        contextIsolation: true,
        sandbox: true
      }
    });
    await captureWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    await captureWindow.webContents.executeJavaScript(`(async () => {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await Promise.all(Array.from(document.images).map(image => image.decode().catch(() => undefined)));
      return true;
    })()`);

    const image = await captureWindow.webContents.capturePage({ x: 0, y: 0, width, height });
    if (!image || image.isEmpty()) throw new Error("La capture du classement est vide.");
    const jpeg = image.toJPEG(94);
    if (!jpeg || !jpeg.length) throw new Error("La conversion en JPG a échoué.");

    const filePath = dialog.showSaveDialogSync(mainWindow, {
      defaultPath: sanitizeSuggestedFileName(options.fileName, "Classement.jpg"),
      filters: [{ name: "Image JPEG", extensions: ["jpg", "jpeg"] }]
    });
    if (!filePath) return false;
    fs.writeFileSync(filePath, jpeg);
    return true;
  } catch (error) {
    console.error("Erreur pendant la capture JPG du classement :", error);
    return { ok: false, error: String(error?.message || error || "Erreur inconnue") };
  } finally {
    if (captureWindow && !captureWindow.isDestroyed()) captureWindow.destroy();
  }
});

ipcMain.handle("export-excel", async (event, data) => {
  try {
    const pilots = Array.isArray(data) ? data : (Array.isArray(data?.pilots) ? data.pilots : []);
    const customCategories = Array.isArray(data?.customCategories) ? data.customCategories : [];
    const exportColorMap = { ...colorMap };
    customCategories.forEach(category => {
      const name = String(category?.name || "").trim();
      const hex = String(category?.color || "").replace(/^#/, "");
      if (name && /^[0-9a-f]{6}$/i.test(hex)) exportColorMap[name] = hex.toUpperCase();
    });

    const filePath = dialog.showSaveDialogSync(mainWindow, {
      defaultPath: sanitizeSuggestedFileName("Pilotes.xlsx", "Pilotes.xlsx"),
      filters: [{ name: "Classeur Excel", extensions: ["xlsx"] }]
    });

    if(!filePath){
      return false;
    }

    const workbook = new ExcelJS.Workbook();

  const categoryOrder = [

    "Elite",
    "Elite F",
    "Elite V",

    "N1",
    "N1 F",
    "N1 V",

    "N2",
    "N2 F",
    "N2 V",

    "N3",
    "N3 F",
    "N3 V",

    "N4",
    "N4 F",
    "N4 V",

    "N5",
    "N5 F",
    "N5 V",
    ...customCategories.map(category => String(category?.name || "").trim()).filter(Boolean)
  ];

  const alpha = [...pilots]
  .sort((a,b)=>
    a.name.localeCompare(b.name)
  );

  const plaque = [...pilots]
  .sort((a,b)=>{

    let catDiff =
      mainCategoryOrder.indexOf(
        getMainCategory(a.cat)
      )
      -
      mainCategoryOrder.indexOf(
        getMainCategory(b.cat)
      );

    if(catDiff !== 0){
      return catDiff;
    }

    let plaqueA =
      parseInt(
        String(a.plaque || "")
        .replace(/[^\d]/g,"")
      ) || 99999;

    let plaqueB =
      parseInt(
        String(b.plaque || "")
        .replace(/[^\d]/g,"")
      ) || 99999;

    if(plaqueA !== plaqueB){
      return plaqueA - plaqueB;
    }

    return a.name.localeCompare(b.name);

  });

  const club = [...pilots]
  .sort((a,b)=>
    (a.club || "")
    .localeCompare(b.club || "")
  );

  const categorie = [...pilots]
  .sort((a,b)=>{

    let diff =
      categoryOrder.indexOf(a.cat)
      -
      categoryOrder.indexOf(b.cat);

    if(diff !== 0){
      return diff;
    }

    return a.name.localeCompare(b.name);

  });

  buildPilotSheet(
    workbook,
    "Tri Alpha",
    alpha,
    exportColorMap
  );

  buildPilotSheet(
    workbook,
    "Tri Plaque",
    plaque,
    exportColorMap
  );

  buildPilotSheet(
    workbook,
    "Tri Club",
    club,
    exportColorMap
  );

  buildPilotSheet(
    workbook,
    "Tri Catégorie",
    categorie,
    exportColorMap
  );

  await workbook.xlsx.writeFile(filePath);

    return true;


  } catch (error) {
    console.error("Erreur pendant l’export des pilotes :", error);
    dialog.showErrorBox(
      "Export Excel impossible",
      "Le fichier Excel n’a pas pu être créé ou enregistré.\n\nVérifie que le dossier est accessible et que le fichier n’est pas déjà utilisé."
    );
    return false;
  }

});

function formatImportedBirthDate(value){

  if(value === null || value === undefined || value === "") return "";

  // Excel stocke les dates sous forme de nombre de jours depuis le 30/12/1899.
  // La fraction correspond à l'heure : on l'ignore pour une date de naissance.
  if(typeof value === "number" && Number.isFinite(value)){
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}-${String(date.getUTCDate()).padStart(2,"0")}`;
  }

  if(value instanceof Date && !Number.isNaN(value.getTime())){
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth()+1).padStart(2,"0")}-${String(value.getUTCDate()).padStart(2,"0")}`;
  }

  const text = String(value).trim();
  const fr = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(fr) return `${fr[3]}-${String(fr[2]).padStart(2,"0")}-${String(fr[1]).padStart(2,"0")}`;

  return text;
}

ipcMain.handle("import-pilots-excel",async () => {

    const result =
      dialog.showOpenDialogSync(
        mainWindow,
        {
          filters:[
            {
              name:"Excel",
              extensions:["xlsx"]
            }
          ],
          properties:["openFile"]
        }
      );

    if(!result){

      return {
        success:false
      };

    }

    const filePath = result[0];

    const workbook =
      new ExcelJS.Workbook();

    await workbook.xlsx.readFile(
      filePath
    );

    const sheet =
      workbook.worksheets[0];

    const expectedHeaders = [

      "Plaque",
      "Nom",
      "Club",
      "Catégorie",
      "Licence",
      "N° licence",
      "Date naissance"

    ];

    const headers = [];

    for(let c=1;c<=7;c++){

      headers.push(

        String(
          sheet.getRow(1)
          .getCell(c)
          .value || ""
        ).trim()

      );

    }

    for(let i=0;i<7;i++){

      if(
        headers[i]
        !==
        expectedHeaders[i]
      ){

        return {
          success:false,
          error:"FORMAT"
        };

      }

    }

    const pilots = [];

    for(
      let r=2;
      r<=sheet.rowCount;
      r++
    ){

      const row =
        sheet.getRow(r);

      const name =
        String(
          row.getCell(2).value || ""
        ).trim();

      if(!name){
        continue;
      }

      pilots.push({

        plaque:
          String(
            row.getCell(1).value || ""
          ).trim(),

        name,

        club:
          String(
            row.getCell(3).value || ""
          ).trim(),

        cat:
          String(
            row.getCell(4).value || ""
          ).trim(),

        lic:
          String(
            row.getCell(5).value || ""
          ).trim(),

        licenceNumber:
          String(
            row.getCell(6).value || ""
          ).trim(),

        birthDate:
  formatImportedBirthDate(
    row.getCell(7).value
  )

      });

    }

    return {
      success:true,
      pilots
    };

  }
);

ipcMain.handle("export-participants-excel", async (event, data) => {
  try {

    const dateFR =
      formatDateForFile(data.competitionDate);

    const filePath = dialog.showSaveDialogSync(
      mainWindow,
      {
        defaultPath: sanitizeSuggestedFileName(
          `Participants_${data.competitionName}_${dateFR}.xlsx`,
          "Participants.xlsx"
        ),
        filters: [{ name: "Classeur Excel", extensions: ["xlsx"] }]
      }
    );

    if(!filePath){
      return false;
    }

    const workbook =
      new ExcelJS.Workbook();

    // Keep formulas editable and automatically recalculated after amount entry,
    // without forcing a full recalculation merely because the workbook is opened.
    workbook.calcProperties = {
      // ExcelJS only serializes fullCalcOnLoad; Excel remains in its normal
      // automatic calculation mode when users edit amount cells.
      fullCalcOnLoad: false
    };
    const exportColorMap = { ...colorMap };
    (Array.isArray(data.customCategories) ? data.customCategories : []).forEach(category => {
      const name = String(category?.name || "").trim();
      const hex = String(category?.color || "").replace(/^#/, "");
      if (name && /^[0-9a-f]{6}$/i.test(hex)) exportColorMap[name] = hex.toUpperCase();
    });

    // =========================================
    // DONNÉES COMMUNES
    // =========================================

    buildParticipantsClubSheet(
      workbook,
      data.participants,
      exportColorMap
    );


    // =========================================
    // CATÉGORIE + ALPHA
    // =========================================

    const categoryOrder = [
      "Elite",
      "Elite F",
      "Elite V",
      "N1",
      "N1 F",
      "N1 V",
      "N2",
      "N2 F",
      "N2 V",
      "N3",
      "N3 F",
      "N3 V",
      "N4",
      "N4 F",
      "N4 V",
      "N5",
      "N5 F",
      "N5 V",
      ...(Array.isArray(data.customCategories) ? data.customCategories.map(category => String(category?.name || "").trim()).filter(Boolean) : [])
    ];

    const categorieAlpha =
      [...data.participants]
        .sort((a, b) => {

          let diff =
            categoryOrder.indexOf(a.cat)
            -
            categoryOrder.indexOf(b.cat);

          if(diff !== 0){
            return diff;
          }

          return a.name.localeCompare(b.name);
        });

    buildParticipantsSimpleSheet(
      workbook,
      "Catégorie + Alpha",
      categorieAlpha,
      exportColorMap
    );


    // =========================================
    // COMPÉTITION TOUTES CATÉGORIES
    // =========================================

    if(data.mode === "toutes"){

      const customCategoryNames = (Array.isArray(data.customCategories) ? data.customCategories : []).map(category => String(category?.name || "").trim()).filter(Boolean);
      const toutesCategories =
    [...data.participants]
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      buildParticipantsSimpleSheet(
        workbook,
        "Toutes catégories",
        toutesCategories,
        exportColorMap
      );


      // =======================================
      // CARTONS TOUTES CATÉGORIES
      // =======================================

      // Les cartons utilisent directement le tri des participants ; les anciens
      // mainCat/cartonOrder locaux n’étaient plus utilisés.

      const cartons =
    [...data.participants]
      .sort((a, b) =>
        a.name.localeCompare(b.name)
      );



    }


    // =========================================
    // COMPÉTITION EN 2 SESSIONS
    // =========================================

    else{

      const customCategoryNames = (Array.isArray(data.customCategories) ? data.customCategories : []).map(category => String(category?.name || "").trim().toLocaleLowerCase("fr")).filter(Boolean);
      const matin =
        data.participants
          .filter(p =>
            p.cat.startsWith("N4")
            ||
            p.cat.startsWith("N5")
            || customCategoryNames.includes(String(p.cat || "").trim().toLocaleLowerCase("fr"))
          )
          .sort((a, b) =>
            a.name.localeCompare(b.name)
          );


      buildParticipantsSimpleSheet(
        workbook,
        "Matin",
        matin,
        exportColorMap
      );


      const apresMidi =
        data.participants
          .filter(p =>
            p.cat.startsWith("Elite")
            ||
            p.cat.startsWith("N1")
            ||
            p.cat.startsWith("N2")
            ||
            p.cat.startsWith("N3")
          )
          .sort((a, b) =>
            a.name.localeCompare(b.name)
          );


      buildParticipantsSimpleSheet(
        workbook,
        "Après-midi",
        apresMidi,
        exportColorMap
      );



    }


    // =========================================
    // CRÉATION DU FICHIER
    // =========================================

    await workbook.xlsx.writeFile(
      filePath
    );

    return true;


  } catch (error) {
    console.error("Erreur pendant l’export des participants :", error);
    dialog.showErrorBox(
      "Export Excel impossible",
      "Le fichier Excel n’a pas pu être créé ou enregistré.\n\nVérifie que le dossier est accessible et que le fichier n’est pas déjà utilisé."
    );
    return false;
  }

});

ipcMain.handle("open-tv", (event, html) => {

  openTVWindow();

  if(tvWindow && !tvWindow.isDestroyed()){

    tvWindow.webContents.send(
      "tv-content",
      html
    );

  }

});

ipcMain.handle("update-tv", (event, html) => {

  if(!tvWindow || tvWindow.isDestroyed()){

    return false;

  }

  tvWindow.webContents.send(
    "tv-content",
    html
  );

  return true;

});

ipcMain.handle("close-tv", () => {

  if(tvWindow && !tvWindow.isDestroyed()){

    tvWindow.close();

    return true;

  }

  return false;

});

function openTVWindow(){

  if(tvWindow && !tvWindow.isDestroyed()){

    tvWindow.show();

    return;

  }


  const displays = screen.getAllDisplays();


  const tvDisplay =
    displays.length > 1
      ? displays[1]
      : displays[0];


  const { x, y } =
    tvDisplay.bounds;


  tvWindow = new BrowserWindow({

    x: x,
    y: y,

    width: tvDisplay.bounds.width,
    height: tvDisplay.bounds.height,

    fullscreen: false,

    frame: true,

    webPreferences: {

      preload: path.join(__dirname, "preload.js"),

      nodeIntegration: false,

      contextIsolation: true

    }

  });

  tvWindow.maximize();

  tvWindow.loadFile(
    path.join(__dirname, "tv.html")
  );


  tvWindow.on("closed", () => {

    tvWindow = null;

    if(mainWindow && !mainWindow.isDestroyed()){

      mainWindow.webContents.send(
        "tv-closed"
      );

    }

  });

}

function buildPilotSheet(workbook,name,pilots,colorMap){

  const sheet = workbook.addWorksheet(name);

  sheet.columns = [

    { header:"Plaque", key:"plaque", width:10 },
    { header:"Nom", key:"name", width:40 },
    { header:"Club", key:"club", width:35 },
    { header:"Catégorie", key:"cat", width:20 },
    { header:"Licence", key:"lic", width:20 },
    { header:"N° licence", key:"licenceNumber", width:20 },
    { header:"Date naissance", key:"birthDate", width:28 }

  ];

  sheet.views = [
    {
      state:"frozen",
      ySplit:1
    }
  ];

    sheet.pageSetup = {
    paperSize:9,
    orientation:"portrait"
  };

  sheet.getRow(1).font = {
    bold:true,
    size:16
  };

  sheet.getRow(1).eachCell(cell => {

  cell.fill = {
    type:"pattern",
    pattern:"solid",
    fgColor:{argb:"E5E7EB"}
  };

});
    
  sheet.getRow(1).alignment = {
    horizontal:"center",
    vertical:"middle"
  };

  pilots.forEach(p=>{

    const row = sheet.addRow({

      plaque:p.plaque || "",

      name:p.name || "",

      club:p.club || "",

      cat:p.cat || "",

      lic:p.lic || "",

      licenceNumber:p.licenceNumber || "",

      birthDate:
  p.birthDate
    ? (() => {

        const parts =
          p.birthDate.split("-");

        if(parts.length !== 3){
          return p.birthDate;
        }

        const year =
          Number(parts[0]);

        const month =
          Number(parts[1]);

        const day =
          Number(parts[2]);

        return new Date(
          year,
          month - 1,
          day
        );

      })()
    : ""

    });
    row.getCell(7).numFmt =
  'dd/mm/yyyy';
    row.eachCell(cell => {

  cell.border = {

    top:    { style:"thin" },
    left:   { style:"thin" },
    bottom: { style:"thin" },
    right:  { style:"thin" }

  };

  
});
sheet.getRow(1).height = 30;
sheet.getRow(1).eachCell(cell => {

  cell.border = {

    top:    { style:"medium" },
    left:   { style:"medium" },
    bottom: { style:"medium" },
    right:  { style:"medium" }

  };



});

    row.font = {
      bold:true,
      size:14
    };

    row.alignment = {
      horizontal:"center",
      vertical:"middle"
    };

    row.getCell(2).alignment = {
      horizontal:"left",
      vertical:"middle"
    };

    const color =
      colorMap[p.cat];

    if(color){

      row.getCell(4).fill = {

        type:"pattern",
        pattern:"solid",
        fgColor:{
          argb:color
        }

      };
    }

  });

  return sheet;
}

function buildParticipantsClubSheet(
  workbook,
  data,
  colorMap
){

  const sheet =
    workbook.addWorksheet(
      "Club + Alpha"
    );

  sheet.columns = [

    { header:"Plaque", key:"plaque", width:10 },
    { header:"Nom", key:"name", width:40 },
    { header:"Club", key:"club", width:35 },
    { header:"Catégorie", key:"cat", width:20 },
    { header:"Licence", key:"lic", width:20 },
    { header:"Date naissance", key:"birthDate", width:28 },
    { header:"Montant", key:"amount", width:18 }

  ];

  sheet.views = [
    {
      state:"frozen",
      ySplit:1
    }
  ];

  sheet.getRow(1).font = {
    bold:true,
    size:16
  };

  sheet.getRow(1).height = 30;

  sheet.getRow(1).alignment = {
    horizontal:"center",
    vertical:"middle"
  };

  sheet.getRow(1).eachCell(cell => {

    cell.fill = {
      type:"pattern",
      pattern:"solid",
      fgColor:{argb:"E5E7EB"}
    };

    cell.border = {
      top:{style:"medium"},
      left:{style:"medium"},
      bottom:{style:"medium"},
      right:{style:"medium"}
    };

  });

  const clubAlpha = [...data]
  .sort((a,b)=>{

    let clubDiff =
      (a.club || "")
      .localeCompare(
        b.club || ""
      );

    if(clubDiff !== 0){
      return clubDiff;
    }

    return (a.name || "")
      .localeCompare(
        b.name || ""
      );

  });

  let currentClub = null;
  let firstRowClub = null;
  let totalRows = [];

  clubAlpha.forEach(p=>{

    if(
      currentClub !== null &&
      currentClub !== p.club
    ){

      const totalRow =
  sheet.addRow([
    "",
    "",
    "",
    "",
    "",
    "TOTAL",
    {
      formula:
        `SUM(G${firstRowClub}:G${sheet.rowCount})`,
      result: 0
    }
  ]);

      totalRow.font = {
        bold:true,
        size:14,
        color:{argb:"FF0000"}
      };

      totalRow.getCell(7).numFmt =
        '# ##0.00 €';

      totalRow.eachCell(cell => {

        cell.border = {
          top:{style:"thin"},
          left:{style:"thin"},
          bottom:{style:"thin"},
          right:{style:"thin"}
        };

      });

      totalRows.push(
        totalRow.number
      );

      sheet.addRow([]);

      firstRowClub = null;
    }

    currentClub = p.club;

    const row = sheet.addRow({

      plaque:p.plaque || "",
      name:p.name || "",
      club:p.club || "",
      cat:p.cat || "",
      lic:p.lic || "",

      birthDate:
        p.birthDate
          ? p.birthDate.split("-").reverse().join("/")
          : "",

      amount:""

    });

    if(firstRowClub === null){
      firstRowClub = row.number;
    }

    row.font = {
      bold:true,
      size:14
    };

    row.alignment = {
      horizontal:"center",
      vertical:"middle"
    };

    row.getCell(2).alignment = {
      horizontal:"left",
      vertical:"middle"
    };

    row.getCell(7).numFmt =
      '# ##0.00 €';

    row.eachCell(cell => {

      cell.border = {
        top:{style:"thin"},
        left:{style:"thin"},
        bottom:{style:"thin"},
        right:{style:"thin"}
      };

    });

    const color =
      colorMap[p.cat];

    if(color){

      row.getCell(4).fill = {

        type:"pattern",
        pattern:"solid",

        fgColor:{
          argb:color
        }

      };

    }

  });

  const lastClubTotal =
    sheet.addRow([
      "",
      "",
      "",
      "",
      "",
      "TOTAL",
      {
      formula:
        `SUM(G${firstRowClub}:G${sheet.rowCount})`,
      result: 0
    }
    ]);

  lastClubTotal.font = {
    bold:true,
    size:14,
    color:{argb:"FF0000"}
  };

  lastClubTotal.getCell(7).numFmt =
    '# ##0.00 €';

  lastClubTotal.eachCell(cell => {

    cell.border = {
      top:{style:"thin"},
      left:{style:"thin"},
      bottom:{style:"thin"},
      right:{style:"thin"}
    };

  });

  totalRows.push(
    lastClubTotal.number
  );

  sheet.addRow([]);

  const grandTotal =
    sheet.addRow([
      "",
      "",
      "",
      "",
      "",
      "TOTAL GÉNÉRAL",
      {
      formula:
        `SUM(${totalRows
          .map(r => `G${r}`)
          .join(",")})`,
      result: 0
    }
    ]);

  grandTotal.font = {
    bold:true,
    size:16,
    color:{argb:"FF0000"}
  };

  grandTotal.getCell(7).numFmt =
    '# ##0.00 €';

  grandTotal.eachCell(cell => {

    cell.border = {
      top:{style:"medium"},
      left:{style:"medium"},
      bottom:{style:"medium"},
      right:{style:"medium"}
    };

  });

}

function buildParticipantsSimpleSheet(
  workbook,
  sheetName,
  participants,
  colorMap
){

  const sheet =
    workbook.addWorksheet(sheetName);

  sheet.columns = [

    { header:"Plaque", key:"plaque", width:10 },
    { header:"Nom", key:"name", width:40 },
    { header:"Club", key:"club", width:35 },
    { header:"Catégorie", key:"cat", width:20 },
    { header:"Licence", key:"lic", width:20 },
    { header:"Date naissance", key:"birthDate", width:28 }

  ];

  sheet.views = [{
    state:"frozen",
    ySplit:1
  }];

  sheet.getRow(1).font = {
    bold:true,
    size:16
  };

  sheet.getRow(1).height = 30;

  sheet.getRow(1).alignment = {
    horizontal:"center",
    vertical:"middle"
  };

  sheet.getRow(1).eachCell(cell => {

    cell.fill = {
      type:"pattern",
      pattern:"solid",
      fgColor:{argb:"E5E7EB"}
    };

    cell.border = {
      top:{style:"medium"},
      left:{style:"medium"},
      bottom:{style:"medium"},
      right:{style:"medium"}
    };

  });

  participants.forEach(p=>{

    const row = sheet.addRow({

      plaque:p.plaque || "",
      name:p.name || "",
      club:p.club || "",
      cat:p.cat || "",
      lic:p.lic || "",

      birthDate:
        p.birthDate
          ? p.birthDate.split("-").reverse().join("/")
          : ""

    });

    row.font = {
      bold:true,
      size:14
    };

    row.alignment = {
      horizontal:"center",
      vertical:"middle"
    };

    row.getCell(2).alignment = {
      horizontal:"left",
      vertical:"middle"
    };

    row.eachCell(cell => {

      cell.border = {
        top:{style:"thin"},
        left:{style:"thin"},
        bottom:{style:"thin"},
        right:{style:"thin"}
      };

    });

    const color =
      colorMap[p.cat];

    if(color){

      row.getCell(4).fill = {
        type:"pattern",
        pattern:"solid",
        fgColor:{argb:color}
      };

    }

  });

}

// Ancien helper plaqueNumber supprimé : aucun appelant ne l’utilisait.

function buildCartonsSheet(
  workbook,
  sheetName,
  pilots,
  colorMap
){

  const sheet =
    workbook.addWorksheet(sheetName);

sheet.pageSetup = {
  paperSize: 9,
  orientation: "portrait",
  verticalCentered:true,
  horizontalCentered: true,
  
  margins: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    header: 0,
    footer: 0
  }
};

  // 27 colonnes
  for(let c=1;c<=27;c++){

    if(c===7 || c===14 || c===21){

      sheet.getColumn(c).width = 0.75;

    }else{

      sheet.getColumn(c).width = 4.1;

    }

  }

  let pilotIndex = 0;
  let startRow = 1;

  while(pilotIndex < pilots.length){

    // bloc de 4 pilotes par page

    for(let slot=0;slot<4;slot++){

      if(pilotIndex >= pilots.length){
        break;
      }

      const pilot =
        pilots[pilotIndex];

      let startCol;

      if(slot===0) startCol=1;
      if(slot===1) startCol=8;
      if(slot===2) startCol=15;
      if(slot===3) startCol=22;

      buildPilotCartons(
        sheet,
        pilot,
        startRow,
        startCol,
        exportColorMap
      );

      pilotIndex++;

    }

    startRow += 33;

  }

if((startRow-1)%33!==0){
  startRow += 33 - ((startRow-1)%33);
}

  // page vierge de secours

  for(let slot=0;slot<4;slot++){

    let startCol;

    if(slot===0) startCol=1;
    if(slot===1) startCol=8;
    if(slot===2) startCol=15;
    if(slot===3) startCol=22;

    buildBlankCartons(
      sheet,
      startRow,
      startCol
    );

  }

}

function buildPilotCartons(
  sheet,
  pilot,
  startRow,
  startCol,
  colorMap
){

  const tours = [

    {
      nom:"TOUR 1",
      color:"95B3D7"
    },

    {
      nom:"TOUR 2",
      color:"FDE9D9"
    },

    {
      nom:"TOUR 3",
      color:"BFBFBF"
    }

  ];

  const catColor =
    colorMap[pilot.cat] || "FFFFFF";

  tours.forEach((tour,index)=>{

    const r =
      startRow + (index * 11);

sheet.getRow(r).height = 30;
sheet.getRow(r+1).height = 30;
sheet.getRow(r+2).height = 25;

for(let rr=r+3; rr<=r+10; rr++){

  sheet.getRow(rr).height = 25;

}

    // L1 Catégorie + Tour

    sheet.mergeCells(r,startCol,r,startCol+2);
    sheet.mergeCells(r,startCol+3,r,startCol+5);

    sheet.getCell(r,startCol).value =
      pilot.cat;

    sheet.getCell(r,startCol+3).value =
      tour.nom;

    // L2 Nom

    sheet.mergeCells(
  r+1,
  startCol,
  r+1,
  startCol+5
);

sheet.getCell(
  r+1,
  startCol
).value = pilot.name;

sheet.getCell(
  r+1,
  startCol
).alignment = {
  horizontal:"center",
  vertical:"middle",
  wrapText:true
};

    // L3 Club + Plaque

        sheet.mergeCells(
      r+2,
      startCol,
      r+2,
      startCol+3
    );

    sheet.mergeCells(
      r+2,
      startCol+4,
      r+2,
      startCol+5
    );

    sheet.getCell(
      r+2,
      startCol
    ).value =
      pilot.club || "";

    sheet.getCell(
      r+2,
      startCol+4
    ).value =
      pilot.plaque || "";

    // L4 barème

    const headers =
      ["0","1","2","N","3","5"];

    for(let i=0;i<6;i++){

      sheet.getCell(
        r+3,
        startCol+i
      ).value =
        headers[i];

    }

    // L5 -> L10

    for(let zone=1;zone<=6;zone++){

      sheet.getCell(
        r+3+zone,
        startCol+3
      ).value =
        String(zone);

    }

    // Total pénalité

    sheet.mergeCells(
      r+10,
      startCol,
      r+10,
      startCol+3
    );

    sheet.mergeCells(
      r+10,
      startCol+4,
      r+10,
      startCol+5
    );

    sheet.getCell(
      r+10,
      startCol
    ).value =
      "TOTAL Pénalité";

    // STYLE

    for(let rr=r;rr<=r+10;rr++){

      for(let cc=startCol;cc<=startCol+5;cc++){

        const cell =
          sheet.getCell(rr,cc);

        cell.font = {
          bold:true,
          size:11
        };

        cell.alignment = {
         horizontal:"center",
         vertical:"middle",
         wrapText:(rr===r+1)
        };

        cell.border = {

          top:{style:"thin"},
          left:{style:"thin"},
          right:{style:"thin"},
          bottom:{style:"thin"}

        };

      }

    }

    // catégorie

    for(let cc=startCol;cc<=startCol+2;cc++){

      sheet.getCell(
        r,
        cc
      ).fill = {

        type:"pattern",
        pattern:"solid",
        fgColor:{
          argb:catColor
        }

      };

    }

    // couleur tour partout

    for(let rr=r;rr<=r+10;rr++){

      for(let cc=startCol;cc<=startCol+5;cc++){

        const isNom =
          rr === r+1;

        const isClubPlaque =
          rr === r+2;

        const isCategorie =
          rr === r &&
          cc <= startCol+2;

        const firstRow = r;
        const lastRow  = r + 10;

        const firstCol = startCol;
        const lastCol  = startCol + 5;

        for(let cc=firstCol; cc<=lastCol; cc++){

  sheet.getCell(firstRow,cc).border = {
    ...sheet.getCell(firstRow,cc).border,
    top:{style:"medium"}
  };

  sheet.getCell(lastRow,cc).border = {
    ...sheet.getCell(lastRow,cc).border,
    bottom:{style:"medium"}
  };

}

for(let rr=firstRow; rr<=lastRow; rr++){

  sheet.getCell(rr,firstCol).border = {
    ...sheet.getCell(rr,firstCol).border,
    left:{style:"medium"}
  };

  sheet.getCell(rr,lastCol).border = {
    ...sheet.getCell(rr,lastCol).border,
    right:{style:"medium"}
  };

}

        if(
          isNom ||
          isClubPlaque ||
          isCategorie
        ){
          continue;
        }

        sheet.getCell(
          rr,
          cc
        ).fill = {

          type:"pattern",
          pattern:"solid",
          fgColor:{
            argb:tour.color
          }

        };

      }

    }

  });

}

function buildBlankCartons(
  sheet,
  startRow,
  startCol
){

  buildPilotCartons(
    sheet,
    {
      name:"",
      club:"",
      plaque:"",
      cat:""
    },
    startRow,
    startCol,
    {}
  );

}

function formatDateForFile(date){

  if(!date){
    return "";
  }

  if(date.includes("/")){
    return date.replaceAll("/", "-");
  }

  if(date.includes("-")){

    const [year, month, day] = date.split("-");

    return `${day}-${month}-${year}`;
  }

  return date;
}