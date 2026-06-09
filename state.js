const state = {

  pilots:JSON.parse(localStorage.getItem("pilots"))||[],
  clubs: JSON.parse(localStorage.getItem("clubs")) || [],
  competitions:JSON.parse(localStorage.getItem("competitions"))||[],
  sortPilotsMode:localStorage.getItem("sortPilotsMode") || "name",
  sortParticipantsMode:localStorage.getItem("sortParticipantsMode") || "name",
  sortEntryMode:localStorage.getItem("sortEntryMode") || "name",

  sortPilotsColumn:"name",
  sortPilotsDirection:"asc",

  selectedPilotId:null,

  ui: {
    currentScreen: "home",
    selectedCompetition: null,
    selectedPilot: null,
    openCompetition: null
  }
};