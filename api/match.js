import competitions from "../lib/competitions.js";
import { getMatchSummary } from "../lib/espn.js";

const TIMEZONE = "Europe/Rome";

/* ================================
   DATA E ORA ITALIANA
================================ */

function formatItalianDate(date) {
  if (!date) {
    return {
      date: null,
      time: null,
      dateTime: null
    };
  }

  const d = new Date(date);

  if (isNaN(d.getTime())) {
    return {
      date: null,
      time: null,
      dateTime: null
    };
  }

  const datePart = new Intl.DateTimeFormat("it-IT", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(d);

  const timePart = new Intl.DateTimeFormat("it-IT", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(d);

  return {
    date: datePart,
    time: timePart,
    dateTime: `${datePart}, ${timePart}`
  };
}


/* ================================
   SQUADRA
================================ */

function formatTeam(team) {
  if (!team) return null;

  const data = team.team || team;

  return {
    id: data.id || team.id || null,

    name:
      data.displayName ||
      data.name ||
      null,

    shortName:
      data.shortDisplayName ||
      data.shortName ||
      null,

    abbreviation:
      data.abbreviation ||
      null,

    logo:
      data.logo ||
      null,

    score:
      team.score ?? null
  };
}


/* ================================
   STATO PARTITA
================================ */

function formatStatus(status) {
  if (!status) return null;

  const type = status.type || {};

  return {
    state:
      type.state ||
      status.state ||
      null,

    name:
      type.name ||
      status.name ||
      null,

    description:
      type.description ||
      status.description ||
      null,

    detail:
      type.detail ||
      status.detail ||
      null,

    clock:
      status.displayClock ||
      status.clock ||
      null,

    period:
      status.period ?? null,

    completed:
      type.completed ??
      status.completed ??
      false
  };
}


/* ================================
   EVENTO / PLAY
================================ */

function getPlayer(play) {
  const athlete =
    play.athletesInvolved?.[0] ||
    play.athlete ||
    play.player ||
    null;

  if (!athlete) return null;

  const player = athlete.athlete || athlete;

  return {
    id: player.id || null,

    name:
      player.displayName ||
      player.fullName ||
      player.name ||
      null
  };
}


function getTeam(play) {
  if (!play.team) return null;

  return {
    id:
      play.team.id ||
      null,

    name:
      play.team.displayName ||
      play.team.name ||
      null,

    abbreviation:
      play.team.abbreviation ||
      null
  };
}


function getMinute(play) {
  return (
    play.clock?.displayValue ||
    play.displayClock ||
    play.minute ||
    null
  );
}


function getText(play) {
  return (
    play.text ||
    play.description ||
    play.shortText ||
    ""
  );
}


/* ================================
   TIPO EVENTO
================================ */

function getEventType(play) {
  const text = getText(play).toLowerCase();

  if (
    play.scoringPlay === true ||
    text.includes("goal") ||
    text.includes("scores") ||
    text.includes("gol")
  ) {
    return "goal";
  }

  if (
    text.includes("red card") ||
    text.includes("sent off") ||
    text.includes("second yellow") ||
    text.includes("espuls")
  ) {
    return "red-card";
  }

  if (
    text.includes("yellow card") ||
    text.includes("shown the yellow") ||
    text.includes("yellow")
  ) {
    return "yellow-card";
  }

  if (
    text.includes("substitution") ||
    text.includes("substituted") ||
    text.includes("replaces") ||
    text.includes("comes on")
  ) {
    return "substitution";
  }

  if (
    text.includes("penalty") ||
    text.includes("penalty kick")
  ) {
    return "penalty";
  }

  return "other";
}


/* ================================
   EVENTI
================================ */

function formatEvents(plays) {
  if (!Array.isArray(plays)) return [];

  return plays
    .map(play => ({
      type: getEventType(play),

      minute: getMinute(play),

      player: getPlayer(play),

      team: getTeam(play),

      text: getText(play)
    }))
    .filter(event => event.type !== "other");
}


/* ================================
   MARCATORI
================================ */

function getScorers(plays) {
  if (!Array.isArray(plays)) return [];

  return plays
    .filter(play => getEventType(play) === "goal")
    .map(play => ({
      minute: getMinute(play),

      player: getPlayer(play),

      team: getTeam(play),

      text: getText(play)
    }));
}


/* ================================
   CARTELLINI
================================ */

function getCards(plays) {
  if (!Array.isArray(plays)) return [];

  return plays
    .filter(play => {
      const type = getEventType(play);

      return (
        type === "yellow-card" ||
        type === "red-card"
      );
    })
    .map(play => ({
      type: getEventType(play),

      minute: getMinute(play),

      player: getPlayer(play),

      team: getTeam(play),

      text: getText(play)
    }));
}


/* ================================
   SOSTITUZIONI
================================ */

function getSubstitutions(plays) {
  if (!Array.isArray(plays)) return [];

  return plays
    .filter(
      play =>
        getEventType(play) ===
        "substitution"
    )
    .map(play => ({
      minute: getMinute(play),

      team: getTeam(play),

      players:
        Array.isArray(play.athletesInvolved)
          ? play.athletesInvolved.map(player => ({
              id: player.id || null,

              name:
                player.displayName ||
                player.fullName ||
                player.name ||
                null
            }))
          : [],

      text: getText(play)
    }));
}


/* ================================
   RIGORI
================================ */

function getPenalties(plays) {
  if (!Array.isArray(plays)) return [];

  return plays
    .filter(
      play =>
        getEventType(play) ===
        "penalty"
    )
    .map(play => ({
      minute: getMinute(play),

      player: getPlayer(play),

      team: getTeam(play),

      text: getText(play)
    }));
}


/* ================================
   FORMAZIONI
================================ */

function getLineups(summary) {
  const rosters =
    summary?.rosters ||
    summary?.lineups ||
    [];

  if (!Array.isArray(rosters)) {
    return [];
  }

  return rosters.map(roster => ({
    team: roster.team
      ? {
          id:
            roster.team.id ||
            null,

          name:
            roster.team.displayName ||
            roster.team.name ||
            null
        }
      : null,

    formation:
      roster.formation ||
      null,

    players:
      Array.isArray(roster.roster)
        ? roster.roster.map(player => ({
            id:
              player.athlete?.id ||
              player.id ||
              null,

            name:
              player.athlete?.displayName ||
              player.athlete?.fullName ||
              player.name ||
              null,

            position:
              player.position?.abbreviation ||
              player.position?.name ||
              null,

            starter:
              player.starter ??
              player.isStarter ??
              false
          }))
        : []
  }));
}


/* ================================
   ENDPOINT
================================ */

export default async function handler(req, res) {

  try {

    const competitionId =
      req.query.competition;

    const eventId =
      req.query.id;


    /* ================================
       CONTROLLO PARAMETRI
    ================================= */

    if (!competitionId) {
      return res.status(400).json({
        success: false,

        error:
          "Parametro competition obbligatorio",

        example:
          "/api
