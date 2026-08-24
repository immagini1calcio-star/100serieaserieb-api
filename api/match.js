import competitions from "../lib/competitions.js";
import { getMatchSummary } from "../lib/espn.js";

const TIMEZONE = "Europe/Rome";

/* =========================================================
   UTILITY
========================================================= */

function findFirstKey(obj, key) {
  if (!obj || typeof obj !== "object") return null;

  if (Object.prototype.hasOwnProperty.call(obj, key)) {
    return obj[key];
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const result = findFirstKey(value, key);

      if (result !== null) {
        return result;
      }
    }
  }

  return null;
}

function findFirstArray(obj, keys) {
  if (!obj || typeof obj !== "object") return [];

  for (const key of keys) {
    if (Array.isArray(obj[key])) {
      return obj[key];
    }
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const result = findFirstArray(value, keys);

      if (result.length > 0) {
        return result;
      }
    }
  }

  return [];
}


/* =========================================================
   DATA / ORA ITALIANA
========================================================= */

function formatItalianDate(date) {
  if (!date) {
    return {
      date: null,
      time: null,
      dateTime: null
    };
  }

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
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


/* =========================================================
   HEADER
========================================================= */

function getHeader(summary) {
  return summary?.header || {};
}


/* =========================================================
   DATA PARTITA
========================================================= */

function getMatchDate(summary, header) {
  return (
    header.date ||
    header.originalDate ||
    header.startDate ||
    summary.date ||
    summary.originalDate ||
    findFirstKey(summary, "date") ||
    findFirstKey(summary, "startDate") ||
    null
  );
}


/* =========================================================
   SQUADRE
========================================================= */

function getTeams(header) {
  const competitors =
    header?.competitions?.[0]?.competitors || [];

  const home = competitors.find(
    team => team.homeAway === "home"
  );

  const away = competitors.find(
    team => team.homeAway === "away"
  );

  function formatTeam(team) {
    if (!team) return null;

    const data = team.team || team;

    return {
      id:
        data.id ||
        team.id ||
        null,

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

  return {
    home: formatTeam(home),
    away: formatTeam(away)
  };
}


/* =========================================================
   STATO
========================================================= */

function getStatus(header, summary) {
  const status =
    header?.competitions?.[0]?.status ||
    findFirstKey(summary, "status");

  if (!status) return null;

  return {
    state:
      status.type?.state ||
      status.state ||
      null,

    name:
      status.type?.name ||
      status.name ||
      null,

    description:
      status.type?.description ||
      status.description ||
      null,

    detail:
      status.type?.detail ||
      status.detail ||
      null,

    clock:
      status.displayClock ||
      status.clock?.displayValue ||
      status.clock ||
      null,

    period:
      status.period ?? null,

    completed:
      status.type?.completed ??
      status.completed ??
      false
  };
}


/* =========================================================
   STADIO
========================================================= */

function getVenue(summary, header) {
  const venue =
    header?.competitions?.[0]?.venue ||
    header?.venue ||
    findFirstKey(summary, "venue");

  if (!venue) return null;

  return {
    name:
      venue.fullName ||
      venue.name ||
      null,

    city:
      venue.address?.city ||
      venue.city ||
      null,

    country:
      venue.address?.country ||
      venue.country ||
      null
  };
}


/* =========================================================
   PLAY-BY-PLAY ESPN
========================================================= */

function getPlays(summary) {
  const plays = findFirstArray(summary, [
    "plays",
    "playByPlay",
    "commentary"
  ]);

  return Array.isArray(plays) ? plays : [];
}


/* =========================================================
   ATLETA
========================================================= */

function getAthlete(play) {
  const athlete =
    play.athletesInvolved?.[0] ||
    play.athlete ||
    play.player ||
    null;

  if (!athlete) return null;

  const data = athlete.athlete || athlete;

  return {
    id:
      data.id ||
      null,

    name:
      data.displayName ||
      data.fullName ||
      data.name ||
      null
  };
}


/* =========================================================
   SQUADRA EVENTO
========================================================= */

function getEventTeam(play) {
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


/* =========================================================
   MINUTO
========================================================= */

function getMinute(play) {
  return (
    play.clock?.displayValue ||
    play.clock?.value ||
    play.displayClock ||
    play.minute ||
    null
  );
}


/* =========================================================
   TESTO EVENTO
========================================================= */

function getText(play) {
  return (
    play.text ||
    play.description ||
    play.shortText ||
    ""
  );
}


/* =========================================================
   TIPO EVENTO
========================================================= */

function detectEventType(play) {
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

  if (
    text.includes("corner")
  ) {
    return "corner";
  }

  if (
    text.includes("offside")
  ) {
    return "offside";
  }

  if (
    text.includes("foul")
  ) {
    return "foul";
  }

  return "other";
}


/* =========================================================
   EVENTI
========================================================= */

function formatEvents(plays) {
  return plays
    .map(play => {
      const type = detectEventType(play);

      return {
        type,

        minute:
          getMinute(play),

        player:
          getAthlete(play),

        team:
          getEventTeam(play),

        text:
          getText(play)
      };
    })
    .filter(event => event.type !== "other");
}


/* =========================================================
   MARCATORI
========================================================= */

function getScorers(plays) {
  return plays
    .filter(play => {
      return detectEventType(play) === "goal";
    })
    .map(play => ({
      player:
        getAthlete(play),

      team:
        getEventTeam(play),

      minute:
        getMinute(play),

      text:
        getText(play)
    }));
}


/* =========================================================
   CARTELLINI
========================================================= */

function getCards(plays) {
  return plays
    .filter(play => {
      const type = detectEventType(play);

      return (
        type === "yellow-card" ||
        type === "red-card"
      );
    })
    .map(play => ({
      type:
        detectEventType(play),

      player:
        getAthlete(play),

      team:
        getEventTeam(play),

      minute:
        getMinute(play),

      text:
        getText(play)
    }));
}


/* =========================================================
   SOSTITUZIONI
========================================================= */

function getSubstitutions(plays) {
  return plays
    .filter(play => {
      return (
        detectEventType(play) ===
        "substitution"
      );
    })
    .map(play => ({
      minute:
        getMinute(play),

      team:
        getEventTeam(play),

      players:
        (play.athletesInvolved || [])
          .map(player => ({
            id:
              player.id ||
              null,

            name:
              player.displayName ||
              player.fullName ||
              player.name ||
              null
          })),

      text:
        get
