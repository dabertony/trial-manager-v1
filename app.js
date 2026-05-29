console.log("APP JS LOAD", new Date().toISOString());
const app = document.getElementById("app");

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
      10,9,8,7,6,5,4,3,2,
      1,1,1,1,1,1,1,1,1,1
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

  "N4":"EEEEEE",
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
}

function format(v){
  return v.toUpperCase().trim();
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
            ? `<span class="locked-badge">VERROUILLÉE</span>`
            : ""
          }

        </div>

        <div class="comp-date">
          📅 ${c.date || "Date inconnue"}
        </div>

      </div>

      <button class="comp-delete"
        onclick="event.stopPropagation();deleteCompetition(${i})">

        X

      </button>

    </div>

  </div>
  `;
});

  app.innerHTML=html;
}

// ===== PILOTES =====

function showPilots(){

  state.ui.currentScreen = "pilots";

  let mode = state.sortPilotsMode || "nameAZ";

  let pilots = sortPilots(
    state.pilots,
    mode
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

      <div>

        Trier :

        <select onchange="changePilotSort(this.value)">

          <option value="nameAZ"
            ${mode==="nameAZ"?"selected":""}>
            Nom A → Z
          </option>

          <option value="nameZA"
            ${mode==="nameZA"?"selected":""}>
            Nom Z → A
          </option>

          <option value="catASC"
            ${mode==="catASC"?"selected":""}>
            Catégorie Elite → N5
          </option>

          <option value="catDESC"
            ${mode==="catDESC"?"selected":""}>
            Catégorie N5 → Elite
          </option>

          <option value="club"
            ${mode==="club"?"selected":""}>
            Club
          </option>

        </select>

      </div>

      <div style="
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        align-items:center;
      ">

        <input id="name" placeholder="Nom">

        <select
  id="cat"
  ${editingPilotId ? "disabled" : ""}
>
          ${categories.map(c=>`<option>${c}</option>`).join("")}
        </select>

        <select id="club" onchange="toggleClub()">
          <option value="">--Club--</option>
          ${state.clubs.map(c=>`<option>${c}</option>`).join("")}
          <option value="NEW">NOUVEAU</option>
        </select>

        <input id="newClub"
          placeholder="Nouveau club"
          style="display:none">

        <select id="lic">
          <option value="UFOLEP">UFOLEP</option>
          <option value="FFC">FFC</option>
          <option value="NL">NON LICENCIÉ</option>
        </select>

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

        <button onclick="goHome()">
          Retour
        </button>

      </div>

    </div>

  </div>
  `;

  pilots.forEach((p,index)=>{

    html+=`
    <div class="card ${getCatClass(p.cat)} ">

      ${p.cat} - ${p.name} - ${p.club || "Sans club"} - ${p.lic}

<button
  style="float:right;margin-left:6px"
  onclick="editPilot('${p.id}')">

  ✏️

</button>

      ${
        deleteModePilots
        ? `
        <button class="delete"
          style="float:right"
          onclick="deletePilot('${p.id}')">
          X
        </button>
        `
        : ""
      }

    </div>
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

function toggleClub(){

  document.getElementById("newClub").style.display=
    document.getElementById("club").value==="NEW"
    ? "block"
    : "none";
}

function addPilot(){
  editingPilotId = null;
  editingPilotCat = null;
  let name=format(document.getElementById("name").value);

  let cat=document.getElementById("cat").value;

  let clubSel=document.getElementById("club").value;

  let newClub=format(document.getElementById("newClub").value);

  let lic=document.getElementById("lic").value;

  let club=clubSel==="NEW" ? newClub : clubSel;

  if(!name){
    return alert("Nom obligatoire");
  }

  if(clubSel==="NEW" && !newClub){
    return alert("Club manquant");
  }

  if(club && !state.clubs.includes(club)){
    state.clubs.push(club);
  }

  state.pilots.push({
    id:generatePilotId(),
    name,
    cat,
    club,
    lic
  });

  save();

  showPilots();
}

// ===== COMPETITIONS =====

async function newCompetition(){

  console.log("newCompetition lancé");

  let data = await askForm("Nouvelle compétition", [
    { key: "name", label: "Nom" },
    { key: "date", label: "Date (JJ/MM/AAAA)" },
    { key: "zones", label: "Nombre de zones", type:"number" },
    { key: "tours", label: "Nombre de tours", type:"number" }
  ]);

    state.competitions.push({
    name: format(data.name),
    date: data.date,
    zones: parseInt(data.zones),
    tours: parseInt(data.tours),
    participants: [],
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

    <input id="compDate" placeholder="Date">

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
      value="${c.date}"
      placeholder="Date">

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
  state.ui.currentScreen = "competition";

  state.ui.selectedCompetition = i;
  let c=state.competitions[i];

  let lockedBanner="";

if(c.locked){

lockedBanner=`

<div style="
  background:#dc2626;
  color:white;
  padding:14px;
  border-radius:10px;
  margin:12px 0;
  font-weight:bold;
  text-align:center;
  line-height:1.5;
  box-shadow:0 2px 6px rgba(0,0,0,0.2);
">

  🔒 COMPÉTITION VERROUILLÉE

  <br><br>

  Cette compétition est officiellement validée.

  <br>

  Plus aucune modification n'est possible :
  participants, scores, abandons et départages sont figés définitivement.

  <br><br>

  Les classements généraux UFOLEP utilisent uniquement
  les compétitions verrouillées.

</div>
`;

}

app.innerHTML=`

${lockedBanner}

<button onclick="manageParticipants(${i})"
${c.locked ? "disabled" : ""}>
Participants
</button>

<button onclick="exportParticipantsExcel(${i})">
Export Excel liste Des Participants
</button>

<button onclick="selectPilot(${i})"
${c.locked ? "disabled" : ""}>
Saisie Des Scores
</button>

<button onclick="showResults(${i})">
Classements
</button>

${
  !c.locked
  ? `
    <button onclick="editCompetition(${i})">
      Modifier Infos Compétition
    </button>
    `
  : ""
}

${
  c.locked
  ? `
    <span class="locked-badge">ARCHIVÉE</span>

    <button class="delete"
      onclick="unlockCompetition(${i})">

      Déverrouiller Admin

    </button>
    `
  : `
    <button onclick="lockCompetition(${i})">
      Verrouiller
    </button>
    `
}

  <button onclick="goHome()">
Retour
</button>

`;

}

// ===== TRI =====

function sortPilots(list,mode){

  let arr=[...list];

// Compatibilité anciennes sauvegardes
if(mode==="name") mode="nameAZ";
if(mode==="cat") mode="catASC";

  // ===== NOM A -> Z =====
  if(mode==="nameAZ"){

    arr.sort((a,b)=>
      a.name.localeCompare(b.name)
    );
  }

  // ===== NOM Z -> A =====
  if(mode==="nameZA"){

    arr.sort((a,b)=>
      b.name.localeCompare(a.name)
    );
  }

  // ===== CAT ELITE -> N5 =====
  if(mode==="catASC"){

    arr.sort((a,b)=>{

      let diff =
        categories.indexOf(a.cat)
        - categories.indexOf(b.cat);

      if(diff!==0) return diff;

      return a.name.localeCompare(b.name);
    });
  }

  // ===== CAT N5 -> ELITE =====
  if(mode==="catDESC"){

    arr.sort((a,b)=>{

      let diff =
        categories.indexOf(b.cat)
        - categories.indexOf(a.cat);

      if(diff!==0) return diff;

      return a.name.localeCompare(b.name);
    });
  }

  // ===== CLUB =====
  if(mode==="club"){

    arr.sort((a,b)=>{

      let diff =
        (a.club||"").localeCompare(b.club||"");

      if(diff!==0) return diff;

      return a.name.localeCompare(b.name);
    });
  }

  return arr;
}

// ===== PARTICIPANTS =====

function manageParticipants(i){

  let c=state.competitions[i];
if(c.locked){

  app.innerHTML=`

  <h3>Compétition verrouillée</h3>

  <div class="card">
    Les participants sont figés.
  </div>

  <button onclick="openCompetition(${i})">
    Retour
  </button>
  `;

  return;
}

  let list=sortPilots(
    state.pilots,
    state.sortParticipantsMode
  );

  let html=`

<div class="topbar">

  <div class="topbar-title">
    Participants
  </div>

  <div class="topbar-actions">

    <button onclick="openCompetition(${i})">
      Retour
    </button>

  </div>

</div>
`;
html += `

  Trier :

  <select onchange="changeSortParticipants(this.value,${i})">

      <option value="nameAZ"
    ${state.sortParticipantsMode==="nameAZ"?"selected":""}>
    Nom A → Z
  </option>

  <option value="nameZA"
    ${state.sortParticipantsMode==="nameZA"?"selected":""}>
    Nom Z → A
  </option>

  <option value="catASC"
    ${state.sortParticipantsMode==="catASC"?"selected":""}>
    Catégorie Elite → N5
  </option>

  <option value="catDESC"
    ${state.sortParticipantsMode==="catDESC"?"selected":""}>
    Catégorie N5 → Elite
  </option>

  <option value="club"
    ${state.sortParticipantsMode==="club"?"selected":""}>
    Club
  </option>

  </select>
  `;

  list.forEach((p,index)=>{

    let sel=c.participants.includes(p.id)
      ? "✅"
      : "";

    html+=`
    <div class="card ${getCatClass(p.cat)} "
     onclick="toggleP(${i},'${p.id}')">
      ${sel} ${p.cat} - ${p.name} - ${p.club || "Sans club"} - ${p.lic}
    </div>
    `;
  });

  app.innerHTML=html;
}

function changeSortParticipants(mode,i){

  state.sortParticipantsMode=mode;

  save();

  manageParticipants(i);
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

  <button onclick="openCompetition(${i})">
    Retour
  </button>
  `;

  return;
}

  let list=c.participants
    .map(id=>getPilotById(id))
    .filter(p=>p);

  list=sortPilots(list,state.sortEntryMode);

  let html=`

<div class="topbar">

  <div class="topbar-title">
    Saisie des scores
  </div>

  <div class="topbar-actions">

    <button onclick="openCompetition(${i})">
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

    <option value="club"
      ${state.sortEntryMode==="club"?"selected":""}>
      Club
    </option>

  </select>
  `;

  list.forEach((p,index)=>{

    let status=getPilotStatus(c,p.id);

    html+=`
    <div class="card ${getCatClass(p.cat)} ">

      <span onclick="pilotDetail(${i},'${p.id}')">

      ${getStatus(c,p.id)}
      ${p.cat} - ${p.name} - ${p.club || "Sans club"} - ${p.lic}

      </span>

      ${status==="OK"
        ? `
        <button class="delete ab-btn"
          onclick="event.stopPropagation();declareAB(${i},'${p.id}')">
          AB
        </button>
        `
        : `
        <button class="ab-btn"
          onclick="event.stopPropagation();cancelAB(${i},'${p.id}')">
          ANNULER AB
        </button>
        `
      }

    </div>
    `;
  });

  app.innerHTML=html;
}

function changeSortEntry(mode,i){

  state.sortEntryMode=mode;

  save();

  selectPilot(i);
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

  html+=`
  <button onclick="selectPilot(${ci})">
    Retour
  </button>
  `;

  app.innerHTML=html;
}

function declareAB(ci,id){

  let c=state.competitions[ci];

  if(!confirm("Confirmer abandon ?")){
    return;
  }

  c.status[id]="AB";

  save();

  selectPilot(ci);
}

function cancelAB(ci,id){

  let c=state.competitions[ci];
if(c.locked){
  return;
}

  c.status[id]="OK";

  save();

  selectPilot(ci);
}

function enterScore(ci,id,t){

  let c=state.competitions[ci];
if(c.locked){
  return;
}

  currentScores=new Array(c.zones).fill(null);

  let old=c.scores[id+"-"+t];

  if(old){
    currentScores=[...old];
  }

  let html=`

  <h3>Tour ${t}</h3>

  <div id="zones"></div>

  <button onclick="saveScore(${ci},'${id}',${t})">
    Valider
  </button>

  <button class="delete" onclick="pilotDetail(${ci},'${id}')">
    Retour
  </button>
  `;

  app.innerHTML=html;

  let z="";

  for(let i=0;i<c.zones;i++){

    z+=`
    <div>

      Zone ${i+1} :

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
    return alert("Zones manquantes");
  }

  state.competitions[ci].scores[id+"-"+t]=currentScores;

Object.keys(c.tiebreaks).forEach(key=>{

  if(key.includes(id)){

    delete c.tiebreaks[key];
  }
});

  save();

  pilotDetail(ci,id);
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
    <th class="col-rank">PLACE<br>Scratch</th>
    <th class="col-rank">PLACE<br>UFOLEP</th>
    <th class="col-points">POINTS<br>UFOLEP</th>

  </tr>
  `;

  list.forEach((p,index)=>{

    htmlRef+=`
    <tr>

      <td>

        ${p.name}

        ${p.tiebreak
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

      <td>${p.club}</td>
      <td>${p.cat}</td>

      <td>${p.status==="AB"?"AB":p.nb0}</td>
      <td>${p.status==="AB"?"AB":p.nb1}</td>
      <td>${p.status==="AB"?"AB":p.nb2}</td>
      <td>${p.status==="AB"?"AB":p.nb3}</td>
      <td>${p.status==="AB"?"AB":p.nb5}</td>
    `;

    p.tours.forEach(v=>{

      htmlRef+=`
      <td>${p.status==="AB"?"AB":v}</td>
      `;
    });

    htmlRef+=`

      <td>${p.status==="AB"?"AB":p.bestTour}</td>
      <td>${p.status==="AB"?"AB":p.total}</td>
      <td>${p.rankScratch}</td>
      <td>${p.rankUfolep}</td>
      <td>${p.ufoPoints}</td>

    </tr>
    `;
  });

  htmlRef+=`
  </table>

  <div class="print-note">
    Rappel : seuls les pilotes titulaires d'une licence UFOLEP peuvent être classés.
  </div>
    
  <div class="print-note3">
   Le signe ⚖️ indique pour les pilotes concernés, qu'une égalité parfaite a été départagée sur une zone uniquement pour les prétendants aux podiums concernés.
  </div>

  </div>

  `;

  return htmlRef;
}

function showResults(i){

  let c = state.competitions[i];
  let stats = buildStats(c);

  let html = "";

html += `

<div class="topbar">

  <div class="topbar-title">
    Classements
  </div>

  <div class="topbar-actions">

    <button onclick="printResults()">
      Export PDF
    </button>

    <button onclick="openCompetition(${i})">
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

    html = renderTable(
      g.title,
      list,
      c,
      html,
      i,
      tieResult.unresolved
||
list.some(p => !p.completed && p.status !== "AB")
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
  let tieResult = applyTieBreaks(
    femaleList,
    c,
    "FEMININ"
  );

  femaleList = tieResult.list;

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

  html = renderTable(
    "FEMININ",
    femaleList,
    c,
    html,
    i,
    tieResult.unresolved ||
    femaleList.some(
      p => !p.completed && p.status !== "AB"
    )
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
  let tieResult = applyTieBreaks(
    veteranList,
    c,
    "VETERAN"
  );

  veteranList = tieResult.list;

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

  html = renderTable(
    "VETERAN",
    veteranList,
    c,
    html,
    i,
    tieResult.unresolved ||
    veteranList.some(
      p => !p.completed && p.status !== "AB"
    )
  );
}

  // ===== ACTIONS =====
  
  app.innerHTML = html;
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

  showResults(ci);
}
let deleteModePilots=false;
let editingPilotId = null;
let editingPilotCat = null;

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

function changePilotSort(mode){

  state.sortPilotsMode=mode;

  save();

  showPilots();
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
    alert("Pilote introuvable");
    return;
  }

  let used = false;

  state.competitions.forEach(c => {
    if(c.participants.includes(id)){
      used = true;
    }
  });

  if(used){
    alert("Pilote utilisé dans une compétition");
    showPilots();
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
    alert("Impossible de supprimer une compétition verrouillée");
    return;
  }

  let ok = await askConfirm(
    "Supprimer définitivement :\n\n" +
    c.name + "\n" + (c.date || "")
  );

  if(!ok) return;

  state.competitions.splice(i,1);

  save();
  home();
}
async function lockCompetition(i){

let c = state.competitions[i];

  if(c.participants.length === 0){
    alert("Aucun participant");
    return;
  }

  let stats = buildStats(c);

  let incomplete = stats.some(p =>
    p.status !== "AB" && !p.completed
  );

  if(incomplete){
    alert("Des pilotes ont une saisie incomplète");
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

  await askConfirm(
    "Verrouillage impossible : départages non finalisés"
  );

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

  html+=`

  <div class="print-page">

  <div class="section-title">
  CLASSEMENT ${title} — CHAMPIONNAT UFOLEP
  (${state.currentJokers || 0} joker${(state.currentJokers || 0) > 1 ? "s" : ""})
</div>

  <table>

  <tr>

    <th class="col-rank">Place</th>

    <th class="col-name">Nom</th>

    <th class="col-club">Club</th>

    <th class="col-cat">Catégorie</th>
  `;

  competitions.forEach(comp=>{

    html+=`
    <th class="col-points">
      ${comp.name}
    </th>
    `;
  });

  html+=`

    <th class="col-points">Bruts</th>

    <th class="col-points">Jokers</th>

    <th class="col-points">Nets</th>

  </tr>
  `;

  rows.forEach((r,index)=>{

    html+=`
    <tr>

      <td>${index+1}</td>

      <td>${r.pilot.name}</td>

      <td>${r.pilot.club || ""}</td>

      <td>${r.pilot.cat}</td>
    `;

    competitions.forEach(comp=>{

      html+=`
      <td>
        ${r.scores[comp.name]}
      </td>
      `;
    });

    html+=`

      <td>${r.totalBrut}</td>

      <td>${r.jokerPoints}</td>

      <td><b>${r.totalNet}</b></td>

    </tr>
    `;
  });

  html+=`
  </table>

  <div class="print-note">
    Rappel : seuls les pilotes titulaires d'une licence UFOLEP peuvent être classés.
  </div>
    
  <div class="print-note2">
  0 point pour une compétition = pilote Absent de cette compétition.
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

    let tieResult = applyTieBreaks(
      femaleList,
      comp,
      "FEMININ"
    );

    femaleList = tieResult.list;

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

let tieResult = applyTieBreaks(
  vetList,
  comp,
  "VETERAN"
);

vetList = tieResult.list;

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

  let dataMain = builtMain.championship;

  let dataFemale = builtFemale.championship;

  let dataVeteran = builtVeteran.championship;

  let html=`

  <div class="topbar">

    <div class="topbar-title">
    </div>

    <div class="topbar-actions">

      <button onclick="window.print()">
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

function printResults(){

  window.print();
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

function showClubChampionship(){

  let built=buildClubChampionship();

  let competitions=built.competitions;

  let rows=Object.values(built.clubs);

  rows.sort((a,b)=>b.total-a.total);

  let html=`

  <h2>
  Classement Clubs UFOLEP
  </h2>

  <div class="topbar">

    <div class="topbar-title">
          </div>

    <div class="topbar-actions">

      <button onclick="window.print()">
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

      <td>${r.club}</td>
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
        ${rank}
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

  app.innerHTML=html;
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

  let file=event.target.files[0];

  if(!file){
    return;
  }

  let reader=new FileReader();

  reader.onload=function(e){

    try{

      let data=JSON.parse(e.target.result);

      if(
        !data.pilots
        ||
        !data.competitions
      ){
        throw new Error();
      }

      if(!confirm(
        "Charger cette sauvegarde remplacera toutes les données actuelles. Continuer ?"
      )){
        return;
      }

      state.pilots=data.pilots || [];

      state.clubs=data.clubs || [...defaultClubs];

      state.competitions=data.competitions || [];

      state.sortPilotsMode=
        data.sortPilotsMode || "name";

      state.sortParticipantsMode=
        data.sortParticipantsMode || "name";

      state.sortEntryMode=
        data.sortEntryMode || "name";

      save();

      alert("Sauvegarde chargée avec succès");

      home();

    }catch(err){

      alert("Erreur lors du chargement du fichier");
    }
  };

  reader.readAsText(file);

  event.target.value="";
}

function exportParticipantsExcel(i){

  app.innerHTML = `

    <h2>Export Excel</h2>

    <div class="card">

      Choisir le tri :

      <br><br>

      <button onclick="doExportParticipantsExcel(${i}, 'CAT')">
        Par catégorie
      </button>

      <button onclick="doExportParticipantsExcel(${i}, 'ALPHA')">
        Ordre alphabétique
      </button>

    </div>

    <button onclick="openCompetition(${i})">
      Retour
    </button>
  `;
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