import competitions from "../lib/competitions.js";

const TIMEZONE = "Europe/Rome";

function italianDate(date) {
  if (!date) return null;

  const d = new Date(date);

  return {
    date: new Intl.DateTimeFormat("it-IT", {
      timeZone: TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(d),

    time: new Intl.DateTimeFormat("it-IT", {
      timeZone: TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(d)
  };
}

async function getESPN(league) {
  const url =
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`ESPN HTTP ${response.status}`);
  }

  return await response.json();
}

function getTeam(team) {
  if (!team) return null;

  return {
    id: team.team?.id || null,

    name:
      team.team?.displayName ||
      team.team?.name ||
      null,

    shortName:
      team.team?.shortDisplayName ||
      null,

    abbreviation:
      team.team?.abbreviation ||
      null,

    logo:
      team.team?.logo ||
      null,

    score:
      team.score ?? null
  };
}

function getMatch(event, competition) {
  const game = event.competitions?.[0];

  const teams = game?.competitors || [];

  const home = teams.find(
    team => team.homeAway === "home"
  );

  const away = teams.find(
    team => team.homeAway === "away"
  );

  const status = game?.status;

  const statusType = status?.type;

  const date = italianDate(event.date);

  return {
    id: event.id,

    competition: {
      id: competition.id,
      name: competition.name,
      country: competition.country,
      flag: competition.flag
    },

    date: date?.date || null,

    time: date?.time || null,

    timezone: TIMEZONE,

    home: getTeam(home),

    away: getTeam(away),

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

      period:
        status?.period ?? null,

      completed:
        statusType?.completed ?? false
    }
  };
}

export default async function handler(req, res) {
  try {
    const requestedCompetition =
      req.query.competition;

    /*
     * Se viene richiesta una competizione
     * specifica, la cerchiamo nel nostro elenco.
     */

    if (requestedCompetition) {
      const competition =
        competitions[requestedCompetition];

      if (!competition) {
        return res.status(404).json({
          success: false,
          error: "Competizione non trovata",

          available:
            Object.keys(competitions)
        });
      }

      /*
       * Le amichevoli italiane verranno
       * gestite separatamente.
       *
       * Non esiste un singolo codice ESPN
       * per tutte le amichevoli italiane.
       */

      if (
        competition.type ===
        "friendly-italian-teams"
      ) {
        return res.status(200).json({
          success: true,

          competition: {
            id: requestedCompetition,
            name: competition.name,
            country: competition.country,
            flag: competition.flag
          },

          source: "ESPN",

          timezone: TIMEZONE,

          count: 0,

          matches: []
        });
      }

      /*
       * ESPN è la fonte dei dati.
       */

      const data =
        await getESPN(
          competition.league
        );

      const events =
        data.events || [];

      const matches =
        events.map(event =>
          getMatch(
            event,
            {
              id: requestedCompetition,
              name: competition.name,
              country: competition.country,
              flag: competition.flag
            }
          )
        );

      return res.status(200).json({
        success: true,

        source: "ESPN",

        timezone: TIMEZONE,

        competition: {
          id: requestedCompetition,
          name: competition.name,
          country: competition.country,
          flag: competition.flag,

          espnLeague:
            competition.league
        },

        count: matches.length,

        matches
      });
    }


    /*
     * Se non viene specificata una competizione,
     * prendiamo le competizioni con un codice ESPN.
     */

    const competitionsToLoad =
      Object.entries(competitions)
        .filter(
          ([, competition]) =>
            competition.league
        );


    /*
     * Interroghiamo ESPN per
