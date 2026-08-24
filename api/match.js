import competitions from "../lib/competitions.js";
import { getMatchSummary } from "../lib/espn.js";

function italianDateTime(date) {
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
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(d);

  const timePart = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
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


/* -----------------------------
   SQUADRE
----------------------------- */

function getTeams(header) {
  const competitors =
    header?.competitions?.[0]?.competitors || [];

  const home = competitors.find(
    x => x.homeAway === "home"
  );

  const away = competitors.find(
    x => x.homeAway === "away"
  );

  function formatTeam(team) {
    if (!team) return null;

    return {
      id: team.id || team.team?.id || null,
      name:
        team.team?.displayName ||
        team.team?.name ||
        null,
      shortName:
        team.team?.shortDisplayName ||
        team.team?.shortName ||
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

  return {
    home: formatTeam(home),
    away: formatTeam(away)
  };
}


/* -----------------------------
   STATO PARTITA
----------------------------- */

function getStatus(header) {
  const status =
    header?.competitions?.[0]?.status;

  if (!status) return null;

  return {
    state:
      status.type?.state || null,

    name:
      status.type?.name || null,

    description:
      status.type?.description || null,

    detail:
      status.type?.detail || null,

    clock:
      status.displayClock || null,

    period:
      status.period ?? null,

    completed:
      status.type?.completed ?? false
  };
}


/* -----------------------------
   STADIO
----------------------------- */

function getVenue(header) {
  const venue =
    header?.competitions?.[0]?.venue;

  if (!venue) return null;

  return {
    name:
      venue.fullName || null,

    city:
      venue.address?.city || null,

    country:
      venue.address?.country || null
  };
}


/* -----------------------------
   EVENTI ESPN
----------------------------- */

function getPlays(summary) {
  const plays =
    summary?.plays ||
    summary?.gamepackage?.plays ||
    [];

  return Array.isArray(plays) ? plays : [];
}


/* -----------------------------
   FORMATTA EVENTO
----------------------------- */

function formatEvent(play) {
  const text = play.text || "";

  return {
    id: play.id || null,

    minute:
      play.clock?.displayValue ||
      play.displayClock ||
      null,

    period:
      play.period?.number ||
      play.period ||
      null,

    text,

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
}


/* -----------------------------
   MARCATORI
----------------------------- */

function getScorers(plays) {
  return plays
    .filter(play => {
      const text = (play.text || "").toLowerCase();

      return (
        play.scoringPlay === true ||
        text.includes("goal") ||
        text.includes("scores")
      );
    })
    .map(play => {
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
          play.text || null
      };
    });
}


/* -----------------------------
   CARTELLINI
----------------------------- */

function getCards(plays) {
  return plays
    .filter(play => {
      const text =
        (play.text || "").toLowerCase();

      return (
        text.includes("yellow card") ||
        text.includes("red card") ||
        text.includes("second yellow")
      );
    })
    .map(play => {
      const text =
        (play.text || "").toLowerCase();

      let type = "unknown";

      if (text.includes("second yellow")) {
        type = "second-yellow";
      } else if (text.includes("red card")) {
        type = "red";
      } else if (text.includes("yellow card")) {
        type = "yellow";
      }

      const athlete =
        play.athletesInvolved?.[0] ||
        play.athlete ||
        null;

      return {
        type,

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
          play.text || null
      };
    });
}


/* -----------------------------
   SOSTITUZIONI
----------------------------- */

function getSubstitutions(plays) {
  return plays
    .filter(play => {
      const text =
        (play.text || "").toLowerCase();

      return (
        text.includes("substitution") ||
        text.includes("substitutes") ||
        text.includes("substituted") ||
        text.includes("replaces")
      );
    })
    .map(play => {
      const athletes =
        play.athletesInvolved || [];

      return {
        minute:
          play.clock?.displayValue ||
          play.displayClock ||
          null,

        team: play.team
          ? {
              id: play.team.id || null,
              name:
                play.team.displayName ||
                play.team.name ||
                null
            }
          : null,

        players: athletes.map(player => ({
          id: player.id || null,
          name:
            player.displayName ||
            player.fullName ||
            player.name ||
            null
        })),

        text:
          play.text || null
      };
    });
}


/* -----------------------------
   EVENTI IMPORTANTI
----------------------------- */

function getImportantEvents(plays) {
  return plays
    .filter(play => {
      const text =
        (play.text || "").toLowerCase();

      return (
        play.scoringPlay === true ||
        text.includes("yellow card") ||
        text.includes("red card") ||
        text.includes("second yellow") ||
        text.includes("substitution") ||
        text.includes("penalty") ||
        text.includes("penalty kick")
      );
    })
    .map(formatEvent);
}


/* -----------------------------
   FORMAZIONI
----------------------------- */

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
          id: roster.team.id || null,
          name:
            roster.team.displayName ||
            roster.team.name ||
            null
        }
      : null,

    formation:
      roster.formation || null,

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


/* -----------------------------
   ENDPOINT
----------------------------- */

export default async function handler(req, res) {
  try {
    const competitionId =
      req.query.competition;

    const eventId =
      req.query.id;

    if (!competitionId) {
      return res.status(400).json({
        success: false,
        error:
          "Parametro 'competition' obbligatorio",
        example:
          "/api/match?competition=serie-a&id=401874927"
      });
    }

    if (!eventId) {
      return res.status(400).json({
        success: false,
        error:
          "Parametro 'id' obbligatorio",
        example:
          "/api/match?competition=serie-a&id=401874927"
      });
    }

    const competition =
      competitions[competitionId];

    if (!competition) {
      return res.status(404).json({
        success: false,
        error: "Competizione non trovata",
        available:
          Object.keys(competitions)
      });
    }

    const summary =
      await getMatchSummary(
        competition.league,
        eventId
      );

    const header =
      summary?.header || {};

    const matchDate =
      header.date ||
      summary.date ||
      null;

    const italy =
      italianDateTime(matchDate);

    const teams =
      getTeams(header);

    const status =
      getStatus(header);

    const venue =
      getVenue(header);

    const plays =
      getPlays(summary);

    const scorers =
      getScorers(plays);

    const cards =
      getCards(plays);

    const substitutions =
      getSubstitutions(plays);

    const events =
      getImportantEvents(plays);

    const lineups =
      getLineups(summary);

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

        italy,

        home: teams.home,

        away: teams.away,

        status,

        venue,

        scorers,

        cards,

        substitutions,

        events,

        lineups
      }
    });

  } catch (error) {
    console.error(
      "MATCH ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      api: "100%SerieA&SerieB",
      error:
        "Errore durante il recupero della partita",
      message: error.message
    });
  }
}
