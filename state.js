const state = {

  pilots:JSON.parse(localStorage.getItem("pilots"))||[],
  clubs: JSON.parse(localStorage.getItem("clubs")) || [],
  customCategories: JSON.parse(localStorage.getItem("customCategories")) || [],
  lastParticipantFees: JSON.parse(localStorage.getItem("lastParticipantFees")) || { ufolep: 10, ffc: 18, nl: 18 },
  competitions:JSON.parse(localStorage.getItem("competitions"))||[],
  sortPilotsMode:localStorage.getItem("sortPilotsMode") || "name",
  sortParticipantsMode:localStorage.getItem("sortParticipantsMode") || "name",
  sortEntryMode:localStorage.getItem("sortEntryMode") || "name",

  sortPilotsColumn:"name",
  sortPilotsDirection:"asc",

  sortParticipantsColumn:"name",
  sortParticipantsDirection:"asc",

  selectedPilotId:null,

  ui: {
    currentScreen: "home",
    selectedCompetition: null,
    selectedPilot: null,
    openCompetition: null
  }
};