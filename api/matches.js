import competitions from "../lib/competitions.js";
import { getScoreboard } from "../lib/espn.js";

function formatMatch(event, competition) {
  const match = event.competitions?.[0];

  if (!match) {
    return null;
  }

  const home = match.competitors?.find(
    (team) => team.homeAway === "home"
  );

  const away = match.competitors?.find(
    (team) => team.homeAway === "away"
  );

  const status = match.status || event.status;

  return {
    id: event.id,

    competition: {
      id: competition,
      name: competitions[competition].name,
      country: competitions[competition].country,
      flag: competitions[competition].flag
    },

    date: event.date,

    home: {
      id: home?.team?.id || null,
      name: home?.team?.displayName || null,
      shortName: home?.team?.shortDisplayName || null,
      abbreviation: home?.team?.abbreviation || null,
      logo: home?.team?.logo || null,
      score: home?.score ?? null
    },

    away: {
      id: away?.team?.id || null,
      name: away?.team?.displayName || null,
      shortName: away?.team?.shortDisplayName || null,
      abbreviation: away?.team?.abbreviation || null,
      logo: away?.team?.logo || null,
      score: away?.score ?? null
    },

    status: {
      state: status?.type?.state || null,
      name: status?.type?.name || null,
      description: status?.type?.description || null,
      detail: status?.type?.detail || null,
      clock: status?.displayClock || null,
      period: status?.period || null
    },

    venue: match.venue
      ? {
          name: match.venue.fullName || null,
          city: match.venue.address?.city || null,
          country: match.venue.address?.country || null
        }
      : null,

    link: event.links?.[0]?.href || null
  };
}

function convertDate(date) {
  if (!date) return null;

  // Accetta YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date.replaceAll("-", "");
  }

  // Accetta anche YYYYMMDD
  if (/^\d{8}$/.test(date)) {
    return date;
  }

  return null;
}

export default async function handler(req, res) {
  try {
    const competitionId = req.query.competition;

    if (!competitionId) {
      return res.status(400).json({
        success: false,
        error: "Parametro 'competition' obbligatorio",
        example: "/api/matches?competition=serie-a"
      });
    }

    const competition = competitions[competitionId];

    if (!competition) {
      return res.status(404).json({
        success: false,
        error: "Competizione non trovata",
        available: Object.keys(competitions)
      });
    }

    // Le amichevoli saranno gestite con un sistema dedicato.
    if (!competition.league) {
      return res.status(400).json({
        success: false,
        error:
          "Questa competizione richiede una gestione speciale e non è ancora disponibile in /api/matches",
        competition: competition.name
      });
    }

    const requestedDate = req.query.date || null;
    const date = convertDate(requestedDate);

    if (requestedDate && !date) {
      return res.status(400).json({
        success: false,
        error: "Formato data non valido",
        expected: "YYYY-MM-DD",
        example:
          `/api/matches?competition=${competitionId}&date=2026-08-25`
      });
    }

    const data = await getScoreboard(
      competition.league,
      date
    );

    const matches = (data.events || [])
      .map((event) => formatMatch(event, competitionId))
      .filter(Boolean);

    return res.status(200).json({
      success: true,

      competition: {
        id: competitionId,
        name: competition.name,
        country: competition.country,
        flag: competition.flag
      },

      date: requestedDate || "automatic",

      count: matches.length,

      matches
    });
  } catch (error) {
    console.error("MATCHES ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Errore durante il recupero delle partite",
      message: error.message
    });
  }
        }
