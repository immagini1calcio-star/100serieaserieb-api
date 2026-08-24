import competitions from "../lib/competitions.js";
import { getScoreboard } from "../lib/espn.js";

/**
 * Converte la data ESPN nell'orario italiano.
 * Usa Europe/Rome per gestire automaticamente:
 * - Ora solare UTC+1
 * - Ora legale UTC+2
 */
function formatItalianDate(date) {
  if (!date) {
    return {
      date: null,
      time: null,
      dateTime: null
    };
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return {
      date: null,
      time: null,
      dateTime: null
    };
  }

  const dateFormatter = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  const timeFormatter = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const dateTimeFormatter = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  return {
    date: dateFormatter.format(parsedDate),
    time: timeFormatter.format(parsedDate),
    dateTime: dateTimeFormatter.format(parsedDate)
  };
}


/**
 * Trasforma una partita ESPN
 * nel formato della nostra API.
 */
function formatMatch(event, competitionId) {
  const competition = competitions[competitionId];
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

  const italianDate = formatItalianDate(event.date);

  return {
    id: event.id,

    competition: {
      id: competitionId,
      name: competition.name,
      country: competition.country,
      flag: competition.flag
    },

    /**
     * Data originale fornita da ESPN.
     * Utile internamente come riferimento.
     */
    date: event.date,

    /**
     * Data e ora italiane.
     */
    italy: {
      date: italianDate.date,
      time: italianDate.time,
      dateTime: italianDate.dateTime,
      timezone: "Europe/Rome"
    },

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

      /**
       * Clock della partita.
       * Esempio: 25:34
       */
      clock: status?.displayClock || null,

      /**
       * Periodo:
       * 1 = primo tempo
       * 2 = secondo tempo
       */
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


/**
 * Converte una data nel formato richiesto da ESPN.
 */
function convertDate(date) {
  if (!date) {
    return null;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date.replaceAll("-", "");
  }

  // YYYYMMDD
  if (/^\d{8}$/.test(date)) {
    return date;
  }

  return null;
}


/**
 * Endpoint:
 *
 * /api/matches?competition=serie-a
 *
 * /api/matches?competition=serie-a&date=2026-08-25
 */
export default async function handler(req, res) {
  try {
    const competitionId = req.query.competition;

    /**
     * Controllo competizione.
     */
    if (!competitionId) {
      return res.status(400).json({
        success: false,
        error: "Parametro 'competition' obbligatorio",
        example: "/api/matches?competition=serie-a"
      });
    }

    const competition = competitions[competitionId];

    /**
     * Competizione inesistente.
     */
    if (!competition) {
      return res.status(404).json({
        success: false,
        error: "Competizione non trovata",
        available: Object.keys(competitions)
      });
    }

    /**
     * Le amichevoli delle squadre italiane
     * avranno una gestione dedicata.
     */
    if (!competition.league) {
      return res.status(400).json({
        success: false,
        error:
          "Questa competizione richiede una gestione speciale e non è ancora disponibile in /api/matches",
        competition: competition.name
      });
    }

    /**
     * Data opzionale.
     */
    const requestedDate = req.query.date || null;
    const date = convertDate(requestedDate);

    /**
     * Controllo formato data.
     */
    if (requestedDate && !date) {
      return res.status(400).json({
        success: false,
        error: "Formato data non valido",
        expected: "YYYY-MM-DD",
        example:
          `/api/matches?competition=${competitionId}&date=2026-08-25`
      });
    }

    /**
     * Recupera le partite da ESPN.
     */
    const data = await getScoreboard(
      competition.league,
      date
    );

    /**
     * Trasforma le partite nel formato della nostra API.
     */
    const matches = (data.events || [])
      .map((event) =>
        formatMatch(event, competitionId)
      )
      .filter(Boolean);

    /**
     * Risposta finale.
     */
    return res.status(200).json({
      success: true,

      api: "100%SerieA&SerieB",

      timezone: "Europe/Rome",

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
    console.error(
      "MATCHES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      api: "100%SerieA&SerieB",
      error:
        "Errore durante il recupero delle partite",
      message: error.message
    });
  }
        }
