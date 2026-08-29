console.log("APP JS LOAD", new Date().toISOString());
const app = document.getElementById("app");

let tvDisplayActive = false;
let currentCompetitionIndex = null;

function render() {

  switch(state.ui.currentScreen) {

    case "home":
      renderHome();
      break;

    case "pilots":
      renderPilots();
      break;

    case "competition":
      renderCompetition();
      break;
  }
}

function renderHome() {
  home();
}

function renderPilots() {
  showPilots();
}

function renderCompetition() {

  if(state.ui.selectedCompetition === null){
    return;
  }

  openCompetition(state.ui.selectedCompetition);
}

function goPilots(){

  state.ui.currentScreen = "pilots";

  render();
}

function goHome(){

  state.ui.currentScreen = "home";

  render();
}

function cancelForm(){

  if(window._formResolve){
    window._formResolve({});
  }

  render();
}

function askForm(title, fields){

  return new Promise(resolve => {

    const previousHTML = app.innerHTML;

    app.innerHTML = `
      <h3>${title}</h3>

      <div class="card">
        ${fields.map(f => `
          <input
            id="${f.key}"
            type="${f.type || "text"}"
            placeholder="${f.label}"
          >
          <br><br>
        `).join("")}
      </div>

      <button id="submitFormBtn">Valider</button>
      <button class="delete" id="cancelFormBtn">Annuler</button>
    `;

    setTimeout(() => {
      document.querySelector("input")?.focus();
    }, 0);

    const submitBtn = document.getElementById("submitFormBtn");
    const cancelBtn = document.getElementById("cancelFormBtn");

    let closed = false;

    function cleanup() {
      if (closed) return;
      closed = true;
      document.removeEventListener("keydown", handler);
      app.innerHTML = previousHTML;
    }

    function submit() {

      const result = {};
      let missing = false;

      fields.forEach(f => {

        const el = document.getElementById(f.key);
        const value = el.value.trim();

        if (!value) {
          missing = true;
          el.style.border = "2px solid red";
        } else {
          el.style.border = "";
        }

        result[f.key] = value;
      });

      if (missing) {
        // ❗ IMPORTANT : on NE FERME PAS la popup
        // on ne reset rien
        return;
      }

      cleanup();
      resolve(result);
    }

    function cancel() {
      cleanup();
      resolve(null);
    }

    function handler(e) {
      if (closed) return;

      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }

      if (e.key === "Escape") {
        cancel();
      }
    }

    document.addEventListener("keydown", handler);

    submitBtn.onclick = submit;
    cancelBtn.onclick = cancel;
  });
}

let categories=[
  "Elite","Elite F","Elite V",
  "N1","N1 F","N1 V",
  "N2","N2 F","N2 V",
  "N3","N3 F","N3 V",
  "N4","N4 F","N4 V",
  "N5","N5 F","N5 V"
];

const RULES = {
  points: {
    ufolep: [
      30,27,25,23,21,19,17,15,13,11,
      10,9,8,7,6,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
    ],
    abPoints: 1,
    fallbackMinPoints: 1
  },

  ranking: {
    abBehavior: "always_last"
  },

  veteranRule: "filter_only",
  femaleRule: "filter_only"
};

const CATEGORY_COLORS={

  "Elite":"FFF59D",
  "Elite F":"F8BBD0",
  "Elite V":"D1D5DB",

  "N1":"EF9A9A",
  "N1 F":"F8BBD0",
  "N1 V":"D1D5DB",

  "N2":"90CAF9",
  "N2 F":"F8BBD0",
  "N2 V":"D1D5DB",

  "N3":"A5D6A7",
  "N3 F":"F8BBD0",
  "N3 V":"D1D5DB",

  "N4":"FFFFFF",
  "N4 F":"F8BBD0",
  "N4 V":"D1D5DB",

  "N5":"FFCC80",
  "N5 F":"F8BBD0",
  "N5 V":"D1D5DB"
};
const MAIN_GROUPS = [

  {
    title:"ELITE",
    cats:["Elite","Elite F"]
  },

  {
    title:"N1",
    cats:["N1","N1 F"]
  },

  {
    title:"N2",
    cats:["N2","N2 F"]
  },

  {
    title:"N3",
    cats:["N3","N3 F"]
  },

  {
    title:"N4",
    cats:["N4","N4 F"]
  },

  {
    title:"N5",
    cats:["N5","N5 F"]
  }

];

let defaultClubs=[
  "BUTHIERS",
  "CSM PUTEAUX CYCLISME",
  "MEZIERES",
  "MONTLUCON",
  "SARAN",
  "SURY",
  "VTT VAL D'ESSONNES"
];

function generatePilotId(){
  return "P"+Date.now()+Math.floor(Math.random()*10000);
}

state.competitions.forEach(c=>{

  if(!c.status){
    c.status={};
  }

  if(!c.tiebreaks){
    c.tiebreaks={};
  }
});

save();

function save(){

  localStorage.setItem("pilots",JSON.stringify(state.pilots));
  localStorage.setItem("clubs",JSON.stringify(state.clubs));
  localStorage.setItem("competitions",JSON.stringify(state.competitions));
  localStorage.setItem("sortPilotsMode",state.sortPilotsMode);
  localStorage.setItem("sortParticipantsMode",state.sortParticipantsMode);
  localStorage.setItem("sortEntryMode",state.sortEntryMode);

  localStorage.setItem("lastUpdate", Date.now());
}

function format(v){
  return v.toUpperCase().trim();
}

function formatBirthDate(date){

  if(!date){
    return "";
  }

  let parts = date.split("-");

  if(parts.length !== 3){
    return date;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatDateForFile(date){

  if(!date){
    return "";
  }

  // Ancien format
  if(date.includes("/")){
    return date.replaceAll("/", "-");
  }

  // Nouveau format ISO
  if(date.includes("-")){

    const [year, month, day] = date.split("-");

    return `${day}-${month}-${year}`;
  }

  return date;
}

function getCatClass(cat){

  // FEMININES PRIORITAIRES
  if(cat.endsWith("F")){
    return "cat-f";
  }

  // VETERANS PRIORITAIRES
  if(cat.endsWith("V")){
    return "cat-v";
  }

  // CATEGORIES PRINCIPALES
  if(cat==="Elite") return "cat-elite";
  if(cat==="N1") return "cat-n1";
  if(cat==="N2") return "cat-n2";
  if(cat==="N3") return "cat-n3";
  if(cat==="N4") return "cat-n4";
  if(cat==="N5") return "cat-n5";

  return "";
}

function getPilotTableCatClass(cat){

  if(cat.endsWith("F")){
    return "pilot-cat-f";
  }

  if(cat.endsWith("V")){
    return "pilot-cat-v";
  }

  if(cat==="Elite") return "pilot-cat-elite";
  if(cat==="N1") return "pilot-cat-n1";
  if(cat==="N2") return "pilot-cat-n2";
  if(cat==="N3") return "pilot-cat-n3";
  if(cat==="N4") return "pilot-cat-n4";
  if(cat==="N5") return "pilot-cat-n5";

  return "";
}

function getPilotById(id){
  return state.pilots.find(p=>p.id===id);
}

function getPilotStatus(c,id){
  return c.status[id] || "OK";
}

function equalityKey(p){

  return [
    p.total,
    p.nb0,
    p.nb1,
    p.nb2,
    p.nb3,
    p.nb5,
    p.bestTour
  ].join("-");
}

// ===== RANKING ENGINE =====

const Engine = {

  // ===== POINTS UFOLEP =====
  getUfolepPoints(rank, isAB = false) {
    if (isAB) return RULES.points.abPoints;

    return (
      RULES.points.ufolep[rank - 1]
      ?? RULES.points.fallbackMinPoints
    );
  },

  // ===== AB =====
  isAB(p) {
    return p.status === "AB";
  },

  // ===== COMPARATEUR SCRATCH =====
  compare(a, b) {

    if (Engine.isAB(a) && !Engine.isAB(b)) return 1;
    if (!Engine.isAB(a) && Engine.isAB(b)) return -1;

    if (a.total !== b.total) return a.total - b.total;

    if (a.nb0 !== b.nb0) return b.nb0 - a.nb0;
    if (a.nb1 !== b.nb1) return b.nb1 - a.nb1;
    if (a.nb2 !== b.nb2) return b.nb2 - a.nb2;
    if (a.nb3 !== b.nb3) return b.nb3 - a.nb3;
    if (a.nb5 !== b.nb5) return a.nb5 - b.nb5;

    return a.bestTour - b.bestTour;
  },

  // ===== TRI SCRATCH =====
  sortScratch(list) {
    return [...list].sort(Engine.compare);
  },

  // ===== CLASSEMENT AVEC RANK UFOLEP =====
  rank(list) {

    const sorted = Engine.sortScratch(list);
    const ufoOnly = sorted.filter(p => p.lic === "UFOLEP");

    return sorted.map((p, index) => {

      let ufoRank = "-";
      let ufoPoints = 0;

      if (p.lic === "UFOLEP") {

        const pos = ufoOnly.findIndex(x => x.id === p.id) + 1;

        ufoRank = pos;

        ufoPoints = Engine.getUfolepPoints(
          pos,
          p.status === "AB"
        );
      }

      return {
        ...p,
        rankScratch: index + 1,
        rankUfolep: ufoRank,
        ufoPoints
      };
    });
  },

  // ===== NOUVEAU : RANK SANS MODIFIER L'ORDRE =====
  rankPreservingOrder(list) {

    return list.map((p, index) => ({
      ...p,
      rankScratch: index + 1
    }));
  }
};

function buildOrderedRanking(list, categoryOrder = null) {

  let sorted = [...list];

  // ===== TRI PAR CATEGORIE HIERARCHIQUE =====
  if(categoryOrder){

    sorted.sort((a, b) => {

      let catA = categoryOrder[a.cat];
      let catB = categoryOrder[b.cat];

      // priorité catégorie
      if(catA !== catB){
        return catA - catB;
      }

      // puis classement scratch complet
      return Engine.compare(a, b);
    });

  }

  // ===== TRI SCRATCH NORMAL =====
  else{

    sorted = Engine.sortScratch(sorted);
  }

  // ===== RANKS =====
  const ufoOnly = sorted.filter(p => p.lic === "UFOLEP");

  return sorted.map((p, index) => {

    let ufoRank = "-";
    let ufoPoints = 0;

    if(p.lic === "UFOLEP"){

      const pos =
        ufoOnly.findIndex(x => x.id === p.id) + 1;

      ufoRank = pos;

      ufoPoints = Engine.getUfolepPoints(
        pos,
        p.status === "AB"
      );
    }

    return {
      ...p,
      rankScratch: index + 1,
      rankUfolep: ufoRank,
      ufoPoints
    };
  });
}

const categoryOrderFemale = {
  "Elite F": 0,
  "N1 F": 1,
  "N2 F": 2,
  "N3 F": 3,
  "N4 F": 4,
  "N5 F": 5
};

const categoryOrderVeteran = {
  "Elite V": 0,
  "N1 V": 1,
  "N2 V": 2,
  "N3 V": 3,
  "N4 V": 4,
  "N5 V": 5
};

// ===== TIEBREAK ENGINE =====

function applyTieBreaks(list,c,groupName){

  let unresolved = false;

  let groups = {};

  list.forEach(p=>{

    let key = equalityKey(p);

    if(!groups[key]){
      groups[key] = [];
    }

    groups[key].push(p);
  });

  let final = [];

  Object.values(groups).forEach(group=>{

    // seul

    if(group.length === 1){

      final.push(group[0]);
      return;
    }

    // incomplet ou AB

    let validGroup = group.every(p=>
      p.completed
      &&
      p.status !== "AB"
    );

    if(!validGroup){

      group.forEach(p=>{
        final.push(p);
      });

      return;
    }

    // clé départage

    let ids = group
      .map(p=>p.id)
      .sort();

    let tieKey =
      groupName
      + "-"
      + ids.join("-");

    let saved =
      c.tiebreaks[tieKey];

    // départage existant

    if(saved){

      saved.forEach(id=>{

        let found = group.find(
          p=>p.id===id
        );

        if(found){

          found.tiebreak = true;
          found.tieKey = tieKey;

          final.push(found);
        }
      });
    }

    // départage absent

    else{

      unresolved = true;

      group.forEach(p=>{

        p.pendingTie = true;
        p.tieKey = tieKey;

        final.push(p);
      });
    }
  });

  return {
    list: final,
    unresolved
  };
}

// ===== HOME =====

function home(){

  let html=`

  <button onclick="goPilots()">
  Liste Des Pilotes
</button>

  <button onclick="showNewCompetition()">
    Nouvelle compétition
  </button>

  <button onclick="showChampionshipChoice()">
Classement Championnat
</button>

  <button onclick="showClubChampionship()">
Classement Clubs
</button>

  <button onclick="exportBackup()">
Exporter Sauvegarde
</button>

  <button onclick="importBackup()">
Charger Sauvegarde
</button>

  <button class="delete"
  onclick="seasonReset()">
  RESET FIN DE SAISON
</button>

  <h3>Compétitions</h3>
  `;

  state.competitions.forEach((c,i)=>{

html+=`

<div class="competition-card"
onclick="openCompetition(${i})">

<div class="comp-header">

<div>

<div class="comp-title">

${c.name}

${c.locked
? `<span class="locked-badge">
🔒 VERROUILLÉE
</span>`
:""}

</div>

<div class="comp-date">

📅 ${
  c.date
    ? c.date.split("-").reverse().join("/")
    : "Date inconnue"
}

<br>

${c.tours} tours • ${c.zones} zones

</div>

</div>


<div style="
display:flex;
gap:8px;
align-items:center;
">

${
!c.locked
? `

<button
onclick="
event.stopPropagation();
editCompetition(${i});
">

⚙ Modifier infos

</button>

`
:""
}

<button
class="comp-delete"

onclick="
event.stopPropagation();
deleteCompetition(${i});
">

X

</button>

</div>

</div>

</div>

`;


if(state.ui.openCompetition===i){

html+=`

<div class="competition-menu">


<div
class="menu-card"

onclick="selectPilot(${i})">

📝 SAISIE DES SCORES

</div>


<div
class="menu-card"

onclick="manageParticipants(${i})">

👥 PARTICIPANTS

</div>


<div
class="menu-card"

onclick="showResults(${i})">

🏆 CLASSEMENTS

</div>


<div
class="menu-card"

onclick="showExportParticipantsMenu(${i})">

📄 EXPORTS


</div>


${
c.locked
? `

<div
class="menu-card"

onclick="unlockCompetition(${i})">

🔓 DÉVERROUILLER

</div>

`
:`

<div
class="menu-card"

onclick="lockCompetition(${i})">

✔ VALIDER LA COMPÉTITION

</div>

`
}

<div
class="menu-card"

onclick="showCompetitionInfo(${i})">

ℹ️ INFOS COMPÉTITION

</div>


<div style="
grid-column:1 / -1;
text-align:center;
margin-top:24px;
">

<button
onclick="
event.stopPropagation();

state.ui.openCompetition=null;

home();
">

Fermer

</button>

</div>

</div>

`;

}

});

  app.innerHTML=html;
}

function showCompetitionInfo(i){

let c = state.competitions[i];

const levels = [
  "Elite",
  "N1",
  "N2",
  "N3",
  "N4",
  "N5"
];

let stats = buildStats(c);

let html = `

<div class="topbar">

<div class="topbar-title">
Infos compétition
</div>

<div class="topbar-actions">

<button onclick="returnCompetitionMenu()">
Retour
</button>

</div>

</div>

<div class="info-grid">

`;


// ===== PARTICIPANTS =====

html += `

<div class="info-card">

<h3>Participants</h3>

`;

let totalF = 0;
let totalV = 0;

levels.forEach(level=>{

let count = c.participants.filter(id=>{

let p = getPilotById(id);

return p && p.cat.startsWith(level);

}).length;

html += `

<div class="info-line">

<span class="info-label">${level}</span>

<span>:</span>

<b>${count}</b>

</div>

`;

});

totalF = c.participants.filter(id=>{

let p = getPilotById(id);

return p && p.cat.includes(" F");

}).length;

totalV = c.participants.filter(id=>{

let p = getPilotById(id);

return p && p.cat.includes(" V");

}).length;

html += `

<br>

<div>Féminines : <b>${totalF}</b></div>

<div>Vétérans : <b>${totalV}</b></div>

<br>

<div>
TOTAL : <b>${c.participants.length}</b>
</div>

</div>

`;


// ===== ABANDONS =====

html += `

<div class="info-card">

<h3>Abandons</h3>

`;

let totalAB = 0;

levels.forEach(level=>{

let count = c.participants.filter(id=>{

let p = getPilotById(id);

return p
&& p.cat.startsWith(level)
&& c.status[id] === "AB";

}).length;

totalAB += count;

html += `

<div class="info-line">

<span class="info-label">${level}</span>

<span>:</span>

<b>${count}</b>

</div>

`;

});

html += `

<br>

<div>
TOTAL : <b>${totalAB}</b>
</div>

</div>

`;


// ===== DEPARTAGES =====

html += `

<div class="info-card">

<h3>Départages</h3>

`;

// ===== TABLEAUX PRINCIPAUX =====

levels.forEach(level=>{

let groupCats =
level === "Elite"
? ["Elite","Elite F"]
: [level, level + " F"];

let catStats = stats.filter(p=>
groupCats.includes(p.cat)
);

let groups = {};

catStats.forEach(p=>{

let key = equalityKey(p);

if(!groups[key]){
groups[key] = [];
}

groups[key].push(p);

});

let totalTieGroups = 0;
let resolvedTieGroups = 0;

Object.values(groups).forEach(group=>{

if(group.length <= 1){
return;
}

let validGroup = group.every(p=>
p.completed &&
p.status !== "AB"
);

if(!validGroup){
return;
}

totalTieGroups++;

let ids = group
.map(p=>p.id)
.sort();

let tieKey =
level.toUpperCase()
+ "-"
+ ids.join("-");

if(c.tiebreaks[tieKey]){
resolvedTieGroups++;
}

});

let icon =
(totalTieGroups === 0 ||
resolvedTieGroups === totalTieGroups)
? "🟩"
: "🟨";

let value =
totalTieGroups === 0
? "Aucun"
: `${resolvedTieGroups}/${totalTieGroups}`;

html += `

<div class="info-line">

<span>${icon}</span>

<span class="info-label">
${level}
</span>

<span>:</span>

<b>${value}</b>

</div>

`;

});


// ===== FEMININ =====

let femaleGroups = {};

stats
.filter(p=>
categoryOrderFemale[p.cat] !== undefined
)
.forEach(p=>{

let key =
p.cat + "-" + equalityKey(p);

if(!femaleGroups[key]){
femaleGroups[key] = [];
}

femaleGroups[key].push(p);

});

let femaleTotal = 0;
let femaleResolved = 0;

Object.values(femaleGroups).forEach(group=>{

if(group.length <= 1){
return;
}

let validGroup = group.every(p=>
p.completed &&
p.status !== "AB"
);

if(!validGroup){
return;
}

femaleTotal++;

let ids = group
.map(p=>p.id)
.sort();

let tieKey =
group[0].cat.toUpperCase()
+ "-"
+ ids.join("-");

if(c.tiebreaks[tieKey]){
femaleResolved++;
}

});

html += `

<div class="info-line">

<span>
${(femaleTotal === 0 || femaleResolved === femaleTotal)
? "🟩"
: "🟨"}
</span>

<span class="info-label">
FEM
</span>

<span>:</span>

<b>
${femaleTotal === 0
? "Aucun"
: `${femaleResolved}/${femaleTotal}`}
</b>

</div>

`;


// ===== VETERANS =====

let veteranGroups = {};

stats
.filter(p=>p.cat.includes(" V"))
.forEach(p=>{

let key =
p.cat + "-" + equalityKey(p);

if(!veteranGroups[key]){
veteranGroups[key] = [];
}

veteranGroups[key].push(p);

});

let veteranTotal = 0;
let veteranResolved = 0;

Object.values(veteranGroups).forEach(group=>{

if(group.length <= 1){
return;
}

let validGroup = group.every(p=>
p.completed &&
p.status !== "AB"
);

if(!validGroup){
return;
}

veteranTotal++;

let ids = group
.map(p=>p.id)
.sort();

let tieKey =
group[0].cat.toUpperCase()
+ "-"
+ ids.join("-");

if(c.tiebreaks[tieKey]){
veteranResolved++;
}

});

html += `

<div class="info-line">

<span>
${(veteranTotal === 0 || veteranResolved === veteranTotal)
? "🟩"
: "🟨"}
</span>

<span class="info-label">
VET
</span>

<span>:</span>

<b>
${veteranTotal === 0
? "Aucun"
: `${veteranResolved}/${veteranTotal}`}
</b>

</div>

</div>

`;


// ===== COMPETITION =====

html += `

<div class="info-card">

<h3>Compétition</h3>

<div style="margin:8px 0">
<b>${c.name}</b>
</div>

<div style="margin:8px 0">
📅 ${
  c.date
    ? c.date.split("-").reverse().join("/")
    : "Date inconnue"
}
</div>

<div style="margin:8px 0">
🏁 ${c.tours} tours
</div>

<div style="margin:8px 0">
🎯 ${c.zones} zones
</div>

</div>

`;


// ===== TOURS =====

for(let t=1;t<=c.tours;t++){

html += `

<div class="info-card">

<h3>Tour ${t}</h3>

`;

levels.forEach(level=>{

let pilots = c.participants.filter(id=>{

let p = getPilotById(id);

return p && p.cat.startsWith(level);

});

let total = pilots.length;

let done = pilots.filter(id=>{

if(c.status[id] === "AB"){
return true;
}

return !!c.scores[id+"-"+t];

}).length;

let missing = total - done;

let icon = "🟥";

if(done === total){
icon = "🟩";
}
else if(done > 0){
icon = "🟨";
}

html += `

<div class="info-line">

<span>
${icon}
</span>

<span class="info-label">
${level}
</span>

<span>:</span>

<b>${done}/${total}</b>

${missing > 0
? ` (${missing})`
: ""
}

</div>

`;

});

html += `

</div>

`;

}

html += `

</div>

`;

app.innerHTML = html;

}

// ===== PILOTES =====

function showPilots(){

  state.ui.currentScreen = "pilots";

  let pilots = sortPilots(
  state.pilots
);

  let html=`

  <div class="topbar">

    <div style="
      display:flex;
      flex-direction:column;
      gap:8px;
      width:100%;
    ">

      <h3 style="margin:0;">
        Pilotes
      </h3>

      <div style="
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        align-items:center;
      ">
        <input
          id="plaque"
          placeholder="N° plaque"
          style="width:120px">

        <input id="name"
        placeholder="Nom"
        style="width:340px">

        

        <select id="club" onchange="toggleClub()">
          <option value="">--Club--</option>
          ${state.clubs.map(c=>`<option>${c}</option>`).join("")}
          <option value="NEW">NOUVEAU</option>
        </select>

        <input id="newClub"
          placeholder="Nouveau club"
          style="display:none">

        <select
          id="cat"
          ${editingPilotId ? "disabled" : ""}
        >
          <option value="">CAT</option>
          ${categories.map(c=>`<option>${c}</option>`).join("")}
        </select>

        <select id="lic">
          <option value="UFOLEP">UFOLEP</option>
          <option value="FFC">FFC</option>
          <option value="NL">NON LICENCIÉ</option>
        </select>       

        <input
          id="licenceNumber"
          placeholder="N° licence"
          style="width:120px">

        <span>Naissance</span>

        <input
        id="birthDate"
        type="date">

        <button onclick="
          editingPilotId
            ? savePilotEdit()
            : addPilot()
        ">

          ${
            editingPilotId
              ? "Modifier"
              : "Ajouter"
          }

        </button>

        <button class="delete"
          onclick="toggleDeletePilots()">

          ${
            deleteModePilots
            ? "Fermer suppression"
            : "Supprimer"
          }

        </button>

        <button onclick="importPilotsExcel()">
        Import Excel
        </button>

        <button onclick="exportPilotsExcel()">
        Export Excel
        </button>

        <button onclick="returnCompetitionMenu()">
          Retour
        </button>

      </div>

    </div>

  </div>

  <table class="pilot-table">
  <tr> 

      <th class="col-plaque"
    onclick="changePilotSort('plaque')"
    style="cursor:pointer">
  Plaque   ↕
</th>

<th class="col-name"
    onclick="changePilotSort('name')"
    style="cursor:pointer">
  Nom   ↕
</th>

<th class="col-club"
    onclick="changePilotSort('club')"
    style="cursor:pointer">
  Club   ↕
</th>

<th class="col-cat"
    onclick="changePilotSort('cat')"
    style="cursor:pointer">
  Catégorie   ↕
</th>

<th class="col-lic"
    onclick="changePilotSort('lic')"
    style="cursor:pointer">
  Licence   ↕
</th>

<th class="col-licnum">
  N° licence
</th>

<th class="col-birth"
    onclick="changePilotSort('birthDate')"
    style="cursor:pointer">
  Naissance   ↕
</th>

<th class="col-actions">
  Actions
</th>
    </tr>
  `;

  pilots.forEach((p)=>{

    html += `

    <tr
  class="${
    state.selectedPilotId === p.id
      ? 'pilot-selected'
      : ''
  }"
  onclick="selectPilotRow('${p.id}')"
>

      <td>${p.plaque || ""}</td>

      <td>${p.name}</td>

      <td>${p.club || ""}</td>

      <td class="pilot-cat ${getPilotTableCatClass(p.cat)}">
      ${p.cat}</td>

      <td>${p.lic}</td>

      <td>${p.licenceNumber || ""}</td>

      <td>
  ${
    p.birthDate
      ? p.birthDate.split("-").reverse().join("/")
      : ""
  }
</td>

      <td class="col-actions">
        
        <button
  class="pilot-action-btn"
  onclick="event.stopPropagation();editPilot('${p.id}')">
  ✏️
</button>

        ${
          deleteModePilots
          ? `
          <button
  class="pilot-action-btn delete"
  onclick="event.stopPropagation();deletePilot('${p.id}')">
  X
</button>
          `
          : ""
        }

      </td>

    </tr>
    `;
  });

  app.innerHTML=html;

  setTimeout(() => {

    let nameInput =
      document.getElementById("name");

    if(nameInput){

      nameInput.addEventListener("keydown", e => {

        if(e.key === "Enter"){

          addPilot();
        }

      });

      nameInput.focus();
    }

  }, 0);
}

function selectPilotRow(id){

  state.selectedPilotId = id;

  showPilots();
}

function toggleClub(){

  document.getElementById("newClub").style.display=
    document.getElementById("club").value==="NEW"
    ? "block"
    : "none";
}

function addPilot(){

editingPilotId = null;
editingPilotCat = null;

let input =
document.getElementById("name");

input.style.border="";

let name =
format(input.value);

let cat =
document.getElementById("cat").value;

let clubSel =
document.getElementById("club").value;

let newClub =
format(
document.getElementById("newClub").value
);

let lic =
document.getElementById("lic").value;

let club =
clubSel==="NEW"
? newClub
: clubSel;


if(!name){

input.style.border=
"2px solid #dc2626";

input.focus();

return;

}


if(clubSel==="NEW" && !newClub){

let clubInput =
document.getElementById("newClub");

clubInput.style.border =
"2px solid #dc2626";

clubInput.focus();

return;

}


if(club && !state.clubs.includes(club)){

state.clubs.push(club);

}

if(!cat){
  document.getElementById("cat").style.border = "2px solid red";
  return;
}

document
.getElementById("newClub")
.style.border="";

let plaque =
document.getElementById("plaque").value.trim();

let licenceNumber =
document.getElementById("licenceNumber").value.trim();

let birthDate =
document.getElementById("birthDate").value;

state.pilots.push({

id:generatePilotId(),

name,

cat,

club,

lic,

plaque,

licenceNumber,

birthDate

});

save();

showPilots();

}

function selectPilotRow(id){

  state.selectedPilotId = id;

  showPilots();
}

// ===== COMPETITIONS =====

async function newCompetition(){

  console.log("newCompetition lancé");

  let data = await askForm("Nouvelle compétition", [
    { key: "name", label: "Nom" },
    { key: "date", label: "Date", type:"date" },
    { key: "zones", label: "Nombre de zones", type:"number" },
    { key: "tours", label: "Nombre de tours", type:"number" }
  ]);

    state.competitions.push({
    name: format(data.name),
    date: data.date,
    zones: parseInt(data.zones),
    tours: parseInt(data.tours),
    participants: [],
    participantPlates: {},
    scores: {},
    status: {},
    tiebreaks: {},
    locked: false
  });

  save();
  home();
}

function saveNewCompetition(){

  let name =
    document.getElementById("compName").value;

  let date =
    document.getElementById("compDate").value;

  let zones =
    parseInt(document.getElementById("compZones").value);

  let tours =
    parseInt(document.getElementById("compTours").value);

  if(!name || !date || !zones || !tours){

    document.getElementById("formError").innerText =
      "Champs manquants";

    return;
  }
state.competitions.push({

    name: format(name),
    date,
    zones,
    tours,

    participants: [],
    scores: {},
    status: {},
    tiebreaks: {},
    locked: false
  });

  save();

  home();
}

function showNewCompetition(){

  app.innerHTML = `

    <h2>Nouvelle compétition</h2>

    <input id="compName" placeholder="Nom">

    <input id="compDate" type="date">

    <input
  id="compZones"
  type="number"
  min="1"
  placeholder="Zones">

    <input
  id="compTours"
  type="number"
  min="1"
  placeholder="Tours">

    <br><br>

    <button onclick="saveNewCompetition()">
      Valider
    </button>

    <button onclick="goHome()">
Retour
</button>
  `;
}

function editCompetition(i){

  let c = state.competitions[i];

  app.innerHTML = `

    <h2>Modifier compétition</h2>

    <input
      id="editCompName"
      value="${c.name}"
      placeholder="Nom">

    <input
      id="editCompDate"
      type="date"
      value="${c.date}">

    <br><br>

    <button onclick="saveCompetitionEdit(${i})">
      Enregistrer
    </button>

    <button onclick="openCompetition(${i})">
      Annuler
    </button>
  `;
}

function saveCompetitionEdit(i){

  let c = state.competitions[i];

  let newName =
    document.getElementById("editCompName").value;

  let newDate =
    document.getElementById("editCompDate").value;

  if(!newName || !newDate){

    alert("Champs manquants");

    return;
  }

  c.name = format(newName);
  c.date = newDate;

  save();

  openCompetition(i);
}

function openCompetition(i){

if(state.ui.openCompetition===i){

state.ui.openCompetition=null;

}else{

state.ui.openCompetition=i;

}

home();

}

function returnCompetitionMenu(){

home();

}

// ===== TRI =====

function sortPilots(list){

  let arr=[...list];

  let column =
    state.sortPilotsColumn || "name";

  let dir =
    state.sortPilotsDirection === "desc"
    ? -1
    : 1;

  // ===== NOM =====

  if(column==="name"){

    arr.sort((a,b)=>
      a.name.localeCompare(b.name) * dir
    );
  }

  // ===== PLAQUE =====

  if(column==="plaque"){

    arr.sort((a,b)=>{

      let pa = a.plaque || "";
      let pb = b.plaque || "";

      return pa.localeCompare(
        pb,
        undefined,
        {numeric:true}
      ) * dir;
    });
  }

  // ===== CLUB =====

  if(column==="club"){

    arr.sort((a,b)=>{

      let diff =
        (a.club || "")
        .localeCompare(b.club || "");

      if(diff!==0){
        return diff * dir;
      }

      return a.name.localeCompare(b.name);
    });
  }

  // ===== LICENCE =====

  if(column==="lic"){

    arr.sort((a,b)=>{

      let diff =
        (a.lic || "")
        .localeCompare(b.lic || "");

      if(diff!==0){
        return diff * dir;
      }

      return a.name.localeCompare(b.name);
    });
  }

  // ===== DATE DE NAISSANCE =====

  if(column==="birthDate"){

    arr.sort((a,b)=>{

      let da = a.birthDate || "";
      let db = b.birthDate || "";

      return da.localeCompare(db) * dir;
    });
  }

  // ===== CATEGORIE =====

  if(column==="cat"){

    arr.sort((a,b)=>{

      let diff =
        categories.indexOf(a.cat)
        - categories.indexOf(b.cat);

      if(diff!==0){
        return diff * dir;
      }

      return a.name.localeCompare(b.name);
    });
  }

  return arr;
}

// ===== PARTICIPANTS =====

function sortParticipants(list,c){

  let arr=[...list];

  let column =
    state.sortParticipantsColumn || "name";

  let dir =
    state.sortParticipantsDirection === "desc"
    ? -1
    : 1;

  // ===== SELECTION =====

  if(column==="selected"){

    arr.sort((a,b)=>{

      let sa =
        c.participants.includes(a.id)
        ? 1
        : 0;

      let sb =
        c.participants.includes(b.id)
        ? 1
        : 0;

      return (sa - sb) * dir;
    });
  }

  // ===== NOM =====

  if(column==="name"){

    arr.sort((a,b)=>
      a.name.localeCompare(b.name) * dir
    );
  }

  // ===== PLAQUE =====

  if(column==="plaque"){

  arr.sort((a,b)=>{

    const aSelected = c.participants.includes(a.id);
    const bSelected = c.participants.includes(b.id);

    // Plaques utilisées dans cette compétition
    const pa =
      c.participantPlates?.[a.id]
      ??
      a.plaque
      ??
      "";

    const pb =
      c.participantPlates?.[b.id]
      ??
      b.plaque
      ??
      "";

    // Groupe :
    // 0 = participant
    // 1 = non participant avec plaque
    // 2 = non participant sans plaque

    const ga =
      aSelected
        ? 0
        : pa
          ? 1
          : 2;

    const gb =
      bSelected
        ? 0
        : pb
          ? 1
          : 2;

    if(ga !== gb){
      return (ga - gb) * dir;
    }

    return pa.localeCompare(
      pb,
      undefined,
      {numeric:true}
    ) * dir;

  });

}

  // ===== CLUB =====

  if(column==="club"){

    arr.sort((a,b)=>{

      let diff =
        (a.club || "")
        .localeCompare(b.club || "");

      if(diff!==0){
        return diff * dir;
      }

      return a.name.localeCompare(b.name);
    });
  }

  // ===== LICENCE =====

  if(column==="lic"){

    arr.sort((a,b)=>{

      let diff =
        (a.lic || "")
        .localeCompare(b.lic || "");

      if(diff!==0){
        return diff * dir;
      }

      return a.name.localeCompare(b.name);
    });
  }

  // ===== CATEGORIE =====

  if(column==="cat"){

    arr.sort((a,b)=>{

      let diff =
        categories.indexOf(a.cat)
        - categories.indexOf(b.cat);

      if(diff!==0){
        return diff * dir;
      }

      return a.name.localeCompare(b.name);
    });
  }

  // ===== DATE DE NAISSANCE =====

  if(column==="birthDate"){

    arr.sort((a,b)=>{

      let da = a.birthDate || "";
      let db = b.birthDate || "";

      return da.localeCompare(db) * dir;
    });
  }

  return arr;
}

function manageParticipants(i){

  state.ui.selectedCompetition = i;

  let c = state.competitions[i];
  c.participantPlates ??= {};

  if(c.locked){

  app.innerHTML=`

  <h3>Compétition verrouillée</h3>

  <div class="card">
    Les participants sont figés.
  </div>

  <button onclick="returnCompetitionMenu()">
  Retour
  </button>
  `;

  return;
}

  let list =
  sortParticipants(
    state.pilots,
    c
  );

  let html=`

<div class="topbar">

  <div class="topbar-title">
    Participants
  </div>

  <div class="topbar-actions">

    <button onclick="toggleParticipantPlateEdit()">

    ${
      editParticipantPlates
        ? "Fermer modification"
        : "Modifier les plaques"
    }

  </button>

    <button onclick="returnCompetitionMenu()">
    Retour
    </button>

  </div>

</div>
`;
html += `

<table class="pilot-table">

<tr>

  <th
  class="col-select"
  onclick="changeParticipantSort('selected')"
  style="cursor:pointer"
>
  ✓ ↕
</th>

  <th class="col-plaque"
    onclick="changeParticipantSort('plaque')"
    style="cursor:pointer">
  Plaque ↕
  </th>

  <th class="col-name"
    onclick="changeParticipantSort('name')"
    style="cursor:pointer">
  Nom ↕
</th>

  <th class="col-club"
    onclick="changeParticipantSort('club')"
    style="cursor:pointer">
  Club ↕
</th>

  <th class="col-cat"
    onclick="changeParticipantSort('cat')"
    style="cursor:pointer">
  Catégorie ↕
</th>

  <th class="col-lic"
    onclick="changeParticipantSort('lic')"
    style="cursor:pointer">
  Licence ↕
</th>

  <th class="col-licnum">
    N° licence
  </th>

  <th class="col-birth"
    onclick="changeParticipantSort('birthDate')"
    style="cursor:pointer">
  Naissance ↕
</th>

</tr>
`;

list.forEach((p)=>{

  let sel =
    c.participants.includes(p.id)
      ? "✅"
      : "☐";

  html += `

<tr
  onclick="toggleP(${i},'${p.id}')"
  style="cursor:pointer"
>

  <td>
    ${sel}
  </td>

  <td>
    ${
editParticipantPlates && c.participants.includes(p.id)

?

`<input
value="${
c.participantPlates[p.id]
??
p.plaque
??
""
}"

style="
width:100%;
border:none;
outline:none;
background:#FFF9C4;
text-align:center;
font-weight:bold;
font-size:inherit;
padding:0;
margin:0;
box-sizing:border-box;
"

onclick="event.stopPropagation()"

onfocus="this.select()"

onkeydown="
if(event.key==='Enter'){
changeParticipantPlate(
${i},
'${p.id}',
this.value
);
this.blur();
}
"

onchange="
changeParticipantPlate(
${i},
'${p.id}',
this.value
);
"

>`

:

(c.participantPlates[p.id] ?? p.plaque ?? "")

}
  </td>

  <td>
    ${p.name}
  </td>

  <td>
    ${p.club || ""}
  </td>

  <td class="pilot-cat ${getPilotTableCatClass(p.cat)}">
    ${p.cat}
  </td>

  <td>
    ${p.lic}
  </td>

  <td>
    ${p.licenceNumber || ""}
  </td>

  <td>
  ${
    p.birthDate
      ? p.birthDate.split("-").reverse().join("/")
      : ""
  }
</td>

</tr>
`;
});

html += `
</table>
`;

  app.innerHTML=html;
}

function toggleParticipantPlateEdit(){

  editParticipantPlates =
    !editParticipantPlates;

  manageParticipants(
    state.ui.selectedCompetition
  );

}

function changeParticipantPlate(ci,id,value){

  let c = state.competitions[ci];

  c.participantPlates ??= {};

  c.participantPlates[id] = value.trim();

  save();

}

function toggleP(ci,id){

  let c=state.competitions[ci];
if(c.locked){
    return;
  }

  if(c.participants.includes(id)){

    c.participants=c.participants.filter(x=>x!==id);

  }else{

    c.participants.push(id);
  }

  save();

  manageParticipants(ci);
}

// ===== SAISIE =====

let currentScores=[];

function selectPilot(i){

  let c=state.competitions[i];
if(c.locked){

  app.innerHTML=`

  <h3>Compétition verrouillée</h3>

  <div class="card">
    Les scores sont figés.
  </div>

  <button onclick="returnCompetitionMenu()">
  Retour
  </button>
  `;

  return;
}

  let list=c.participants
    .map(id=>getPilotById(id))
    .filter(p=>p);

  list=sortEntryPilots(
  list,
  state.sortEntryMode
);

  let html=`

<div class="topbar">

  <div class="topbar-title">
    Saisie des scores
  </div>

  <div class="topbar-actions">

    <button onclick="returnCompetitionMenu()">
    Retour
    </button>

  </div>

</div>
`;

  html += `

  Trier :

  <select onchange="changeSortEntry(this.value,${i})">

    <option value="nameAZ"
      ${state.sortEntryMode==="nameAZ"?"selected":""}>
      Nom A → Z
    </option>

    <option value="nameZA"
      ${state.sortEntryMode==="nameZA"?"selected":""}>
      Nom Z → A
    </option>

    <option value="catASC"
      ${state.sortEntryMode==="catASC"?"selected":""}>
      Catégorie Elite → N5
    </option>

    <option value="catDESC"
      ${state.sortEntryMode==="catDESC"?"selected":""}>
      Catégorie N5 → Elite
    </option>

  </select>
  `;

  list.forEach((p,index)=>{

    let status=getPilotStatus(c,p.id);

let tours = "";

for(let t = 1; t <= c.tours; t++){

  let icon = "🟡";

  if(c.status[p.id] === "AB"){

    icon = "🟥";

  }else if(c.scores[p.id + "-" + t]){

    icon = "🟢";

  }

  tours += `
    <span
      class="tour-chip"
      onclick="event.stopPropagation();clickTour(${i},'${p.id}',${t})">

      T${t} ${icon}

    </span>
`;
}

html += `
<div class="card ${getCatClass(p.cat)}">

  <div class="tour-line">

    ${tours}

    <span
class="status-chip"
onclick="pilotDetail(${i},'${p.id}')">

${getStatusLabel(c,p.id)}

</span>

    <span class="pilot-line">

      ${p.cat} - ${p.name} - ${p.club || "Sans club"}

    </span>

  </div>

</div>
`;
  });

  app.innerHTML=html;
}

function getStatusLabel(c,id){

    if(getPilotStatus(c,id)==="AB"){

        return "🟥 Abandon";

    }

    let complete = 0;

    for(let t=1;t<=c.tours;t++){

        if(c.scores[id+"-"+t]){

            complete++;

        }

    }

    if(complete===0){

        return "❌ Aucun tour";

    }

    if(complete<c.tours){

        return "🟡 En cours";

    }

    return "✅ Terminée";

}

function clickTour(ci,id,t){

  let c = state.competitions[ci];

  if(c.locked){
    return;
  }

  if(c.status[id] === "AB"){

    pilotDetail(ci,id);

    return;
  }

  if(c.scores[id + "-" + t]){

    pilotDetail(ci,id);

    return;
  }

  enterScore(ci,id,t);

}

function changeSortEntry(mode,i){

  state.sortEntryMode=mode;

  save();

  selectPilot(i);
}

function sortEntryPilots(list,mode){

  let arr=[...list];

  if(mode==="nameAZ"){

    arr.sort((a,b)=>
      a.name.localeCompare(b.name)
    );
  }

  if(mode==="nameZA"){

    arr.sort((a,b)=>
      b.name.localeCompare(a.name)
    );
  }

  if(mode==="catASC"){

    arr.sort((a,b)=>{

      let diff =
        categories.indexOf(a.cat)
        - categories.indexOf(b.cat);

      if(diff!==0) return diff;

      return a.name.localeCompare(b.name);
    });
  }

  if(mode==="catDESC"){

    arr.sort((a,b)=>{

      let diff =
        categories.indexOf(b.cat)
        - categories.indexOf(a.cat);

      if(diff!==0) return diff;

      return a.name.localeCompare(b.name);
    });
  }

  return arr;
}

function getStatus(c,id){

  if(getPilotStatus(c,id)==="AB"){
    return "🟥";
  }

  let filled=0;

  for(let t=1;t<=c.tours;t++){

    let s=c.scores[id+"-"+t];

    if(s && !s.includes(null)){
      filled++;
    }
    else if(s){
      return "🟡";
    }
  }

  if(filled===0){
    return "❌";
  }

  if(filled<c.tours){
    return "🟡";
  }

  return "✅";
}

function pilotDetail(ci,id){

  let c=state.competitions[ci];
if(c.locked){

  showResults(ci);

  return;
}
  let p=getPilotById(id);

  let html=`<h3>${p.name}</h3>`;

  for(let t=1;t<=c.tours;t++){

    let s=c.scores[id+"-"+t];

    html+=`
    <div class="card">

      Tour ${t} :
      ${s ? s.join(" - ") : "Non saisi"}

      <button onclick="enterScore(${ci},'${id}',${t})">
        Modifier
      </button>

    </div>
    `;
  }
let isAB = c.status[id] === "AB";

html+=`

<div style="margin-top:20px;">

<button onclick="selectPilot(${ci})">
Retour
</button>

${
isAB
? `
<button
onclick="cancelAB(${ci},'${id}')">

Annuler abandon

</button>
`
: `
<button
class="delete"
onclick="declareAB(${ci},'${id}')">

Déclarer abandon

</button>
`
}

</div>

`;

  app.innerHTML=html;
}

function declareAB(ci,id){

let c=state.competitions[ci];

let pilot =
state.pilots.find(
p => p.id === id
);

app.innerHTML=`

<h3>
Confirmer abandon
</h3>

<div class="card">

⚠️ Le pilote :

<br><br>

<b>
${pilot?.name || ""}
</b>

<br><br>

sera marqué abandonné.

<br><br>

Ses scores resteront enregistrés
mais il apparaîtra AB
dans les classements.

</div>

<div class="score-actions">

<button
class="delete"

onclick="confirmAB(${ci},'${id}')">

Confirmer abandon

</button>

<button

onclick="selectPilot(${ci})">

Retour

</button>

</div>

`;

}

function confirmAB(ci,id){

let c=state.competitions[ci];

c.status[id]="AB";

save();

updateTVResults(ci);

selectPilot(ci);

}

function cancelAB(ci,id){

  let c=state.competitions[ci];
if(c.locked){
  return;
}

  c.status[id]="OK";

  save();

  updateTVResults(ci);

  selectPilot(ci);
}

function enterScore(ci,id,t){

  let c = state.competitions[ci];

  if(c.locked){
    return;
  }

  currentScores = new Array(c.zones).fill(null);

  let old = c.scores[id + "-" + t];

  if(old){
    currentScores = [...old];
  }

  let pilot =
  state.pilots.find(
    p => p.id === id
  );

  let isAB =
  c.status[id] === "AB";

  let html = `

<h3 class="score-tour">
Tour ${t}
</h3>

<div class="score-pilot">

${pilot?.name || ""}

</div>

<div id="zones"></div>

<div class="score-actions">

  <button onclick="saveScore(${ci},'${id}',${t})">
    Valider
  </button>

  ${
    isAB
    ? `
      <button
      onclick="cancelAB(${ci},'${id}')">

      Annuler abandon

      </button>
    `
    : `
      <button
      class="delete"
      onclick="declareAB(${ci},'${id}')">

      Déclarer abandon

      </button>
    `
  }

  <button
    onclick="selectPilot(${ci})">

    Retour

  </button>

</div>

`;

  app.innerHTML=html;

  let z="";

  for(let i=0;i<c.zones;i++){

z+=`
<div class="zone-block">

  <span class="zone-label">
    Zone ${i+1} :
  </span>

  ${[0,1,2,3,5].map(v=>`

  <button
    class="score-btn ${currentScores[i]===v ? "selected" : ""}"
    onclick="setScore(${i},${v},this)">
    ${v}
  </button>

  `).join("")}

</div>
`;
  }

  document.getElementById("zones").innerHTML=z;
}

function showDoublePointageMatin(i){

  let c = state.competitions[i];

  let participants = c.participants
    .map(id => getPilotById(id))
  .filter(p => p)
  .map(p => ({

    ...p,

    plaque:
      c.participantPlates?.[p.id]
      ??
      p.plaque

  }));

  function plaqueNumber(p){

    return parseInt(
      String(p.plaque || "")
        .replace(/[^\d]/g,"")
    ) || 99999;

  }

  function mainCat(cat){

    if(cat.startsWith("N4")) return "N4";
    if(cat.startsWith("N5")) return "N5";

    return cat;
  }

  const order = ["N4","N5"];

  let list = participants

    .filter(p=>

      p.cat.startsWith("N4")
      ||
      p.cat.startsWith("N5")

    )

    .sort((a,b)=>{

      let diff =
        order.indexOf(mainCat(a.cat))
        -
        order.indexOf(mainCat(b.cat));

      if(diff!==0){
        return diff;
      }

      return plaqueNumber(a)
        -
        plaqueNumber(b);

    });

  let html = `

<div class="topbar">

<div class="topbar-title">
Double Pointage Matin
</div>

<div class="topbar-actions">

<button onclick="printDoublePointageMatinPDF()">
Export PDF
</button>

<button onclick="showExportParticipantsMenu(${i})">
Retour
</button>

</div>

</div>

<table class="double-pointage">

<tr>

<th style="width:10%">
Plaque
</th>

<th style="width:38%">
Nom
</th>

<th style="width:16%">
Catégorie
</th>

<th style="width:12%">
Tour 1
</th>

<th style="width:12%">
Tour 2
</th>

<th style="width:12%">
Tour 3
</th>

</tr>

`;

let rowCount = 0;

  list.forEach(p=>{

    html += `

<tr>

<td>
${p.plaque || ""}
</td>

<td style="
text-align:left;
">
${p.name}
</td>

<td
style="
background:${getCategoryColor(p.cat)};
">
${p.cat}
</td>

<td></td>

<td></td>

<td></td>

</tr>

`;

rowCount++;

  });

const minRows = 43
;

while(rowCount < minRows){

  html += `

<tr>

<td>&nbsp;</td>
<td></td>
<td></td>
<td></td>
<td></td>
<td></td>

</tr>

`;

  rowCount++;

}

  html += `
</table>
`;

window.currentExportInfo = {

  type:"double-pointage-matin",

  competitionName:c.name,

  competitionDate:c.date

};

  app.innerHTML = html;

}

function showDoublePointageApresMidi(i){

  let c = state.competitions[i];

  let participants = c.participants
    .map(id => getPilotById(id))
  .filter(p => p)
  .map(p => ({

    ...p,

    plaque:
      c.participantPlates?.[p.id]
      ??
      p.plaque

  }));

  function plaqueNumber(p){

    return parseInt(
      String(p.plaque || "")
        .replace(/[^\d]/g,"")
    ) || 99999;

  }

  function mainCat(cat){

    if(cat.startsWith("Elite")) return "Elite";
    if(cat.startsWith("N1")) return "N1";
    if(cat.startsWith("N2")) return "N2";
    if(cat.startsWith("N3")) return "N3";

    return cat;
  }

  const order = ["Elite","N1","N2","N3"];

  let list = participants

    .filter(p=>

      p.cat.startsWith("Elite")
      ||
      p.cat.startsWith("N1")
      ||
      p.cat.startsWith("N2")
      ||
      p.cat.startsWith("N3")

    )

    .sort((a,b)=>{

      let diff =
        order.indexOf(mainCat(a.cat))
        -
        order.indexOf(mainCat(b.cat));

      if(diff!==0){
        return diff;
      }

      return plaqueNumber(a)
        -
        plaqueNumber(b);

    });

  let html = `

<div class="topbar">

<div class="topbar-title">
Double Pointage Matin
</div>

<div class="topbar-actions">

<button onclick="printDoublePointageApresMidiPDF()">
Export PDF
</button>

<button onclick="showExportParticipantsMenu(${i})">
Retour
</button>

</div>

</div>

<table class="double-pointage">

<tr>

<th style="width:10%">
Plaque
</th>

<th style="width:38%">
Nom
</th>

<th style="width:16%">
Catégorie
</th>

<th style="width:12%">
Tour 1
</th>

<th style="width:12%">
Tour 2
</th>

<th style="width:12%">
Tour 3
</th>

</tr>

`;

  let rowCount = 0;

  list.forEach(p=>{

    let group = mainCat(p.cat);

    currentGroup = group;

    html += `

<tr>

<td>
${p.plaque || ""}
</td>

<td style="
text-align:left;
">
${p.name}
</td>

<td
style="
background:${getCategoryColor(p.cat)};
">
${p.cat}
</td>

<td></td>

<td></td>

<td></td>

</tr>

`;

rowCount++;

  });

const minRows = 43;

while(rowCount < minRows){

  html += `

<tr>

<td>&nbsp;</td>
<td></td>
<td></td>
<td></td>
<td></td>
<td></td>

</tr>

`;

  rowCount++;

}

  html += `
</table>
`;

window.currentExportInfo = {

  type:"double-pointage-matin",

  competitionName:c.name,

  competitionDate:c.date

};

  app.innerHTML = html;

}

function setScore(i,v,btn){

  currentScores[i]=v;

  let parent=btn.parentElement;

  parent.querySelectorAll(".score-btn").forEach(b=>{
    b.classList.remove("selected");
  });

  btn.classList.add("selected");
}

function saveScore(ci,id,t){

let c=state.competitions[ci];

if(c.locked){
return;
}

if(currentScores.includes(null)){

app.innerHTML=`

<h3>
Saisie incomplète
</h3>

<div class="card">

⚠️ Certaines zones
n'ont pas été renseignées.

<br><br>

Complète toutes les zones
avant validation.

</div>

<div class="score-actions">

<button
onclick="enterScore(${ci},'${id}',${t})">

Retour

</button>

</div>

`;

return;

}

c.scores[id+"-"+t]=[
...currentScores
];

Object.keys(c.tiebreaks)
.forEach(key=>{

if(key.includes(id)){

delete c.tiebreaks[key];

}

});

save();

updateTVResults(ci);

selectPilot(ci);

}

// ===== STATS =====

function buildStats(c){

  let stats=[];

  c.participants.forEach(id=>{

    let p=getPilotById(id);

    if(!p) return;

    let total=0;

    let nb0=0;
    let nb1=0;
    let nb2=0;
    let nb3=0;
    let nb5=0;

    let tours=[];
    let completed=true;

    for(let t=1;t<=c.tours;t++){

      let s=c.scores[id+"-"+t];

      if(!s){

        completed=false;
        tours.push("-");
        continue;
      }

      let tourTotal=0;

      s.forEach(v=>{

if(v===null){
  completed=false;
  return;
}

        total+=v;
        tourTotal+=v;

        if(v===0) nb0++;
        if(v===1) nb1++;
        if(v===2) nb2++;
        if(v===3) nb3++;
        if(v===5) nb5++;
      });

      tours.push(tourTotal);
    }

    let validTours=tours.filter(v=>v!=="-");

    let bestTour=validTours.length
      ? Math.min(...validTours)
      : "-";

    stats.push({
      id,
      name:p.name,
      club:p.club || "",
      cat:p.cat,
      lic:p.lic,
      total,
      tours,
      nb0,
      nb1,
      nb2,
      nb3,
      nb5,
      bestTour,
      completed,
      status:getPilotStatus(c,id),
      tiebreak:false,
pendingTie:false,
externalTie:false
    });
  });

  return stats;
}
 
// ===== TIEBREAK =====

function applyTieBreaks(list,c,groupName){

  let unresolved=false;

  let groups={};

  list.forEach(p=>{

    let key=equalityKey(p);

    if(!groups[key]){
      groups[key]=[];
    }

    groups[key].push(p);
  });

  let final=[];

  Object.values(groups).forEach(group=>{

    if(group.length===1){

      final.push(group[0]);
      return;
    }
let validGroup=group.every(p=>
  p.completed
  &&
  p.status!=="AB"
);

if(!validGroup){

  group.forEach(p=>{
    final.push(p);
  });

  return;
}

    let ids=group.map(p=>p.id).sort();

    let tieKey=groupName+"-"+ids.join("-");

    let saved=c.tiebreaks[tieKey];

    if(saved){

      saved.forEach(id=>{

        let found=group.find(p=>p.id===id);

        if(found){
          found.tiebreak=true;
found.tieKey=tieKey;

final.push(found);
        }
      });

    }else{

      unresolved=true;

      group.forEach(p=>{

        p.pendingTie=true;
        p.tieKey=tieKey;

        final.push(p);
      });
    }
  });

  return {
    list:final,
    unresolved
  };
}

// ===== TABLE =====

function renderTable(title,list,c,htmlRef,ci,provisional){

  htmlRef+=`
  <div class="print-page">

  <div class="section-title">
  CLASSEMENT ${title} — ${c.name} (${c.date || ""})
</div>

<div class="category-status ${
  provisional
  ? "status-provisoire"
  : "status-ok"
}">
  ${
    provisional
    ? "⚠️ Classement provisoire"
    : "✔ Classement validé"
  }

  <div class="print-footer">
  <span> </span>
  <span class="pageCounter"></span>
</div>

</div>

<table>

<tr>

  <th class="col-name">NOM</th>
  <th class="col-club">CLUB</th>
  <th class="col-cat">CATEGORIE</th>

  <th class="col-small">Nb 0</th>
  <th class="col-small">Nb 1</th>
  <th class="col-small">Nb 2</th>
  <th class="col-small">Nb 3</th>
  <th class="col-small">Nb 5</th>
`;

  for(let t=1;t<=c.tours;t++){

    htmlRef+=`
    <th class="col-tour">TOUR<br>${t}</th>
    `;
  }

  htmlRef+=`

    <th class="col-best">MEILLEUR<br>TOUR</th>
    <th class="col-total">TOTAL</th>
    <th class="col-rank">PLACE<br>SCRATCH</th>
    <th class="col-rank">PLACE<br>UFOLEP</th>
    <th class="col-points">POINTS<br>UFOLEP</th>

  </tr>
  `;

  list.forEach((p,index)=>{

    htmlRef+=`
    <tr class="${
      p.lic === "FFC" || p.lic === "NL"
        ? "ranking-non-ufolep"
        : ""
    }">

      <td>

        <b>${p.name}

        <b>${p.tiebreak
   ? `
<span class="tie-icon">⚖️</span>

<button class="delete"
  style="font-size:10px;padding:2px 5px;"
  onclick="cancelTieBreak(${ci},'${p.tieKey}')">

  X

</button>
`
: ""
}

${p.externalTie
  ? `<span class="tie-icon">⚖️</span>`
  : ""
}

        ${p.pendingTie
  ? `
  <button class="tie-btn"
    onclick="manageTieBreak(${ci},'${p.tieKey}')">
    ⚖️
  </button>
  `
  : ""
}

      </td>

      <td><b>${p.club}</td>
      <td><b>${p.cat}</td>

      <td><b>${p.status==="AB"?"AB":p.nb0}</td>
      <td><b>${p.status==="AB"?"AB":p.nb1}</td>
      <td><b>${p.status==="AB"?"AB":p.nb2}</td>
      <td><b>${p.status==="AB"?"AB":p.nb3}</td>
      <td><b>${p.status==="AB"?"AB":p.nb5}</td>
    `;

    p.tours.forEach(v=>{

      htmlRef+=`
      <td><b>${p.status==="AB"?"AB":v}</td>
      `;
    });

    htmlRef+=`

      <td><b>${p.status==="AB"?"AB":p.bestTour}</td>
      <td><b>${p.status==="AB"?"AB":p.total}</td>
      <td><b>${p.rankScratch}</td>
      <td><b>${p.rankUfolep}</td>
      <td><b>${p.ufoPoints}</td>

    </tr>
    `;
  });

  htmlRef+=`
  </table>

  <div class="print-note">
    Rappel : seuls les pilotes titulaires d'une licence UFOLEP peuvent être classés.
  </div>
    
  <div class="print-note3">
   Le signe ⚖️ indique pour les pilotes concernés, qu'une égalité parfaite a été départagée sur une zone.
  </div>

  </div>

  `;

  return htmlRef;
}

function buildResultsHTML(i){

  let c = state.competitions[i];
  let stats = buildStats(c);

  let html = "";

  let exportIntermediaire = false;

html += `

<div class="topbar">

  <div class="topbar-title">
    Classements
  </div>

  <div class="topbar-actions">

    <button onclick="printResults()">
      Export PDF
    </button>

    <button
  id="tvDisplayButton"
  onclick="toggleTVDisplay()"
>
  ${
    tvDisplayActive
      ? "🛑 Arrêter affichage TV"
      : "📺 Affichage TV"
  }
</button>

    <button onclick="returnCompetitionMenu()">
    Retour
    </button>

  </div>

</div>
`;

    let groups = MAIN_GROUPS;

  // ===== GROUPES PRINCIPAUX =====
  groups.forEach(g => {

    let list = stats.filter(p => g.cats.includes(p.cat));
    if(!list.length) return;

    // 1. TRI SCRATCH
    list = buildOrderedRanking(list);

    // 2. TIE BREAK
    let tieResult = applyTieBreaks(list, c, g.title);
list = tieResult.list;

    // 3. RANK FINAL
    list = buildOrderedRanking(list);

const provisional =
  tieResult.unresolved ||
  list.some(p => !p.completed && p.status !== "AB");

if(provisional){
  exportIntermediaire = true;
}

html = renderTable(
  g.title,
  list,
  c,
  html,
  i,
  provisional
);
  });

// ===== FEMININ =====

let femaleList = stats.filter(
  p => categoryOrderFemale[p.cat] !== undefined
);

if (femaleList.length) {

  femaleList.sort((a, b) => {

    if (a.status === "AB" && b.status !== "AB") return 1;
    if (a.status !== "AB" && b.status === "AB") return -1;

    let catDiff =
      categoryOrderFemale[a.cat] -
      categoryOrderFemale[b.cat];

    if (catDiff !== 0) return catDiff;

    return Engine.compare(a, b);
  });

  // 🔥 DEPARTAGE FEMININ INDEPENDANT
  let finalFemaleList = [];
let unresolvedFemale = false;

[
  "Elite F",
  "N1 F",
  "N2 F",
  "N3 F",
  "N4 F",
  "N5 F"
].forEach(cat=>{

  let subList = femaleList.filter(
    p => p.cat === cat
  );

  let tie = applyTieBreaks(
    subList,
    c,
    cat
  );

  if(tie.unresolved){
    unresolvedFemale = true;
  }

  finalFemaleList.push(...tie.list);

});

femaleList = finalFemaleList;

  // 🔥 IMPORTANT :
  // PAS de rankPreservingOrder ici

  // rank manuel
  femaleList.forEach((p, idx) => {
    p.rankScratch = idx + 1;
  });

  // UFOLEP
  let ufoOrdered = femaleList
    .filter(p => p.lic === "UFOLEP");

  femaleList.forEach(p => {

  p.rankUfolep = "-";
  p.ufoPoints = 0;
});

ufoOrdered.forEach((p, i) => {

  p.rankUfolep = i + 1;

  p.ufoPoints =
    p.status === "AB"
      ? 1
      : Engine.getUfolepPoints(i + 1);
});

const femaleProvisional =
  unresolvedFemale ||
  femaleList.some(
    p => !p.completed && p.status !== "AB"
  );

if(femaleProvisional){
  exportIntermediaire = true;
}

  html = renderTable(
  "FEMININ",
  femaleList,
  c,
  html,
  i,
  femaleProvisional
);
}

  // ===== VETERAN =====

let veteranList = stats.filter(
  p => categoryOrderVeteran[p.cat] !== undefined
);

if(veteranList.length){

  veteranList.sort((a,b)=>{

    if(a.status === "AB" && b.status !== "AB") return 1;
    if(a.status !== "AB" && b.status === "AB") return -1;

    let diff =
      categoryOrderVeteran[a.cat] -
      categoryOrderVeteran[b.cat];

    if(diff !== 0) return diff;

    return Engine.compare(a,b);
  });

  // 🔥 DEPARTAGE VETERAN INDEPENDANT
  let finalVeteranList = [];
let unresolvedVeteran = false;

[
  "Elite V",
  "N1 V",
  "N2 V",
  "N3 V",
  "N4 V",
  "N5 V"
].forEach(cat=>{

  let subList = veteranList.filter(
    p => p.cat === cat
  );

  let tie = applyTieBreaks(
    subList,
    c,
    cat
  );

  if(tie.unresolved){
    unresolvedVeteran = true;
  }

  finalVeteranList.push(...tie.list);

});

veteranList = finalVeteranList;

  // PAS de rankPreservingOrder

  veteranList.forEach((p,idx)=>{
    p.rankScratch = idx + 1;
  });

  let ufoOrdered = veteranList
    .filter(p => p.lic === "UFOLEP");

  veteranList.forEach(p => {

  p.rankUfolep = "-";
  p.ufoPoints = 0;
});

ufoOrdered.forEach((p, i) => {

  p.rankUfolep = i + 1;

  p.ufoPoints =
    p.status === "AB"
      ? 1
      : Engine.getUfolepPoints(i + 1);
});

const veteranProvisional =
  unresolvedVeteran ||
  veteranList.some(
    p => !p.completed && p.status !== "AB"
  );

if(veteranProvisional){
  exportIntermediaire = true;
}

  html = renderTable(
  "VETERAN",
  veteranList,
  c,
  html,
  i,
  veteranProvisional
);
}

  // ===== ACTIONS =====
  return {
  html: html,
  intermediaire: exportIntermediaire
};

}

function showResults(i){

  currentCompetitionIndex = i;

  const result =
    buildResultsHTML(i);

  window.currentExportInfo = {

    type: "competition",

    name: state.competitions[i].name,

    date: state.competitions[i].date,

    intermediaire:
      result.intermediaire

  };

  window.currentResultsHTML =
    result.html;

  app.innerHTML =
    result.html;

}

function updateTVResults(ci){

  /*
   * Si la fenêtre TV n'est pas ouverte,
   * updateTV ne fera simplement rien.
   */

  if(!tvDisplayActive){

    return;

  }

  const result =
    buildResultsHTML(ci);

  if(!result || !result.html){

    return;

  }

  window.api.updateTV(
    result.html
  );

}

function updateTVButton(){

  const button =
    document.getElementById("tvDisplayButton");

  if(!button){
    return;
  }

  button.textContent =
    tvDisplayActive
      ? "🛑 Arrêter affichage TV"
      : "📺 Affichage TV";

}

if (
  window.api &&
  typeof window.api.onTVClosed === "function"
) {

  window.api.onTVClosed(() => {

    tvDisplayActive = false;

    updateTVButton();

  });

}

async function toggleTVDisplay(){

  /*
   * Si la TV est déjà ouverte :
   * on la ferme.
   */

  if(tvDisplayActive){

    await window.api.closeTV();

    tvDisplayActive = false;

    updateTVButton();

    return;

  }


  /*
   * Sinon on ouvre la TV avec
   * le classement actuellement affiché.
   */

  const ci = currentCompetitionIndex;

  if(ci === undefined || ci === null){

    return;

  }


  const result =
    buildResultsHTML(ci);

  if(!result || !result.html){

    return;

  }


  const opened =
    await window.api.openTV(
      result.html
    );


  /*
   * Si openTV ne retourne rien dans
   * ton code actuel, on considère
   * l'ouverture réussie.
   */

  tvDisplayActive = true;

  updateTVButton();

}

// ===== DEPARTAGE =====

let tempTieOrder=[];

function manageTieBreak(ci,tieKey){

  tempTieOrder=[...tieKey.split("-").slice(1)];

  renderTieBreak(ci,tieKey);
}

function renderTieBreak(ci,tieKey){

  let html=`

  <h3>Départage</h3>

  <p>
    Classe les pilotes dans l'ordre officiel :
  </p>
  `;

  tempTieOrder.forEach((id,index)=>{

    let p=getPilotById(id);

    html+=`

    <div class="card">

      ${index+1}. ${p.name}

      <button onclick="moveUp('${id}','${tieKey}',${ci})">
        ↑
      </button>

      <button onclick="moveDown('${id}','${tieKey}',${ci})">
        ↓
      </button>

    </div>
    `;
  });

  html+=`

  <button onclick="saveTieBreak('${tieKey}',${ci})">
    Valider départage
  </button>

  <button onclick="showResults(${ci})">
    Retour
  </button>
  `;

  app.innerHTML=html;
}

function moveUp(id,tieKey,ci){

  let i=tempTieOrder.indexOf(id);

  if(i<=0){
    return;
  }

  [tempTieOrder[i-1],tempTieOrder[i]]=
  [tempTieOrder[i],tempTieOrder[i-1]];

  renderTieBreak(ci,tieKey);
}

function moveDown(id,tieKey,ci){

  let i=tempTieOrder.indexOf(id);

  if(i>=tempTieOrder.length-1){
    return;
  }

  [tempTieOrder[i+1],tempTieOrder[i]]=
  [tempTieOrder[i],tempTieOrder[i+1]];

  renderTieBreak(ci,tieKey);
}

function saveTieBreak(tieKey,ci){

  let c=state.competitions[ci];
if(c.locked){
  return;
}

  c.tiebreaks[tieKey]=[...tempTieOrder];

  save();

  updateTVResults(ci);

  showResults(ci);
}
let deleteModePilots=false;
let editingPilotId = null;
let editingPilotCat = null;

let editParticipantPlates = false;

function askConfirm(message){

  return new Promise(resolve => {

    const previousHTML = app.innerHTML;

    app.innerHTML = `
      <h3>Confirmation</h3>

      <div class="card">
        ${message}
      </div>

      <button id="confirmYes">Oui</button>
      <button class="delete" id="confirmNo">Non</button>
    `;

    const yesBtn = document.getElementById("confirmYes");
    const noBtn = document.getElementById("confirmNo");

    const cleanup = () => {
      yesBtn.onclick = null;
      noBtn.onclick = null;
    };

    const close = (value) => {
      cleanup();
      app.innerHTML = previousHTML;
      resolve(value);
    };

    yesBtn.onclick = () => close(true);
    noBtn.onclick = () => close(false);

  });
}

function changePilotSort(column){

  if(state.sortPilotsColumn === column){

    state.sortPilotsDirection =
      state.sortPilotsDirection === "asc"
      ? "desc"
      : "asc";

  }else{

    state.sortPilotsColumn = column;
    state.sortPilotsDirection = "asc";
  }

  save();

  showPilots();
}

function changeParticipantSort(column){

  if(state.sortParticipantsColumn === column){

    state.sortParticipantsDirection =
      state.sortParticipantsDirection === "asc"
      ? "desc"
      : "asc";

  }else{

    state.sortParticipantsColumn = column;
    state.sortParticipantsDirection = "asc";
  }

  save();

  manageParticipants(
    state.ui.selectedCompetition
  );
}

function editPilot(id){

  let p = getPilotById(id);

  if(!p) return;

  editingPilotId = id;
  editingPilotCat = p.cat;

  showPilots();

  setTimeout(()=>{
    

    document.getElementById("name").value =
      p.name;

    document.getElementById("club").value =
      p.club || "";

    document.getElementById("lic").value =
      p.lic;

    document.getElementById("cat").value =
      p.cat;
    
    document.getElementById("plaque").value =
      p.plaque || "";

    document.getElementById("licenceNumber").value =
      p.licenceNumber || "";

    document.getElementById("birthDate").value =
      p.birthDate || "";
  },0);
}

function savePilotEdit(){

  let p = getPilotById(editingPilotId);

  if(!p) return;

  let name =
    document.getElementById("name").value;

  let clubSelect =
    document.getElementById("club").value;

  let lic =
    document.getElementById("lic").value;

  let plaque =
  document.getElementById("plaque").value.trim();

  let licenceNumber =
  document.getElementById("licenceNumber").value.trim();

  let birthDate =
  document.getElementById("birthDate").value;

  let club = clubSelect;

  if(clubSelect === "NEW"){

    club =
      document.getElementById("newClub").value;

    if(
      club &&
      !state.clubs.includes(club)
    ){
      state.clubs.push(club);
    }
  }

  p.name = format(name);
  p.club = club;
  p.lic = lic;
  p.plaque = plaque;
  p.licenceNumber = licenceNumber;
  p.birthDate = birthDate;

  editingPilotId = null;
  editingPilotCat = null;

  save();

  showPilots();
}

function toggleDeletePilots(){

  deleteModePilots=!deleteModePilots;

  showPilots();
}

async function deletePilot(id){

let pilot = state.pilots.find(p => p.id === id);

  if(!pilot){
  console.warn(
    "deletePilot : pilote introuvable",
    id
  );
  showPilots();
  return;
}

  let used = false;

  state.competitions.forEach(c => {
    if(c.participants.includes(id)){
      used = true;
    }
  });

  if(used){

app.innerHTML=`

<h3>
Suppression impossible
</h3>

<div class="card">

⚠️ Ce pilote est utilisé dans au moins
une compétition.

<br><br>

Il ne peut pas être supprimé tant qu'il
figure dans l'historique des compétitions.

</div>

<br>

<button onclick="showPilots()">

Retour

</button>

`;

return;

}

  let ok = await askConfirm(`Supprimer ${pilot.name} ?`);

  if(!ok){
    showPilots();
    return;
  }

  state.pilots =
    state.pilots.filter(p => p.id !== id);

  save();
  showPilots();
}

async function cancelTieBreak(ci,tieKey){

  let c = state.competitions[ci];

  let ok = await askConfirm(
    "Annuler ce départage ?"
  );

  if(!ok){
    return;
  }

  delete c.tiebreaks[tieKey];

  save();

  showResults(ci);
}

async function deleteCompetition(i){

let c = state.competitions[i];

if(c.locked){

app.innerHTML=`

<h3>
Suppression impossible
</h3>

<div class="card">

🔒 Cette compétition est verrouillée.

<br><br>

Une compétition verrouillée est considérée
comme officiellement validée.

<br><br>

Elle ne peut plus être supprimée.

</div>

<br>

<button onclick="returnCompetitionMenu()">

Retour

</button>

`;

return;

}

let ok = await askConfirm(
"Supprimer définitivement :\n\n" +
c.name +
"\n" +
(c.date || "")
);

if(!ok){
return;
}

state.competitions.splice(i,1);

save();

home();

}
async function lockCompetition(i){

let c = state.competitions[i];

  if(c.participants.length===0){

app.innerHTML=`

<h3>
Validation impossible
</h3>

<div class="card">

⚠️ Aucun participant n'a été ajouté.

<br><br>

Une compétition vide
ne peut pas être verrouillée.

</div>

<br>

<button onclick="returnCompetitionMenu()">

Retour

</button>

`;

return;

}

  let stats = buildStats(c);

  let incomplete = stats.some(p =>
    p.status !== "AB" && !p.completed
  );

  if(incomplete){

app.innerHTML=`

<h3>
Validation impossible
</h3>

<div class="card">

⚠️ Certains pilotes ont une saisie incomplète.

<br><br>

Tous les scores doivent être renseignés
avant de verrouiller définitivement
la compétition.


</div>

<br>

<button onclick="returnCompetitionMenu()">

Retour

</button>

`;

return;

}

  let groups = MAIN_GROUPS;

  let unresolved = false;

  groups.forEach(g => {

    let list = stats.filter(
  p => g.cats.includes(p.cat)
);

list = Engine.sortScratch(list);

let tieResult = applyTieBreaks(
  list,
  c,
  g.title
);

    if(tieResult.unresolved){
      unresolved = true;
    }
  });

  if(unresolved){

app.innerHTML=`

<h3>
Validation impossible
</h3>

<div class="card">

⚖️ Certains départages ne sont pas finalisés.

<br><br>

Les classements doivent être entièrement
validés avant de verrouiller
définitivement la compétition.

</div>

<br>

<button onclick="returnCompetitionMenu()">

Retour

</button>

`;

return;

}

  let ok = await askConfirm("Verrouiller définitivement cette compétition ?");
  if(!ok) return;

  c.locked = true;

  save();
  openCompetition(i);
}

async function unlockCompetition(i){

  while(true){

    let data = await askForm("Code admin", [
      {
        key: "code",
        label: "Code admin ?"
      }
    ]);

    // utilisateur ferme / annule
    if(!data){
      return;
    }

    let code = (data.code || "").trim();

    if(code === ""){
      console.log("Code obligatoire");
      continue;
    }

    if(code !== "1234"){
      console.log("Code incorrect");
      continue;
    }

    // ✅ bon code
    break;
  }

  state.competitions[i].locked = false;

  save();

  openCompetition(i);
}
// ===== CHAMPIONNAT =====

function showChampionshipChoice(){

  let html=`

<h2>
  Championnat UFOLEP
</h2>

  <div class="card">

    Choisir le nombre de jokers :

    <br><br>

    <button onclick="showChampionship(0)">
      0 Joker
    </button>

    <button onclick="showChampionship(1)">
      1 Joker
    </button>

    <button onclick="showChampionship(2)">
      2 Jokers
    </button>

    </div>

    <button onclick="goHome()">
      Retour
    </button>
    `;

  app.innerHTML=html;
}

function parseDateFR(str){

  if(!str){
    return 0;
  }

  let p=str.split("/");

  return new Date(
    p[2],
    p[1]-1,
    p[0]
  ).getTime();
}

function buildChampionship(jokers){

  // compétitions verrouillées uniquement
  let competitions=state.competitions
    .filter(c=>c.locked);

  // tri chronologique
  competitions.sort((a,b)=>
    parseDateFR(a.date)-parseDateFR(b.date)
  );

  let championship={};

  // création pilotes
  state.pilots
  .filter(p=>p.lic==="UFOLEP")
  .forEach(p=>{

    championship[p.id]={

      pilot:p,

      scores:{},

      totalBrut:0,

      jokerPoints:0,

      totalNet:0
    };
});

  // récupération points
  competitions.forEach(comp=>{

    let stats=buildStats(comp);

    MAIN_GROUPS.forEach(g=>{

      let list=stats.filter(
        p=>g.cats.includes(p.cat)
      );

      if(!list.length){
        return;
      }

      list = buildOrderedRanking(list);

let tieResult = applyTieBreaks(
  list,
  comp,
  g.title
);

list = buildOrderedRanking(tieResult.list);

      list.forEach((p,index)=>{

        let points=0;

        if(p.lic==="UFOLEP"){

          let ufoPos=list
            .filter(x=>x.lic==="UFOLEP")
            .findIndex(x=>x.id===p.id)+1;

          points=
            p.status==="AB"
            ? 1
            : Engine.getUfolepPoints(ufoPos);
        }

       if(championship[p.id]){
        championship[p.id]
          .scores[comp.name]=points;
        }
      });
    });
  });

  // absences = 0
  Object.values(championship).forEach(row=>{

    competitions.forEach(comp=>{

      if(row.scores[comp.name]===undefined){

        row.scores[comp.name]=0;
      }
    });

    let values=Object.values(row.scores);

    row.totalBrut=
      values.reduce((a,b)=>a+b,0);

    let sorted=[...values]
      .sort((a,b)=>a-b);

    let removed=
      sorted.slice(0,jokers);

    row.jokerPoints=
      removed.reduce((a,b)=>a+b,0);

    row.totalNet=
      row.totalBrut-row.jokerPoints;
  });

  return {
    competitions,
    championship
  };
}



function renderChampionshipTable(
  title,
  cats,
  data,
  competitions,
  html
){

  let rows=Object.values(data)
    .filter(r=>
      cats.includes(r.pilot.cat)
    );

  if(!rows.length){
    return html;
  }

  rows.sort((a,b)=>
    b.totalNet-a.totalNet
  );

  // ===== GESTION DES EX ÆQUO =====

  let currentPlace = 1;

  rows.forEach((r,index)=>{

    if(
      index > 0 &&
      r.totalNet !== rows[index-1].totalNet
    ){
      currentPlace = index + 1;
    }

    r.champRank = currentPlace;

  });

  html+=`

  <div class="print-page">

  <div class="section-title">
  CLASSEMENT ${title} — CHAMPIONNAT UFOLEP
  <br>
  SAISON ${window.currentExportInfo.startYear}-${window.currentExportInfo.endYear}
  (${state.currentJokers || 0} joker${(state.currentJokers || 0) > 1 ? "s" : ""})
</div>

  <table>

  <tr>

    <th class="col-name">NOM</th>

    <th class="col-club">CLUB</th>

    <th class="col-cat">CATEGORIE</th>
  `;

  competitions.forEach(comp=>{

    html+=`
    <th class="col-points">
      ${comp.name}
    </th>
    `;
  });

  html+=`

    <th class="col-points">BRUTS</th>

    <th class="col-points">JOKERS</th>

    <th class="col-points">NETS</th>

    <th class="col-rank">PLACE</th>

  </tr>
  `;

  rows.forEach((r,index)=>{

    html+=`
    <tr>

      <td style="font-weight:bold;"><b>${r.pilot.name}</td>

      <td style="font-weight:bold;">${r.pilot.club || ""}</td>

      <td style="font-weight:bold;">${r.pilot.cat}</td>
    `;

    competitions.forEach(comp=>{

      html+=`
      <td>
        ${r.scores[comp.name]}
      </td>
      `;
    });

    html+=`

      <td style="font-weight:bold;">${r.totalBrut}</td>

      <td style="font-weight:bold;">${r.jokerPoints}</td>

      <td style="font-weight:bold;"><b>${r.totalNet}</b></td>

      <td style="font-weight:bold;"><b>${r.champRank}</td>

    </tr>
    `;
  });

  html+=`
  </table>

  <div class="print-note">
    Rappel : seuls les pilotes titulaires d'une licence UFOLEP peuvent être classés. 0 point pour une compétition = pilote Absent de cette compétition.
  </div>
    
    </div>

  `;

  return html;
}

function buildFemaleChampionship(jokers){

  let competitions = state.competitions
    .filter(c => c.locked);

  competitions.sort((a,b)=>
    parseDateFR(a.date)-parseDateFR(b.date)
  );

  let championship = {};

  state.pilots
    .filter(p =>
      p.lic === "UFOLEP"
      &&
      categoryOrderFemale[p.cat] !== undefined
    )
    .forEach(p => {

      championship[p.id] = {

        pilot:p,

        scores:{},

        totalBrut:0,

        jokerPoints:0,

        totalNet:0
      };
    });

  competitions.forEach(comp => {

    let stats = buildStats(comp);

   let femaleList = stats
  .filter(p => categoryOrderFemale[p.cat] !== undefined);

femaleList.sort((a,b)=>{

  let catDiff =
    categoryOrderFemale[a.cat]
    - categoryOrderFemale[b.cat];

  if(catDiff !== 0){
    return catDiff;
  }

  return Engine.compare(a,b);
});

    if(!femaleList.length){
      return;
    }

    let finalFemaleList = [];

[
  "Elite F",
  "N1 F",
  "N2 F",
  "N3 F",
  "N4 F",
  "N5 F"
].forEach(cat=>{

  let subList = femaleList.filter(
    p => p.cat === cat
  );

  let tieResult = applyTieBreaks(
    subList,
    comp,
    cat
  );

  finalFemaleList.push(
    ...tieResult.list
  );

});

femaleList = finalFemaleList;

    femaleList.forEach((p,index)=> {

  let points = 0;

  if(p.lic !== "UFOLEP") return;

  let ufoPos = femaleList
    .filter(x => x.lic === "UFOLEP")
    .findIndex(x => x.id === p.id) + 1;

  points =
    p.status === "AB"
    ? 1
    : Engine.getUfolepPoints(ufoPos);

  if(championship[p.id]){
  championship[p.id].scores[comp.name] = points;
}
  });
});

  Object.values(championship).forEach(row => {

    competitions.forEach(comp => {

      if(row.scores[comp.name] === undefined){

        row.scores[comp.name] = 0;
      }
    });

    let values = Object.values(row.scores);

    row.totalBrut =
      values.reduce((a,b)=>a+b,0);

    let sorted = [...values]
      .sort((a,b)=>a-b);

    let removed =
      sorted.slice(0,jokers);

    row.jokerPoints =
      removed.reduce((a,b)=>a+b,0);

    row.totalNet =
      row.totalBrut-row.jokerPoints;
  });

  return {
    competitions,
    championship
  };
}

function buildVeteranChampionship(jokers){

  let competitions = state.competitions
    .filter(c => c.locked);

  competitions.sort((a,b)=>
    parseDateFR(a.date)-parseDateFR(b.date)
  );

  let championship = {};

  state.pilots
    .filter(p =>
      p.lic === "UFOLEP"
      &&
      categoryOrderVeteran[p.cat] !== undefined
    )
    .forEach(p => {

      championship[p.id] = {
        pilot:p,
        scores:{},
        totalBrut:0,
        jokerPoints:0,
        totalNet:0
      };
    });

  competitions.forEach(comp => {

    let stats = buildStats(comp);

let vetList = stats
  .filter(p => categoryOrderVeteran[p.cat] !== undefined);

if(!vetList.length){
  return;
}

vetList.sort((a,b)=>{

  let catDiff =
    categoryOrderVeteran[a.cat]
    - categoryOrderVeteran[b.cat];

  if(catDiff !== 0){
    return catDiff;
  }

  return Engine.compare(a,b);
});

let finalVetList = [];

[
  "Elite V",
  "N1 V",
  "N2 V",
  "N3 V",
  "N4 V",
  "N5 V"
].forEach(cat=>{

  let subList = vetList.filter(
    p => p.cat === cat
  );

  let tieResult = applyTieBreaks(
    subList,
    comp,
    cat
  );

  finalVetList.push(
    ...tieResult.list
  );

});

vetList = finalVetList;

vetList.forEach((p,index)=>{

  if(p.lic !== "UFOLEP") return;

  let ufoPos = vetList
    .filter(x => x.lic === "UFOLEP")
    .findIndex(x => x.id === p.id) + 1;

  let points =
    p.status === "AB"
    ? 1
    : Engine.getUfolepPoints(ufoPos);

  if(championship[p.id]){
    championship[p.id].scores[comp.name] = points;
  }
});
  });

  Object.values(championship).forEach(row => {

    competitions.forEach(comp => {
      if(row.scores[comp.name] === undefined){
        row.scores[comp.name] = 0;
      }
    });

    let values = Object.values(row.scores);

    row.totalBrut = values.reduce((a,b)=>a+b,0);

    let sorted = [...values].sort((a,b)=>a-b);

    row.jokerPoints = sorted.slice(0,jokers)
      .reduce((a,b)=>a+b,0);

    row.totalNet = row.totalBrut - row.jokerPoints;
  });

  return {
    competitions,
    championship
  };
}

function showChampionship(jokers){

    state.currentJokers = jokers;

  let builtMain = buildChampionship(jokers);

  let builtFemale = buildFemaleChampionship(jokers);

  let builtVeteran = buildVeteranChampionship(jokers);

  let competitions = builtMain.competitions;

  const years = competitions
  .map(c => {

    if(c.date.includes("-")){
      return parseInt(c.date.split("-")[0]);
    }

    if(c.date.includes("/")){
      return parseInt(c.date.split("/")[2]);
    }

    return NaN;

  })
  .filter(y => !isNaN(y));

  const startYear = Math.min(...years);
  const endYear = Math.max(...years);

  window.currentExportInfo = {
    type: "championship",
    startYear,
    endYear
  };

  let dataMain = builtMain.championship;

  let dataFemale = builtFemale.championship;

  let dataVeteran = builtVeteran.championship;

  let html=`

  <div class="topbar">

    <div class="topbar-title">
    </div>

    <div class="topbar-actions">

      <button onclick="printChampionshipPDF()">
      Export PDF
      </button>

      <button onclick="showChampionshipChoice()">
        Retour
      </button>

    </div>

  </div>
  `;

  MAIN_GROUPS.forEach(g=>{

    html=renderChampionshipTable(
      g.title,
      g.cats,
      dataMain,
      competitions,
      html
    );
  });

  // ===== FEMININ =====
  html=renderChampionshipTable(
    "FEMININ",
    [
      "Elite F",
      "N1 F",
      "N2 F",
      "N3 F",
      "N4 F",
      "N5 F"
    ],
    dataFemale,
    competitions,
    html
  );

  // ===== VETERAN =====
  html=renderChampionshipTable(
    "VETERAN",
    [
      "Elite V",
      "N1 V",
      "N2 V",
      "N3 V",
      "N4 V",
      "N5 V"
    ],
    dataVeteran,
    competitions,
    html
  );

  app.innerHTML=html;
}

function printPDFPWA(fileName){

  const oldTitle =
    document.title;

  document.title =
    fileName.replace(/\.pdf$/i,"");

  const restoreTitle = () => {

    document.title =
      oldTitle;

    window.removeEventListener(
      "afterprint",
      restoreTitle
    );

  };

  window.addEventListener(
    "afterprint",
    restoreTitle
  );

  window.print();

}

async function printResults(){

  const info =
    window.currentExportInfo;

  if(!info){

    return;

  }


  const safeName =
    info.name
      .replace(/[\\/:*?"<>|]/g,"_")
      .replace(/\s+/g,"_");


  const safeDate =
    formatDateForFile(info.date);


  const suffix =
    info.intermediaire
      ? "_INTERMEDIAIRE"
      : "";


  const fileName =
    `Resultats_${safeName}_${safeDate}${suffix}.pdf`;


  // ================================
  // ELECTRON
  // ================================

  if(
    window.api &&
    typeof window.api.exportPDF === "function"
  ){

    await window.api.exportPDF({

      fileName,
      landscape:true

    });

    return;

  }


  // ================================
  // PWA / NAVIGATEUR
  // ================================

  if(
    typeof window.print === "function"
  ){

    printPDFPWA(fileName);

    return;

  }


  alert(
    "L'export PDF n'est pas disponible sur cet appareil."
  );

}

// ===== CLASSEMENT CLUBS =====

function buildClubChampionship(){

  let competitions = state.competitions
    .filter(c => c.locked)
    .sort((a,b)=>parseDateFR(a.date)-parseDateFR(b.date));

  let clubs = {};

  competitions.forEach(comp => {

    let stats = buildStats(comp);

    // ===== GROUPES PRINCIPAUX =====
    MAIN_GROUPS.forEach(g=>{

      let list = stats.filter(
        p => g.cats.includes(p.cat)
      );

      if(!list.length){
        return;
      }

      list = buildOrderedRanking(list);

      let tieResult = applyTieBreaks(
        list,
        comp,
        g.title
      );

      list = buildOrderedRanking(tieResult.list);

      list.forEach(p => {

        if(p.lic !== "UFOLEP") return;

        let ufoList = list.filter(x => x.lic === "UFOLEP");

        let ufoPos = ufoList.findIndex(x => x.id === p.id) + 1;

        let points = p.status === "AB"
          ? 1
          : Engine.getUfolepPoints(ufoPos);

        let club = p.club || "SANS CLUB";

        if(!clubs[club]){
          clubs[club] = {
            club,
            scores: {},
            total: 0
          };
        }

        clubs[club].scores[comp.name] =
          (clubs[club].scores[comp.name] || 0) + points;

        clubs[club].total += points;
      });
    });

// ===== FEMININ =====
let femaleList = stats.filter(
  p => categoryOrderFemale[p.cat] !== undefined
);

if (femaleList.length) {

  femaleList.sort((a,b)=>{

    if(a.status === "AB" && b.status !== "AB") return 1;
    if(a.status !== "AB" && b.status === "AB") return -1;

    let catDiff =
      categoryOrderFemale[a.cat] -
      categoryOrderFemale[b.cat];

    if(catDiff !== 0) return catDiff;

    return Engine.compare(a,b);
  });

  // 🔥 DEPARTAGE OFFICIEL
  let femaleTie = applyTieBreaks(
    femaleList,
    comp,
    "FEMININ"
  );

  femaleList = femaleTie.list;

  // 🔥 RANK FINAL
  femaleList.forEach((p,idx)=>{
    p.rankScratch = idx + 1;
  });

  // 🔥 UFOLEP STABLE
  const femaleUfoList = femaleList.filter(
  p => p.lic === "UFOLEP"
);

const femaleUfoRankMap = new Map();

femaleUfoList.forEach((p,i)=>{
  femaleUfoRankMap.set(p.id, i + 1);
});

  // 🔥 POINTS CLUBS
  femaleList.forEach(p => {

    if(p.lic !== "UFOLEP") return;

    const ufoPos = femaleUfoRankMap.get(p.id);

    if(!ufoPos) return;

    const points =
      p.status === "AB"
        ? 1
        : Engine.getUfolepPoints(ufoPos);

    const club = p.club || "SANS CLUB";

    if(!clubs[club]){
      clubs[club] = {
        club,
        scores: {},
        total: 0
      };
    }

    // 🔥 IMPORTANT = ADDITION
    clubs[club].scores[comp.name] =
      (clubs[club].scores[comp.name] || 0)
      + points;

    clubs[club].total += points;
  });
}

// ===== VETERAN =====
let veteranList = stats.filter(
  p => categoryOrderVeteran[p.cat] !== undefined
);

if(veteranList.length){

  veteranList.sort((a,b)=>{

    if(a.status === "AB" && b.status !== "AB") return 1;
    if(a.status !== "AB" && b.status === "AB") return -1;

    let diff =
      categoryOrderVeteran[a.cat] -
      categoryOrderVeteran[b.cat];

    if(diff !== 0) return diff;

    return Engine.compare(a,b);
  });

  // 🔥 DEPARTAGE OFFICIEL
  let veteranTie = applyTieBreaks(
    veteranList,
    comp,
    "VETERAN"
  );

  veteranList = veteranTie.list;

  // 🔥 RANK FINAL
  veteranList.forEach((p,idx)=>{
    p.rankScratch = idx + 1;
  });

  // 🔥 UFOLEP STABLE
  const veteranUfoList = veteranList.filter(
    p => p.lic === "UFOLEP"
  );

  const veteranUfoRankMap = new Map();

  veteranUfoList.forEach((p,i)=>{
  veteranUfoRankMap.set(p.id, i + 1);
});

  // 🔥 POINTS CLUBS
  veteranList.forEach(p => {

    if(p.lic !== "UFOLEP") return;

    const ufoPos = veteranUfoRankMap.get(p.id);

    if(!ufoPos) return;

    const points =
      p.status === "AB"
        ? 1
        : Engine.getUfolepPoints(ufoPos);

    const club = p.club || "SANS CLUB";

    if(!clubs[club]){
      clubs[club] = {
        club,
        scores: {},
        total: 0
      };
    }

    // 🔥 IMPORTANT = ADDITION
    clubs[club].scores[comp.name] =
        (clubs[club].scores[comp.name] || 0)
        + points;

      clubs[club].total += points;
    });
  }
  });

  return {
    competitions,
    clubs
  };
}

async function printChampionshipPDF(){

  const info =
    window.currentExportInfo;

  if(!info){
    return;
  }

  const fileName =
    `Classement_Championnat_UFOLEP_${info.startYear}-${info.endYear}.pdf`;


  // ================================
  // ELECTRON
  // ================================

  if(
    window.api &&
    typeof window.api.exportPDF === "function"
  ){

    await window.api.exportPDF({

      fileName,
      landscape:true

    });

    return;

  }


  // ================================
  // PWA / NAVIGATEUR
  // ================================

  if(
    typeof window.print === "function"
  ){

    printPDFPWA(fileName);

    return;

  }


  alert(
    "L'export PDF n'est pas disponible sur cet appareil."
  );

}

function showClubChampionship(){

  let built=buildClubChampionship();

  let competitions=built.competitions;

  let rows=Object.values(built.clubs);

  rows.sort((a,b)=>b.total-a.total);

const years = competitions
  .map(c => {

    if(c.date.includes("-")){
      return parseInt(c.date.split("-")[0]);
    }

    if(c.date.includes("/")){
      return parseInt(c.date.split("/")[2]);
    }

    return NaN;

  })
  .filter(y => !isNaN(y));

const startYear = Math.min(...years);
const endYear = Math.max(...years);

let html=`

  <h2>
    CLASSEMENT CLUBS — CHAMPIONNAT UFOLEP
    <br>
    SAISON ${startYear}-${endYear}
  </h2>

  <div class="topbar">

    <div class="topbar-title">
          </div>

    <div class="topbar-actions">

      <button onclick="printClubPDF()">
      Export PDF
      </button>

      <button onclick="goHome()">
        Retour
      </button>

    </div>

  </div>
`;
html += `

  <div class="print-page">

  <table>

  <tr>

    <th class="col-club">
      Club
    </th>
  `;

  competitions.forEach(comp=>{

    html+=`

    <th class="col-points">
      ${comp.name}
    </th>
    `;
  });
html+=`
      <th class="col-points">
      Total
    </th>

    <th class="col-rank">
      Place
    </th>

  </tr>
  `;

  let lastScore=null;
  let lastRank=0;

  rows.forEach((r,index)=>{

    let rank;

    if(r.total===lastScore){

      rank=lastRank;

    }else{

      rank=index+1;

      lastRank=rank;

      lastScore=r.total;
    }

    html+=`

    <tr>

      <td><b>${r.club}</td>
    `;

    competitions.forEach(comp=>{

      html+=`

      <td>
        ${r.scores[comp.name] || 0}
      </td>
      `;
    });

    html+=`

      <td>
        <b>${r.total}</b>
      </td>

      <td>
        <b>${rank}
      </td>

    </tr>
    `;
  });

  html+=`

  </table>

  <div class="print-note">

    Classement calculé sur le cumul de tous les points UFOLEP
    des pilotes du club toutes catégories confondues.

  </div>

  </div>

  `;

window.currentExportInfo = {
  type: "clubs",
  startYear,
  endYear
};

  app.innerHTML=html;
}

async function printClubPDF(){

  const info =
    window.currentExportInfo;

  if(!info){
    return;
  }

  const fileName =
    `Classement_Clubs_${info.startYear}-${info.endYear}.pdf`;


  // ================================
  // ELECTRON
  // ================================

  if(
    window.api &&
    typeof window.api.exportPDF === "function"
  ){

    await window.api.exportPDF({

      fileName,
      landscape:true

    });

    return;

  }


  // ================================
  // PWA / NAVIGATEUR
  // ================================

  if(
    typeof window.print === "function"
  ){

    printPDFPWA(fileName);

    return;

  }


  alert(
    "L'export PDF n'est pas disponible sur cet appareil."
  );

}

async function printDoublePointageMatinPDF(){

  const info =
    window.currentExportInfo;

  if(!info){
    return;
  }

  const dateFR =
    formatDateForFile(info.competitionDate);

  const fileName =
    `Double_Pointage_Matin_${info.competitionName}_${dateFR}.pdf`;


  // ================================
  // ELECTRON
  // ================================

  if(
    window.api &&
    typeof window.api.exportPDF === "function"
  ){

    await window.api.exportPDF({

      fileName,
      landscape:false

    });

    return;

  }


  // ================================
  // PWA / NAVIGATEUR
  // ================================

  if(
    typeof window.print === "function"
  ){

    printPDFPWA(fileName);

    return;

  }


  alert(
    "L'export PDF n'est pas disponible sur cet appareil."
  );

}

async function printDoublePointageApresMidiPDF(){

  const info =
    window.currentExportInfo;

  if(!info){
    return;
  }

  const dateFR =
    formatDateForFile(info.competitionDate);

  const fileName =
    `Double_Pointage_Apres_Midi_${info.competitionName}_${dateFR}.pdf`;


  // ================================
  // ELECTRON
  // ================================

  if(
    window.api &&
    typeof window.api.exportPDF === "function"
  ){

    await window.api.exportPDF({

      fileName,
      landscape:false

    });

    return;

  }


  // ================================
  // PWA / NAVIGATEUR
  // ================================

  if(
    typeof window.print === "function"
  ){

    printPDFPWA(fileName);

    return;

  }


  alert(
    "L'export PDF n'est pas disponible sur cet appareil."
  );

}

async function exportPilotsExcelPWA(){

  try{


    if(typeof ExcelJS === "undefined"){

      alert(
        "Impossible de charger le module ExcelJS."
      );

      return;

    }

    /*
     * ================================
     * ORDRES DE TRI
     * ================================
     */

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
      "N5 V"

    ];


    /*
     * ================================
     * TRI ALPHA
     * ================================
     */

    const alpha = [...state.pilots].sort((a,b)=>

      (a.name || "").localeCompare(
        b.name || ""
      )

    );


    /*
     * ================================
     * TRI PLAQUE
     * ================================
     */

    const plaque = [...state.pilots].sort((a,b)=>{

      const catDiff =
        categoryOrder.indexOf(a.cat)
        -
        categoryOrder.indexOf(b.cat);

      if(catDiff !== 0){
        return catDiff;
      }

      const plaqueA =
        parseInt(
          String(a.plaque || "")
            .replace(/[^\d]/g,"")
        ) || 99999;

      const plaqueB =
        parseInt(
          String(b.plaque || "")
            .replace(/[^\d]/g,"")
        ) || 99999;

      if(plaqueA !== plaqueB){
        return plaqueA - plaqueB;
      }

      return (a.name || "").localeCompare(
        b.name || ""
      );

    });


    /*
     * ================================
     * TRI CLUB
     * ================================
     */

    const club = [...state.pilots].sort((a,b)=>

      (a.club || "").localeCompare(
        b.club || ""
      )

    );


    /*
     * ================================
     * TRI CATÉGORIE
     * ================================
     */

    const categorie = [...state.pilots].sort((a,b)=>{

      const diff =
        categoryOrder.indexOf(a.cat)
        -
        categoryOrder.indexOf(b.cat);

      if(diff !== 0){
        return diff;
      }

      return (a.name || "").localeCompare(
        b.name || ""
      );

    });


    /*
     * ================================
     * CRÉATION DU CLASSEUR EXCELJS
     * ================================
     */

    const workbook =
      new ExcelJS.Workbook();


    /*
     * ================================
     * COULEURS
     * ================================
     */

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


    /*
     * ================================
     * CONSTRUCTION D'UNE FEUILLE
     * ================================
     */

    function buildPilotSheetPWA(
      workbook,
      name,
      pilots,
      colorMap
    ){

      const sheet =
        workbook.addWorksheet(name);


      /*
       * Colonnes
       */

      sheet.columns = [

        {
          header:"Plaque",
          key:"plaque",
          width:10
        },

        {
          header:"Nom",
          key:"name",
          width:40
        },

        {
          header:"Club",
          key:"club",
          width:35
        },

        {
          header:"Catégorie",
          key:"cat",
          width:20
        },

        {
          header:"Licence",
          key:"lic",
          width:20
        },

        {
          header:"N° licence",
          key:"licenceNumber",
          width:20
        },

        {
          header:"Date naissance",
          key:"birthDate",
          width:28
        }

      ];


      /*
       * Première ligne figée
       */

      sheet.views = [
        {
          state:"frozen",
          ySplit:1
        }
      ];


      /*
       * Mise en page
       */

      sheet.pageSetup = {

        paperSize:9,

        orientation:"portrait"

      };


      /*
       * En-tête
       */

      const headerRow =
        sheet.getRow(1);


      headerRow.font = {

        bold:true,

        size:16

      };


      headerRow.alignment = {

        horizontal:"center",

        vertical:"middle"

      };


      headerRow.height = 30;


      headerRow.eachCell(cell => {

        cell.fill = {

          type:"pattern",

          pattern:"solid",

          fgColor:{

            argb:"E5E7EB"

          }

        };


        cell.border = {

          top:{
            style:"medium"
          },

          left:{
            style:"medium"
          },

          bottom:{
            style:"medium"
          },

          right:{
            style:"medium"
          }

        };

      });


      /*
       * Pilotes
       */

      pilots.forEach(p=>{

        const row =
          sheet.addRow({

            plaque:
              p.plaque || "",

            name:
              p.name || "",

            club:
              p.club || "",

            cat:
              p.cat || "",

            lic:
              p.lic || "",

            licenceNumber:
              p.licenceNumber || "",

            birthDate:
              p.birthDate
                ? p.birthDate
                    .split("-")
                    .reverse()
                    .join("/")
                : ""

          });


        /*
         * Format monétaire existant
         *
         * ON LE CONSERVE VOLONTAIREMENT
         */

        row.getCell(7).numFmt =
          '# ##0.00 €';


        /*
         * Police
         */

        row.font = {

          bold:true,

          size:14

        };


        /*
         * Alignement
         *
         * Nom = gauche
         * Tout le reste = centré
         */

        row.alignment = {

          horizontal:"center",

          vertical:"middle"

        };


        row.getCell(2).alignment = {

          horizontal:"left",

          vertical:"middle"

        };


        /*
         * Bordures
         */

        row.eachCell(cell => {

          cell.border = {

            top:{
              style:"thin"
            },

            left:{
              style:"thin"
            },

            bottom:{
              style:"thin"
            },

            right:{
              style:"thin"
            }

          };

        });


        /*
         * Couleur catégorie
         */

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


    /*
     * ================================
     * CRÉATION DES 4 FEUILLES
     * ================================
     */

    buildPilotSheetPWA(
      workbook,
      "Tri Alpha",
      alpha,
      colorMap
    );


    buildPilotSheetPWA(
      workbook,
      "Tri Plaque",
      plaque,
      colorMap
    );


    buildPilotSheetPWA(
      workbook,
      "Tri Club",
      club,
      colorMap
    );


    buildPilotSheetPWA(
      workbook,
      "Tri Catégorie",
      categorie,
      colorMap
    );


    /*
     * ================================
     * GÉNÉRATION DU FICHIER
     * ================================
     */

    const fileName =
      "Pilotes.xlsx";

    const buffer =
      await workbook.xlsx.writeBuffer();



    const blob =
      new Blob(

        [buffer],

        {

          type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        }

      );


    /*
 * ================================
 * TÉLÉCHARGEMENT DU FICHIER
 * ================================
 */

const url =
  URL.createObjectURL(blob);

const link =
  document.createElement("a");

link.href = url;

link.download = fileName;

link.style.display = "none";

document.body.appendChild(link);

link.click();

link.remove();

setTimeout(
  () => URL.revokeObjectURL(url),
  5000
);


    /*
     * ================================
     * MESSAGE DE SUCCÈS
     * ================================
     */

    const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (
    navigator.platform === "MacIntel" &&
    navigator.maxTouchPoints > 1
  );

app.innerHTML = `

<h3>
Export terminé
</h3>

<div class="card">

✅ Le fichier Excel Pilotes a été généré.

${
  isIOS
    ? `
    <br><br>
    📱 Sur iPhone/iPad, si le fichier s'ouvre dans Safari,
    utilisez le menu de partage puis
    <strong>Enregistrer dans Fichiers</strong>.
    `
    : ""
}

</div>

<br>

<button onclick="showPilots()">
Retour
</button>

`;

  }

  catch(error){

    /*
     * Annulation du partage :
     * ce n'est PAS une erreur.
     */

    if(error.name === "AbortError"){

      return;

    }


    console.error(

      "Erreur export Excel PWA :",

      error

    );


    alert(

      "Erreur lors de la création du fichier Excel : "
      + error.message

    );

  }

}

async function exportPilotsExcel(){

  /*
   * ================================
   * ELECTRON / PC
   * ================================
   */

  if(
    window.api &&
    typeof window.api.exportExcel === "function"
  ){

    let ok =
      await window.api.exportExcel(
        state.pilots
      );

    if(ok){

      app.innerHTML = `

<h3>
Export terminé
</h3>

<div class="card">

✅ Le fichier Excel Pilotes a été créé.

</div>

<br>

<button onclick="showPilots()">
Retour
</button>

`;

    }

    return;

  }


  /*
   * ================================
   * PWA / IPHONE / IPAD
   * ================================
   */

  await exportPilotsExcelPWA();

}

// ===== BACKUP =====

function exportBackup(){

  let data={

    pilots:state.pilots,
    clubs:state.clubs,
    competitions:state.competitions,

    sortPilotsMode:state.sortPilotsMode,
    sortParticipantsMode:state.sortParticipantsMode,
    sortEntryMode:state.sortEntryMode
  };

  let blob=new Blob(
    [JSON.stringify(data,null,2)],
    {type:"application/json"}
  );

  let url=URL.createObjectURL(blob);

  let a=document.createElement("a");

  let today=new Date();

  let dateString=
    today.getFullYear()
    + "-"
    + String(today.getMonth()+1).padStart(2,"0")
    + "-"
    + String(today.getDate()).padStart(2,"0");

  a.href=url;

  a.download=
    "trial_manager_backup_"+dateString+".json";

  a.click();

  URL.revokeObjectURL(url);
}

function importBackup(){

  document
    .getElementById("backupFile")
    .click();
}

function handleBackupImport(event){

  let file = event.target.files[0];

  if(!file){
    return;
  }

  let reader = new FileReader();

  reader.onload = async function(e){

    try{

      let data = JSON.parse(e.target.result);

      if(
        !data.pilots ||
        !data.competitions
      ){
        throw new Error();
      }

      const ok = await askConfirm(
        "Charger cette sauvegarde remplacera toutes les données actuelles. Continuer ?"
      );

      if(!ok){
        return;
      }

      state.pilots = data.pilots || [];

      state.clubs =
        data.clubs || [...defaultClubs];

      state.competitions =
        data.competitions || [];

      state.sortPilotsMode =
        data.sortPilotsMode || "name";

      state.sortParticipantsMode =
        data.sortParticipantsMode || "name";

      state.sortEntryMode =
        data.sortEntryMode || "name";

      save();

      app.innerHTML = `

        <h3>Sauvegarde restaurée</h3>

        <div class="card">

          ✔ Sauvegarde chargée avec succès

        </div>

        <button onclick="home()">

          Continuer

        </button>

      `;

    }catch(err){

      app.innerHTML = `

        <h3>Erreur</h3>

        <div class="card">

          ❌ Erreur lors du chargement du fichier

        </div>

        <button onclick="home()">

          Retour

        </button>

      `;

    }

  };

  reader.readAsText(file);

  event.target.value = "";

}

function showExportParticipantsMenu(i){

  app.innerHTML = `

    <h2>Exports</h2>

    <div class="card">

      <button onclick="exportParticipantsExcel(${i})">
        Participants Excel
      </button>

      <br><br>

      <button onclick="showDoublePointageMatin(${i})">
      Double Pointage Matin PDF
      </button>

      <br><br>

      <button onclick="showDoublePointageApresMidi(${i})">
      Double Pointage Après-midi PDF
      </button>

    </div>

    <button onclick="returnCompetitionMenu()">
      Retour
    </button>

  `;
}

async function exportDoublePointageMatin(i){

  let c = state.competitions[i];

  let participants = c.participants
    .map(id => getPilotById(id))
    .filter(p => p);

  let ok =
    await window.api.exportDoublePointageMatin({

      participants,

      competitionName:c.name,

      competitionDate:c.date

    });

  if(ok){

    app.innerHTML = `

<h3>
Export terminé
</h3>

<div class="card">

✅ PDF Double Pointage Matin créé.

</div>

<br>

<button onclick="showExportParticipantsMenu(${i})">
Retour
</button>

`;

  }

}


async function exportDoublePointageApresMidi(i){

  let c = state.competitions[i];

  let participants = c.participants
    .map(id => getPilotById(id))
    .filter(p => p);

  let ok =
    await window.api.exportDoublePointageApresMidi({

      participants,

      competitionName:c.name,

      competitionDate:c.date

    });

  if(ok){

    app.innerHTML = `

<h3>
Export terminé
</h3>

<div class="card">

✅ PDF Double Pointage Après-midi créé.

</div>

<br>

<button onclick="showExportParticipantsMenu(${i})">
Retour
</button>

`;

  }

}

async function importPilotsExcel(){

  if(state.competitions.length > 0){

    app.innerHTML = `

<h3>
Import impossible
</h3>

<div class="card">

❌ Des compétitions existent déjà.

<br><br>

L'import pilotes est réservé au démarrage
d'une nouvelle saison.

</div>

<br>

<button onclick="showPilots()">
Retour
</button>

`;

    return;
  }

  const result =
    await window.api.importPilotsExcel();

  if(!result.success){

    if(result.error==="FORMAT"){

      app.innerHTML = `

<h3>
Import impossible
</h3>

<div class="card">

❌ Format Excel invalide.

<br><br>

Le fichier doit provenir de l'export
Pilotes Trial Manager.

</div>

<br>

<button onclick="showPilots()">
Retour
</button>

`;

      return;
    }

    showPilots();

    return;
  }

  state.pilots = [];
  state.clubs = [];

  result.pilots.forEach(p=>{

    state.pilots.push({

      id:generatePilotId(),

      plaque:p.plaque,

      name:p.name,

      club:p.club,

      cat:p.cat,

      lic:p.lic,

      licenceNumber:
        p.licenceNumber,

      birthDate:
        p.birthDate

    });

    if(
      p.club &&
      !state.clubs.includes(p.club)
    ){

      state.clubs.push(p.club);

    }

  });

  save();

  app.innerHTML = `

<h3>
Import terminé
</h3>

<div class="card">

✅ ${state.pilots.length}
pilotes importés.

</div>

<br>

<button onclick="showPilots()">
Continuer
</button>

`;

}

async function exportParticipantsExcelPWA(i){

  try{

    if(typeof ExcelJS === "undefined"){

      alert(
        "Impossible de charger le module ExcelJS."
      );

      return;

    }


    const c =
      state.competitions[i];


    /*
     * ================================
     * PARTICIPANTS
     * ================================
     */

    const participants =
      c.participants
        .map(id => getPilotById(id))
        .filter(p => p)
        .map(p => ({

          ...p,

          plaque:
            c.participantPlates?.[p.id]
            ??
            p.plaque

        }));


    /*
     * ================================
     * COULEURS
     * ================================
     */

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


    /*
     * ================================
     * ORDRE CATÉGORIES
     * ================================
     */

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
      "N5 V"

    ];


    /*
     * ================================
     * CLASSEUR
     * ================================
     */

    const workbook =
      new ExcelJS.Workbook();


    /*
     * ================================
     * OUTIL : STYLE EN-TÊTE
     * ================================
     */

    function styleHeader(sheet){

      const headerRow =
        sheet.getRow(1);


      headerRow.font = {

        bold:true,

        size:16

      };


      headerRow.height = 30;


      headerRow.alignment = {

        horizontal:"center",

        vertical:"middle"

      };


      headerRow.eachCell(cell => {

        cell.fill = {

          type:"pattern",

          pattern:"solid",

          fgColor:{
            argb:"E5E7EB"
          }

        };


        cell.border = {

          top:{
            style:"medium"
          },

          left:{
            style:"medium"
          },

          bottom:{
            style:"medium"
          },

          right:{
            style:"medium"
          }

        };

      });

    }


    /*
     * ================================
     * OUTIL : STYLE LIGNE
     * ================================
     */

    function styleParticipantRow(
      row,
      categoryColumn
    ){

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

          top:{
            style:"thin"
          },

          left:{
            style:"thin"
          },

          bottom:{
            style:"thin"
          },

          right:{
            style:"thin"
          }

        };

      });


      const cat =
        row.getCell(categoryColumn).value;


      const color =
        colorMap[cat];


      if(color){

        row.getCell(categoryColumn).fill = {

          type:"pattern",

          pattern:"solid",

          fgColor:{
            argb:color
          }

        };

      }

    }


    /*
     * ================================
     * ONGLET CLUB + ALPHA
     * ================================
     */

    {

      const sheet =
        workbook.addWorksheet(
          "Club + Alpha"
        );


      sheet.columns = [

        {
          header:"Plaque",
          key:"plaque",
          width:10
        },

        {
          header:"Nom",
          key:"name",
          width:40
        },

        {
          header:"Club",
          key:"club",
          width:35
        },

        {
          header:"Catégorie",
          key:"cat",
          width:20
        },

        {
          header:"Licence",
          key:"lic",
          width:20
        },

        {
          header:"Date naissance",
          key:"birthDate",
          width:28
        },

        {
          header:"Montant",
          key:"amount",
          width:18
        }

      ];


      sheet.views = [

        {
          state:"frozen",
          ySplit:1
        }

      ];


      styleHeader(sheet);


      const clubAlpha =
        [...participants]
        .sort((a,b)=>{

          const clubDiff =
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

      const totalRows = [];


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
                  `SUM(G${firstRowClub}:G${sheet.rowCount})`

              }

            ]);


          totalRow.font = {

            bold:true,

            size:14,

            color:{
              argb:"FF0000"
            }

          };


          totalRow.getCell(7).numFmt =
            '# ##0.00 €';


          totalRow.eachCell(cell => {

            cell.border = {

              top:{
                style:"thin"
              },

              left:{
                style:"thin"
              },

              bottom:{
                style:"thin"
              },

              right:{
                style:"thin"
              }

            };

          });


          totalRows.push(
            totalRow.number
          );


          sheet.addRow([]);


          firstRowClub = null;

        }


        currentClub =
          p.club;


        const row =
          sheet.addRow({

            plaque:
              p.plaque || "",

            name:
              p.name || "",

            club:
              p.club || "",

            cat:
              p.cat || "",

            lic:
              p.lic || "",

            birthDate:
              p.birthDate
                ? p.birthDate
                    .split("-")
                    .reverse()
                    .join("/")
                : "",

            amount:""

          });


        if(firstRowClub === null){

          firstRowClub =
            row.number;

        }


        styleParticipantRow(
          row,
          4
        );


        row.getCell(7).numFmt =
          '# ##0.00 €';

      });


      /*
       * DERNIER CLUB
       */

      if(firstRowClub !== null){

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
                `SUM(G${firstRowClub}:G${sheet.rowCount})`

            }

          ]);


        lastClubTotal.font = {

          bold:true,

          size:14,

          color:{
            argb:"FF0000"
          }

        };


        lastClubTotal.getCell(7).numFmt =
          '# ##0.00 €';


        lastClubTotal.eachCell(cell => {

          cell.border = {

            top:{
              style:"thin"
            },

            left:{
              style:"thin"
            },

            bottom:{
              style:"thin"
            },

            right:{
              style:"thin"
            }

          };

        });


        totalRows.push(
          lastClubTotal.number
        );


        sheet.addRow([]);


        /*
         * TOTAL GÉNÉRAL
         */

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
                `SUM(${
                  totalRows
                    .map(r => `G${r}`)
                    .join(",")
                })`

            }

          ]);


        grandTotal.font = {

          bold:true,

          size:16,

          color:{
            argb:"FF0000"
          }

        };


        grandTotal.getCell(7).numFmt =
          '# ##0.00 €';


        grandTotal.eachCell(cell => {

          cell.border = {

            top:{
              style:"medium"
            },

            left:{
              style:"medium"
            },

            bottom:{
              style:"medium"
            },

            right:{
              style:"medium"
            }

          };

        });

      }

    }


    /*
     * ================================
     * FONCTION ONGLET SIMPLE
     * ================================
     */

    function buildSimpleSheet(
      sheetName,
      list
    ){

      const sheet =
        workbook.addWorksheet(
          sheetName
        );


      sheet.columns = [

        {
          header:"Plaque",
          key:"plaque",
          width:10
        },

        {
          header:"Nom",
          key:"name",
          width:40
        },

        {
          header:"Club",
          key:"club",
          width:35
        },

        {
          header:"Catégorie",
          key:"cat",
          width:20
        },

        {
          header:"Licence",
          key:"lic",
          width:20
        },

        {
          header:"Date naissance",
          key:"birthDate",
          width:28
        }

      ];


      sheet.views = [

        {
          state:"frozen",
          ySplit:1
        }

      ];


      styleHeader(sheet);


      list.forEach(p=>{

        const row =
          sheet.addRow({

            plaque:
              p.plaque || "",

            name:
              p.name || "",

            club:
              p.club || "",

            cat:
              p.cat || "",

            lic:
              p.lic || "",

            birthDate:
              p.birthDate
                ? p.birthDate
                    .split("-")
                    .reverse()
                    .join("/")
                : ""

          });


        styleParticipantRow(
          row,
          4
        );

      });

    }


    /*
     * ================================
     * CATÉGORIE + ALPHA
     * ================================
     */

    const categorieAlpha =
      [...participants]
      .sort((a,b)=>{

        const diff =
          categoryOrder.indexOf(a.cat)
          -
          categoryOrder.indexOf(b.cat);


        if(diff !== 0){

          return diff;

        }


        return (a.name || "")
          .localeCompare(
            b.name || ""
          );

      });


    buildSimpleSheet(
      "Catégorie + Alpha",
      categorieAlpha
    );


    /*
     * ================================
     * MATIN
     * ================================
     */

    const matin =
      participants
      .filter(p =>

        p.cat.startsWith("N4")
        ||
        p.cat.startsWith("N5")

      )
      .sort((a,b)=>

        (a.name || "")
          .localeCompare(
            b.name || ""
          )

      );


    buildSimpleSheet(
      "Matin",
      matin
    );


    /*
     * ================================
     * APRÈS-MIDI
     * ================================
     */

    const apresMidi =
      participants
      .filter(p =>

        p.cat.startsWith("Elite")
        ||
        p.cat.startsWith("N1")
        ||
        p.cat.startsWith("N2")
        ||
        p.cat.startsWith("N3")

      )
      .sort((a,b)=>

        (a.name || "")
          .localeCompare(
            b.name || ""
          )

      );


    buildSimpleSheet(
      "Après-midi",
      apresMidi
    );


    /*
     * ================================
     * CARTONS
     * ================================
     */

    function buildPilotCartonsPWA(
      sheet,
      pilot,
      startRow,
      startCol
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
        colorMap[pilot.cat]
        ||
        "FFFFFF";


      tours.forEach(
        (tour,index)=>{

          const r =
            startRow +
            (index * 11);


          sheet.getRow(r).height =
            25;

          sheet.getRow(r+1).height =
            30;

          sheet.getRow(r+2).height =
            25;


          for(
            let rr=r+3;
            rr<=r+10;
            rr++
          ){

            sheet.getRow(rr).height =
              25;

          }


          /*
           * L1
           */

          sheet.mergeCells(
            r,
            startCol,
            r,
            startCol+2
          );


          sheet.mergeCells(
            r,
            startCol+3,
            r,
            startCol+5
          );


          sheet.getCell(
            r,
            startCol
          ).value =
            pilot.cat;


          sheet.getCell(
            r,
            startCol+3
          ).value =
            tour.nom;


          /*
           * L2 NOM
           */

          sheet.mergeCells(
            r+1,
            startCol,
            r+1,
            startCol+5
          );


          sheet.getCell(
            r+1,
            startCol
          ).value =
            pilot.name;


          sheet.getCell(
            r+1,
            startCol
          ).alignment = {

            horizontal:"center",

            vertical:"middle",

            wrapText:true

          };


          /*
           * L3 CLUB + PLAQUE
           */

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


          /*
           * L4 BARÈME
           */

          const headers =
            ["0","1","2","N","3","5"];


          for(
            let i=0;
            i<6;
            i++
          ){

            sheet.getCell(
              r+3,
              startCol+i
            ).value =
              headers[i];

          }


          /*
           * L5 → L10
           */

          for(
            let zone=1;
            zone<=6;
            zone++
          ){

            sheet.getCell(
              r+3+zone,
              startCol+3
            ).value =
              String(zone);

          }


          /*
           * TOTAL PÉNALITÉ
           */

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


          /*
           * STYLE
           */

          for(
            let rr=r;
            rr<=r+10;
            rr++
          ){

            for(
              let cc=startCol;
              cc<=startCol+5;
              cc++
            ){

              const cell =
                sheet.getCell(
                  rr,
                  cc
                );


              cell.font = {

                bold:true,

                size:11

              };


              cell.alignment = {

                horizontal:"center",

                vertical:"middle",

                wrapText:
                  rr === r+1

              };


              cell.border = {

                top:{
                  style:"thin"
                },

                left:{
                  style:"thin"
                },

                right:{
                  style:"thin"
                },

                bottom:{
                  style:"thin"
                }

              };

            }

          }


          /*
           * COULEUR CATÉGORIE
           */

          for(
            let cc=startCol;
            cc<=startCol+2;
            cc++
          ){

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


          /*
           * COULEUR DU TOUR
           */

          for(
            let rr=r;
            rr<=r+10;
            rr++
          ){

            for(
              let cc=startCol;
              cc<=startCol+5;
              cc++
            ){

              const isNom =
                rr === r+1;


              const isClubPlaque =
                rr === r+2;


              const isCategorie =
                rr === r &&
                cc <= startCol+2;


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


          /*
           * BORDURE EXTÉRIEURE
           */

          const firstRow = r;

          const lastRow =
            r + 10;

          const firstCol =
            startCol;

          const lastCol =
            startCol + 5;


          for(
            let cc=firstCol;
            cc<=lastCol;
            cc++
          ){

            sheet.getCell(
              firstRow,
              cc
            ).border = {

              ...sheet.getCell(
                firstRow,
                cc
              ).border,

              top:{
                style:"medium"
              }

            };


            sheet.getCell(
              lastRow,
              cc
            ).border = {

              ...sheet.getCell(
                lastRow,
                cc
              ).border,

              bottom:{
                style:"medium"
              }

            };

          }


          for(
            let rr=firstRow;
            rr<=lastRow;
            rr++
          ){

            sheet.getCell(
              rr,
              firstCol
            ).border = {

              ...sheet.getCell(
                rr,
                firstCol
              ).border,

              left:{
                style:"medium"
              }

            };


            sheet.getCell(
              rr,
              lastCol
            ).border = {

              ...sheet.getCell(
                rr,
                lastCol
              ).border,

              right:{
                style:"medium"
              }

            };

          }

        }

      );

    }


    function buildBlankCartonsPWA(
      sheet,
      startRow,
      startCol
    ){

      buildPilotCartonsPWA(

        sheet,

        {
          name:"",
          club:"",
          plaque:"",
          cat:""
        },

        startRow,

        startCol

      );

    }


    function buildCartonsSheetPWA(
      sheetName,
      pilots
    ){

      const sheet =
        workbook.addWorksheet(
          sheetName
        );


      sheet.pageSetup = {

        paperSize:9,

        orientation:"portrait",

        verticalCentered:true,

        horizontalCentered:true,

        margins:{

          left:0,
          right:0,
          top:0,
          bottom:0,
          header:0,
          footer:0

        }

      };


      /*
       * 27 colonnes
       */

      for(
        let c=1;
        c<=27;
        c++
      ){

        sheet.getColumn(c).width =
          (
            c===7 ||
            c===14 ||
            c===21
          )
            ? 0.75
            : 4.1;

      }


      let pilotIndex = 0;

      let startRow = 1;


      while(
        pilotIndex <
        pilots.length
      ){

        for(
          let slot=0;
          slot<4;
          slot++
        ){

          if(
            pilotIndex >=
            pilots.length
          ){

            break;

          }


          const pilot =
            pilots[pilotIndex];


          let startCol;


          if(slot===0)
            startCol=1;

          if(slot===1)
            startCol=8;

          if(slot===2)
            startCol=15;

          if(slot===3)
            startCol=22;


          buildPilotCartonsPWA(

            sheet,

            pilot,

            startRow,

            startCol

          );


          pilotIndex++;

        }


        startRow += 33;

      }


      /*
       * PAGE VIERGE DE SECOURS
       */

      for(
        let slot=0;
        slot<4;
        slot++
      ){

        let startCol;


        if(slot===0)
          startCol=1;

        if(slot===1)
          startCol=8;

        if(slot===2)
          startCol=15;

        if(slot===3)
          startCol=22;


        buildBlankCartonsPWA(

          sheet,

          startRow,

          startCol

        );

      }

    }


    buildCartonsSheetPWA(
      "Cartons Matin",
      matin
    );


    buildCartonsSheetPWA(
      "Cartons Après-midi",
      apresMidi
    );


    /*
     * ================================
     * GÉNÉRATION DU FICHIER
     * ================================
     */

    const dateFR =
      c.date
        ? c.date
            .split("-")
            .reverse()
            .join("-")
        : "";


    const fileName =
      `Participants_${c.name}_${dateFR}.xlsx`
        .replaceAll(" ","_");


    const buffer =
      await workbook.xlsx.writeBuffer();


    const blob =
      new Blob(

        [buffer],

        {

          type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        }

      );


    /*
     * ================================
     * TÉLÉCHARGEMENT
     * ================================
     */

    const url =
      URL.createObjectURL(blob);


    const link =
      document.createElement("a");


    link.href =
      url;


    link.download =
      fileName;


    link.style.display =
      "none";


    document.body.appendChild(link);


    link.click();


    link.remove();


    setTimeout(

      () => URL.revokeObjectURL(url),

      5000

    );


    /*
     * ================================
     * SUCCÈS
     * ================================
     */

    const isIOS =
      /iPad|iPhone|iPod/.test(
        navigator.userAgent
      )
      ||
      (
        navigator.platform === "MacIntel"
        &&
        navigator.maxTouchPoints > 1
      );


    app.innerHTML = `

<h3>
Export terminé
</h3>

<div class="card">

✅ Le fichier Excel Participants
a été généré.

${
  isIOS
    ? `
    <br><br>
    📱 Sur iPhone/iPad, si le fichier
    s'ouvre dans Safari, utilisez le
    menu de partage puis
    <strong>Enregistrer dans Fichiers</strong>.
    `
    : ""
}

</div>

<br>

<button onclick="showExportParticipantsMenu(${i})">
Retour
</button>

`;

  }

  catch(error){

    if(error.name === "AbortError"){

      return;

    }


    console.error(
      "Erreur export Participants Excel PWA :",
      error
    );


    alert(
      "Erreur lors de la création du fichier Excel : "
      +
      error.message
    );

  }

}

async function exportParticipantsExcel(i){

  /*
   * ================================
   * ELECTRON / PC
   * ================================
   */

  if(
    window.api &&
    typeof window.api.exportParticipantsExcel === "function"
  ){

    let c =
      state.competitions[i];


    let participants =
      c.participants
        .map(id => getPilotById(id))
        .filter(p => p)
        .map(p => ({

          ...p,

          plaque:
            c.participantPlates?.[p.id]
            ??
            p.plaque

        }));


    let ok =
      await window.api.exportParticipantsExcel({

        participants,

        competitionName:
          c.name,

        competitionDate:
          c.date

      });


    if(ok){

      app.innerHTML = `

<h3>
Export terminé
</h3>

<div class="card">

✅ Le fichier Excel Participants a été créé.

</div>

<br>

<button onclick="showExportParticipantsMenu(${i})">
Retour
</button>

`;

    }

    return;

  }


  /*
   * ================================
   * PWA
   * ================================
   */

  await exportParticipantsExcelPWA(i);

}

function doExportParticipantsExcel(i, mode){ 

  let c = state.competitions[i];

  let list = c.participants
    .map(id => getPilotById(id))
    .filter(p => p);

  mode = mode.toUpperCase();

  // ===== TRI =====

  if(mode==="CAT"){

    list.sort((a,b)=>{

      let catDiff=
        categories.indexOf(a.cat)
        -
        categories.indexOf(b.cat);

      if(catDiff!==0){
        return catDiff;
      }

      return a.name.localeCompare(b.name);
    });
  }
  else{

    list.sort((a,b)=>
      a.name.localeCompare(b.name)
    );
  }

  // ===== DONNÉES =====

  let data=[];

  data.push([
    "NOM PRENOM",
    "CLUB",
    "CATEGORIE",
    "LICENCE",
    "PLAQUE",
    "TOUR 1",
    "TOUR 2",
    "TOUR 3"
  ]);

  list.forEach(p=>{

    data.push([
      p.name,
      p.club || "",
      p.cat,
      p.lic || "",
      "",
      "",
      "",
      ""
    ]);
  });

  // ===== WORKBOOK =====

  let wb=XLSX.utils.book_new();

  let ws=XLSX.utils.aoa_to_sheet(data);

  // ===== LARGEUR COLONNES =====

  ws["!cols"]=[

    {wch:28}, // NOM
    {wch:22}, // CLUB
    {wch:14}, // CAT
    {wch:14}, // LICENCE
    {wch:10}, // PLAQUE
    {wch:10}, // TOUR1
    {wch:10}, // TOUR2
    {wch:10}  // TOUR3
  ];

  // ===== STYLE EN-TÊTES =====

  let headers=[
    "A1",
    "B1",
    "C1",
    "D1",
    "E1",
    "F1",
    "G1",
    "H1"
  ];

  headers.forEach(cell=>{

    if(ws[cell]){

      ws[cell].s={

        font:{
          bold:true,
          color:{rgb:"FFFFFF"}
        },

        fill:{
          fgColor:{rgb:"111827"}
        },

        alignment:{
          horizontal:"center"
        }
      };
    }
  });

  // ===== COULEURS CATEGORIES =====

  for(let r=2;r<=list.length+1;r++){

    let cat=data[r-1][2];

    let color=CATEGORY_COLORS[cat];

    if(ws["C"+r]){

      ws["C"+r].s={

        fill:{
          fgColor:{rgb:color}
        },

        alignment:{
          horizontal:"center"
        }
      };
    }
  }

  XLSX.utils.book_append_sheet(
    wb,
    ws,
    "Participants"
  );

  XLSX.writeFile(
    wb,
    c.name.replaceAll(" ","_")+"_participants.xlsx"
  );
}

function getCategoryColor(cat){

  if(cat.startsWith("Elite F")) return "#EC4899";
  if(cat.startsWith("Elite V")) return "#6B7280";
  if(cat.startsWith("Elite")) return "#FACC15";

  if(cat.startsWith("N1 F")) return "#EC4899";
  if(cat.startsWith("N1 V")) return "#6B7280";
  if(cat.startsWith("N1")) return "#DC2626";

  if(cat.startsWith("N2 F")) return "#EC4899";
  if(cat.startsWith("N2 V")) return "#6B7280";
  if(cat.startsWith("N2")) return "#2563EB";

  if(cat.startsWith("N3 F")) return "#EC4899";
  if(cat.startsWith("N3 V")) return "#6B7280";
  if(cat.startsWith("N3")) return "#16A34A";

  if(cat.startsWith("N4 F")) return "#EC4899";
  if(cat.startsWith("N4 V")) return "#6B7280";
  if(cat.startsWith("N4")) return "#ffffff";

  if(cat.startsWith("N5 F")) return "#EC4899";
  if(cat.startsWith("N5 V")) return "#6B7280";
  if(cat.startsWith("N5")) return "#EA580C";

  return "#FFFFFF";
}

// ===== RESET FIN DE SAISON =====

async function seasonReset() {

  while(true){

    let data = await askForm("Code admin", [
      { key: "code", label: "Code" },
      { key: "confirm", label: "Tape RESET" }
    ]);

    // fermeture / annulation
    if(!data){
      return;
    }

    let code = (data.code || "").trim();
    let confirm = (data.confirm || "").trim();

    if(code === ""){
      console.log("Code obligatoire");
      continue;
    }

    if(code !== "1234"){
      console.log("Code incorrect");
      continue;
    }

    if(confirm !== "RESET"){
      console.log("Tape RESET exactement");
      continue;
    }

    // ✅ tout est bon
    break;
  }

  let ok = await askConfirm("Tout supprimer ?");
  
  if(!ok){
    return;
  }

  state.competitions = [];
  state.pilots = [];
  state.clubs = [...defaultClubs];

  save();

  home();
}
// ===== INIT =====

setInterval(() => {
  save();
}, 10000);

render();