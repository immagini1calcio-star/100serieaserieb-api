import competitions from "../lib/competitions.js";

const TIMEZONE = "Europe/Rome";

function getItalianParts(isoDate) {
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

function getItalianDateForESPN(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find(p => p.type === "year")?.value;
  const month = parts.find(p => p.type === "month")?.value;
  const day = parts.find(p => p.type === "day")?.value;

  return `${year}${month}${day}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function getNextThursday() {
  const now = new Date();

  const italianDay = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      weekday: "numeric"
    }).format(now)
  );

  /*
   * weekday numeric non è affidabile in tutti gli ambienti,
   * quindi calcoliamo il giorno usando la data italiana.
   */

  const italianDateString =
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(now);

  const current = new Date(
    `${italianDateString}T12:00:00Z`
  );

  const day = current.getUTCDay();

  /*
   * 0 = domenica
   * 1 = lunedì
   * 2 = martedì
   * 3 = mercoledì
   * 4 = giovedì
   */

  let daysUntilThursday =
    (4 - day + 7) % 7;

  /*
   * Se oggi è giovedì, includiamo oggi.
   */

  const thursday =
    addDays(current, daysUntilThursday);

  return thursday;
}

async function getESPNDay(league, date) {
  const url =
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${date}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `ESPN HTTP ${response.status}`
    );
  }

  return await response.json();
}

function getTeam(team) {
  if (!team) return null;

  return {
    name:
      team.team?.displayName ||
      team.team?.name ||
      null,

    score:
      team.score ?? null,

    logo:
      team.team?.logo ||
      null
  };
}

function formatMatch(event, competition) {
  const game =
    event.competitions?.[0];

  const teams =
    game?.competitors || [];

  const home =
    teams.find(
      team =>
        team.homeAway === "home"
    );

  const away =
    teams.find(
      team =>
        team.homeAway === "away"
    );

  const status =
    game?.status;

  const statusType =
    status?.type;

  const italian =
    getItalianParts(
      event.date
    );

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

export default async function handler(req, res) {
  try {

    const requestedCompetition =
      req.query.competition;

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

    if (!competition.league) {
      return res.status(400).json({
        success: false,
        error:
          "Questa competizione non ha ancora un codice ESPN"
      });
    }

    /*
     * =====================================
     * PROSSIMA GIORNATA
     *
     * GIOVEDÌ → MARTEDÌ
     * =====================================
     */

    const thursday =
      getNextThursday();

    const matches = [];

    /*
     * 6 giorni:
     *
     * Giovedì
     * Venerdì
     * Sabato
     * Domenica
     * Lunedì
     * Martedì
     */

    for (let i = 0; i < 6; i++) {

      const day =
        addDays(thursday, i);

      const espnDate =
        getItalianDateForESPN(
          day
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
          formatMatch(
            event,
            {
              id:
                requestedCompetition,

              name:
                competition.name,

              country:
                competition.country,

              flag:
                competition.flag
            }
          )
        );
      }
    }

    /*
     * Ordine cronologico.
     */

    matches.sort((a, b) => {

      const dateA =
        `${a.date || ""} ${a.time || ""}`;

      const dateB =
        `${b.date || ""} ${b.time || ""}`;

      return dateA.localeCompare(
        dateB
      );
    });

    return res.status(200).json({

      success: true,

      source: "ESPN",

      timezone:
        TIMEZONE,

      competition: {
        id:
          requestedCompetition,

        name:
          competition.name,

        league:
          competition.league
      },

      period: {
        from: "Thursday",
        to: "Tuesday"
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

      source: "ESPN",

      error:
        error.message ||
        "Errore ESPN"
    });
  }
}
