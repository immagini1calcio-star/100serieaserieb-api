import competitions from "../lib/competitions.js";

const TIMEZONE = "Europe/Rome";

function formatItalianDateTime(isoDate) {
  const date = new Date(isoDate);

  const dateFormatter = new Intl.DateTimeFormat("it-IT", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  const timeFormatter = new Intl.DateTimeFormat("it-IT", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  return {
    date: dateFormatter.format(date),
    time: timeFormatter.format(date)
  };
}

function getNextThursday() {
  const now = new Date();

  const day = now.getUTCDay();

  let daysToThursday = 4 - day;

  if (daysToThursday < 0) {
    daysToThursday += 7;
  }

  const thursday = new Date(now);

  thursday.setUTCDate(
    thursday.getUTCDate() + daysToThursday
  );

  return thursday;
}

function formatESPNDate(date) {
  const year = date.getUTCFullYear();

  const month = String(
    date.getUTCMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getUTCDate()
  ).padStart(2, "0");

  return `${year}${month}${day}`;
}

async function fetchESPN(league, date) {
  const url =
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${date}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `ESPN error: ${response.status}`
    );
  }

  return await response.json();
}

function formatMatch(event) {
  const competition =
    event.competitions?.[0];

  const competitors =
    competition?.competitors || [];

  const home =
    competitors.find(
      team => team.homeAway === "home"
    );

  const away =
    competitors.find(
      team => team.homeAway === "away"
    );

  const status =
    competition?.status;

  const statusType =
    status?.type;

  const italian =
    formatItalianDateTime(
      event.date
    );

  const notStarted =
    statusType?.state === "pre";

  return {
    id: event.id,

    date: italian.date,

    time: italian.time,

    timezone: TIMEZONE,

    home: {
      name:
        home?.team?.displayName || null,

      score:
        notStarted
          ? "-"
          : (home?.score ?? 0),

      logo:
        home?.team?.logo || null
    },

    away: {
      name:
        away?.team?.displayName || null,

      score:
        notStarted
          ? "-"
          : (away?.score ?? 0),

      logo:
        away?.team?.logo || null
    },

    status: {
      state:
        statusType?.state || null,

      name:
        statusType?.name || null,

      description:
        statusType?.description || null,

      detail:
        statusType?.detail || null,

      clock:
        status?.displayClock || null,

      completed:
        statusType?.completed ?? false
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
          "Competizione non trovata"
      });
    }

    if (!competition.league) {
      return res.status(400).json({
        success: false,
        error:
          "Competizione senza codice ESPN"
      });
    }

    const thursday =
      getNextThursday();

    const matches = [];

    for (let i = 0; i < 6; i++) {
      const date = new Date(thursday);

      date.setUTCDate(
        date.getUTCDate() + i
      );

      const espnDate =
        formatESPNDate(date);

      const data =
        await fetchESPN(
          competition.league,
          espnDate
        );

      for (const event of data.events || []) {
        matches.push(
          formatMatch(event)
        );
      }
    }

    matches.sort((a, b) => {
      const aValue =
        `${a.date} ${a.time}`;

      const bValue =
        `${b.date} ${b.time}`;

      return aValue.localeCompare(
        bValue
      );
    });

    return res.status(200).json({
      success: true,

      source: "ESPN",

      timezone: TIMEZONE,

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
        from: "giovedì",
        to: "martedì"
      },

      count:
        matches.length,

      matches
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      source: "ESPN",
      error:
        error.message
    });
  }
}
