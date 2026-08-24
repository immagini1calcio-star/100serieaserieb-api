import competitions from "../lib/competitions.js";
import { getMatchSummary } from "../lib/espn.js";

function formatItalianDate(date) {
  if (!date) {
    return {
      date: null,
      time: null,
      dateTime: null
    };
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return {
      date: null,
      time: null,
      dateTime: null
    };
  }

  const options = {
    timeZone: "Europe/Rome"
  };

  const datePart = new Intl.DateTimeFormat("it-IT", {
    ...options,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(parsed);

  const timePart = new Intl.DateTimeFormat("it-IT", {
    ...options,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(parsed);

  return {
    date: datePart,
    time: timePart,
    dateTime: `${datePart}, ${timePart}`
  };
}


function getTeamFromCompetitor(competitor) {
  if (!competitor) {
    return null;
  }

  return {
    id: competitor.id || competitor.team?.id || null,
    name:
      competitor.team?.displayName ||
      competitor.team?.name ||
      null,
    shortName:
      competitor.team?.shortDisplayName ||
      competitor.team?.shortName ||
      null,
    abbreviation:
      competitor.team?.abbreviation ||
      null,
    logo:
      competitor.team?.logo ||
      null,
    score:
      competitor.score ?? null,
    homeAway:
      competitor.homeAway || null
  };
}


function formatCompetitors(header) {
  const competitors =
    header?.competitions?.[0]?.competitors || [];

  return competitors.map(getTeamFromCompetitor);
}


function formatStatus(header) {
  const status =
    header?.competitions?.[0]?.status;

  if (!status) {
    return null;
  }

  return {
    state: status.type?.state || null,
    name: status.type?.name || null,
    description:
      status.type?.description || null,
    detail: status.type?.detail || null,
    completed:
      status.type?.completed ?? null,
    clock:
      status.displayClock || null,
    period:
      status.period ?? null
  };
}


function formatVenue(header) {
  const venue =
    header?.competitions?.[0]?.venue;

  if (!venue) {
    return null;
  }

  return {
    name:
      venue.fullName ||
      venue.address?.city ||
      null,

    city:
      venue.address?.city ||
      null,

    country:
      venue.address?.country ||
      null
  };
}


/*
 * Estrae gli eventi disponibili
 * nel report ESPN.
 */
function extractEvents(summary) {
  const plays =
    summary?.plays ||
    summary?.gamepackage?.plays ||
    summary?.commentary ||
    [];

  if (!Array.isArray(plays)) {
    return [];
  }

  return plays.map((play) => {
    return {
      id: play.id || null,

      type:
        play.type?.text ||
        play.type?.name ||
        play.text ||
        null,

      text:
        play.text ||
        null,

      clock:
        play.clock?.displayValue ||
        play.clock?.value ||
        play.displayClock ||
        null,

      period:
        play.period?.number ||
        play.period ||
        null,

      scoring:
        play.scoringPlay ??
        false,

      team: play.team
        ? {
            id: play.team.id || null,
            name:
              play.team.displayName ||
              play.team.name ||
              null,
            abbreviation:
              play.team.abbreviation ||
              null
          }
        : null
    };
  });
}


/*
 * Estrae i marcatori dagli eventi
 * quando ESPN fornisce i dati del giocatore.
 */
function extractScorers(summary) {
  const plays =
    summary?.plays ||
    summary?.gamepackage?.plays ||
    [];

  if (!Array.isArray(plays)) {
    return [];
  }

  return plays
    .filter((play) => play.scoringPlay === true)
    .map((play) => {
      const athlete =
        play.athletesInvolved?.[0] ||
        play.athlete ||
        null;

      return {
        player: athlete
          ? {
              id: athlete.id || null,
              name:
                athlete.displayName ||
                athlete.fullName ||
                athlete.name ||
                null
            }
          : null,

        team: play.team
          ? {
              id: play.team.id || null,
              name:
                play.team.displayName ||
                play.team.name ||
                null
            }
          : null,

        minute:
          play.clock?.displayValue ||
          play.displayClock ||
          null,

        text:
          play.text ||
          null
      };
    });
}


/*
 * Prova a recuperare le formazioni
 * dai dati disponibili nel summary.
 */
function extractLineups(summary) {
  const rosters =
    summary?.rosters ||
    summary?.lineups ||
    [];

  if (!Array.isArray(rosters)) {
    return [];
  }

  return rosters.map((roster) => {
    return {
      team: roster.team
        ? {
            id: roster.team.id || null,
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
          ? roster.roster.map((player) => ({
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
    };
  });
}


export default async function handler(req, res) {
  try {
    const competitionId =
      req.query.competition;

    const eventId =
      req.query.id;

    /*
     * Controllo ID partita.
     */
    if (!eventId) {
      return res.status(400).json({
        success: false,
        error:
          "Parametro 'id' obbligatorio",
        example:
          "/api/match?competition=serie-a&id=401874927"
      });
    }

    /*
     * Controllo competizione.
     */
    if (!competitionId) {
      return res.status(400).json({
        success: false,
        error:
          "Parametro 'competition' obbligatorio",
        example:
          "/api/match?competition=serie-a&id=401874927"
      });
    }

    const competition =
      competitions[competitionId];

    if (!competition) {
      return res.status(404).json({
        success: false,
        error:
          "Competizione non trovata",
        available:
          Object.keys(competitions)
      });
    }

    /*
     * Recupera il report completo
     * della partita da ESPN.
     */
    const summary =
      await getMatchSummary(
        competition.league,
        eventId
      );

    const header =
      summary?.header || {};

    const eventDate =
      header.date ||
      summary.date ||
      null;

    const italian =
      formatItalianDate(eventDate);

    const competitors =
      formatCompetitors(header);

    const status =
      formatStatus(header);

    const venue =
      formatVenue(header);

    const events =
      extractEvents(summary);

    const scorers =
      extractScorers(summary);

    const lineups =
      extractLineups(summary);

    /*
     * Risposta della nostra API.
     */
    return res.status(200).json({
      success: true,

      api: "100%SerieA&SerieB",

      timezone: "Europe/Rome",

      match: {
        id: eventId,

        competition: {
          id: competitionId,
          name: competition.name,
          country: competition.country,
          flag: competition.flag
        },

        date: eventDate,

        italy: {
          date: italian.date,
          time: italian.time,
          dateTime: italian.dateTime,
          timezone: "Europe/Rome"
        },

        teams: competitors,

        status,

        venue,

        scorers,

        events,

        lineups,

        /*
         * Dati ESPN completi.
         * Lo lasciamo disponibile perché
         * alcune informazioni possono variare
         * a seconda della competizione.
         */
        raw: summary
      }
    });

  } catch (error) {
    console.error(
      "MATCH DETAIL ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      api: "100%SerieA&SerieB",
      error:
        "Errore durante il recupero del dettaglio della partita",
      message: error.message
    });
  }
      }
