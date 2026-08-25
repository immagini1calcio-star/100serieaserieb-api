import competitions from "../lib/competitions.js";

const TIMEZONE = "Europe/Rome";

/* =========================================
   DATA E ORA ITALIANA
========================================= */

function getItalianDateTime(isoDate) {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return {
      date: null,
      time: null
    };
  }

  return {
    date: new Intl.DateTimeFormat("it-IT", {
      timeZone: TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date),

    time: new Intl.DateTimeFormat("it-IT", {
      timeZone: TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date)
  };
}


/* =========================================
   OTTIENI LA DATA ITALIANA DI OGGI
   FORMATO: YYYY-MM-DD
========================================= */

function getTodayItaly() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const year =
    parts.find(p => p.type === "year").value;

  const month =
    parts.find(p => p.type === "month").value;

  const day =
    parts.find(p => p.type === "day").value;

  return `${year}-${month}-${day}`;
}


/* =========================================
   DATA YYYY-MM-DD → OGGETTO DATE
========================================= */

function parseItalyDate(dateString) {
  return new Date(
    `${dateString}T12:00:00Z`
  );
}


/* =========================================
   AGGIUNGI GIORNI
========================================= */

function addDays(date, amount) {
  const result = new Date(date);

  result.setUTCDate(
    result.getUTCDate() + amount
  );

  return result;
}


/* =========================================
   PROSSIMO GIOVEDÌ
========================================= */

function getNextThursday() {
  const todayString =
    getTodayItaly();

  const today =
    parseItalyDate(todayString);

  /*
   * JavaScript:
   *
   * 0 = domenica
   * 1 = lunedì
   * 2 = martedì
   * 3 = mercoledì
   * 4 = giovedì
   * 5 = venerdì
   * 6 = sabato
   */

  const currentDay =
    today.getUTCDay();

  let daysUntilThursday =
    (4 - currentDay + 7) % 7;

  return addDays(
    today,
    daysUntilThursday
  );
}


/* =========================================
   CONVERTI DATA IN YYYYMMDD PER ESPN
========================================= */

function getESPNDate(date) {
  const year =
    date.getUTCFullYear();

  const month =
    String(
      date.getUTCMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getUTCDate()
    ).padStart(2, "0");

  return `${year}${month}${day}`;
}


/* =========================================
   CHIAMATA ESPN
========================================= */

async function getESPNDay(
  league,
  date
) {
  const url =
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${date}`;

  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      `ESPN HTTP ${response.status}`
    );
  }

  return await response.json();
}


/* =========================================
   FORMAT PARTITA
========================================= */

function formatMatch(event) {
  const competition =
    event.competitions?.[0];

  const competitors =
    competition?.competitors || [];

  const home =
    competitors.find(
      team =>
        team.homeAway === "home"
    );

  const away =
    competitors.find(
      team =>
        team.homeAway === "away"
    );

  const status =
    competition?.status;

  const statusType =
    status?.type;

  const italian =
    getItalianDateTime(
      event.date
    );

  /*
   * ESPN normalmente usa:
   *
   * state = pre  → non iniziata
   * state = in   → in corso
   * state = post → terminata
   */

  const notStarted =
    statusType?.state === "pre";

  return {
    id:
      event.id,

    date:
      italian.date,

    time:
      italian.time,

    timezone:
      TIMEZONE,

    home: {
      name:
        home?.team?.displayName ||
        null,

      score:
        notStarted
          ? "-"
          : (home?.score ?? 0),

      logo:
        home?.team?.logo ||
        null
    },

    away: {
      name:
        away?.team?.displayName ||
        null,

      score:
        notStarted
          ? "-"
          : (away?.score ?? 0),

      logo:
        away?.team?.logo ||
        null
    },

    status: {
      state:
        statusType?.state ||
        null,

      name:
        statusType?.name ||
        null,

      description:
        statusType?.description ||
        null,

      detail:
        statusType?.detail ||
        null,

      clock:
        status?.displayClock ||
        null,

      completed:
        statusType?.completed ??
        false
    }
  };
}


/* =========================================
   API
========================================= */

export default async function handler(
  req,
  res
) {
  try {

    const requestedCompetition =
      req.query.competition;

    /* -------------------------------------
       CONTROLLO COMPETIZIONE
    ------------------------------------- */

    if (!requestedCompetition) {
      return res.status(400).json({
        success: false,
        error:
          "Inserisci una competizione"
      });
    }

    const competition =
      competitions[
        requestedCompetition
      ];

    if (!competition) {
      return res.status(404).json({
        success: false,
        error:
          "Competizione non trovata",
        available:
          Object.keys(competitions)
      });
    }

    /* -------------------------------------
       CONTROLLO CODICE ESPN
    ------------------------------------- */

    if (!competition.league) {
      return res.status(400).json({
        success: false,
        error:
          "Questa competizione non ha un codice ESPN"
      });
    }

    /* -------------------------------------
       PROSSIMO GIOVEDÌ
    ------------------------------------- */

    const thursday =
      getNextThursday();

    const matches = [];

    /* -------------------------------------
       GIOVEDÌ → MARTEDÌ
    ------------------------------------- */

    for (let i = 0; i < 6; i++) {

      const currentDay =
        addDays(
          thursday,
          i
        );

      const espnDate =
        getESPNDate(
          currentDay
        );

      const data =
        await getESPNDay(
          competition.league,
          espnDate
        );

      const events =
        data.events || [];

      for (const event of events) {

        matches.push(
          formatMatch(event)
        );
      }
    }

    /* -------------------------------------
       ORDINA PARTITE
    ------------------------------------- */

    matches.sort((a, b) => {

      const dateA =
        `${a.date || ""} ${a.time || ""}`;

      const dateB =
        `${b.date || ""} ${b.time || ""}`;

      return dateA.localeCompare(
        dateB
      );
    });

    /* -------------------------------------
       RISPOSTA
    ------------------------------------- */

    return res.status(200).json({

      success: true,

      source:
        "ESPN",

      timezone:
        TIMEZONE,

      league:
        competition.league,

      competition: {
        id:
          requestedCompetition,

        name:
          competition.name,

        country:
          competition.country,

        flag:
          competition.flag
      },

      period: {
        from:
          "giovedì",

        to:
          "martedì"
      },

      count:
        matches.length,

      matches
    });

  } catch (error) {

    console.error(
      "ESPN ERROR:",
      error
    );

    return res.status(500).json({

      success: false,

      source:
        "ESPN",

      error:
        error.message ||
        "Errore ESPN"

    });
  }
}
