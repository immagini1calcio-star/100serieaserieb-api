import competitions from "../lib/competitions.js";
import { italianTeamName } from "../lib/teams.js";

const TIMEZONE = "Europe/Rome";

/* =========================================
   DATA E ORA ITALIANA
========================================= */

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


/* =========================================
   NOME SQUADRA
========================================= */

function formatTeam(team) {
  if (!team) return null;

  const data = team.team || team;

  const originalName =
    data.displayName ||
    data.name ||
    team.displayName ||
    team.name ||
    null;

  return {
    id:
      data.id ||
      team.id ||
      null,

    name:
      italianTeamName(originalName),

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


/* =========================================
   OTTIENI LE PARTITE
========================================= */

async function getEvents(league, date) {
  const url =
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${date}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `ESPN HTTP ${response.status}`
    );
  }

  const data = await response.json();

  return Array.isArray(data.events)
    ? data.events
    : [];
}


/* =========================================
   ENDPOINT
========================================= */

export default async function handler(req, res) {
  try {

    /*
     * Se non viene indicata una competizione,
     * utilizziamo tutte quelle disponibili.
     */
    const requestedCompetition =
      req.query.competition || null;


    /*
     * Data richiesta.
     *
     * Formato:
     * YYYYMMDD
     *
     * Esempio:
     * 20260825
     */
    const requestedDate =
      req.query.date || null;


    /*
     * Data odierna italiana.
     */
    const now = new Date();

    const today =
      new Intl.DateTimeFormat("en-CA", {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(now).replaceAll("-", "");


    const date =
      requestedDate || today;


    /*
     * Competizioni da interrogare.
     */
    let selectedCompetitions = [];

    if (requestedCompetition) {

      const competition =
        competitions[requestedCompetition];

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
       * Le amichevoli italiane non hanno
       * una singola league ESPN.
       */
      if (
        competition.type ===
        "friendly-italian-teams"
      ) {
        return res.status(200).json({
          success: true,

          timezone:
            TIMEZONE,

          date,

          competition:
            requestedCompetition,

          matches: []
        });
      }

      selectedCompetitions = [
        {
          id: requestedCompetition,
          data: competition
        }
      ];

    } else {

      selectedCompetitions =
        Object.entries(competitions)
          .filter(
            ([, competition]) =>
              competition.league
          )
          .map(
            ([id, data]) => ({
              id,
              data
            })
          );
    }


    /*
     * Recuperiamo le partite.
     */
    const results =
      await Promise.allSettled(

        selectedCompetitions.map(
          async ({ id, data }) => {

            const events =
              await getEvents(
                data.league,
                date
              );

            return {
              competitionId: id,
              competition: data,
              events
            };
          }
        )
      );


    /*
     * Costruiamo la risposta finale.
     */
    const matches = [];


    for (const result of results) {

      if (
        result.status !==
        "fulfilled"
      ) {
        continue;
      }

      const {
        competitionId,
        competition,
        events
      } = result.value;


      for (const event of events) {

        const header =
          event.header || {};

        const competitionData =
          header.competitions?.[0] ||
          event.competitions?.[0] ||
          {};

        const competitors =
          competitionData.competitors ||
          [];


        const home =
          competitors.find(
            team =>
              team.homeAway ===
              "home"
          );

        const away =
          competitors.find(
            team =>
              team.homeAway ===
              "away"
          );


        /*
         * Data e ora.
         */
        const eventDate =
          event.date ||
          header.date ||
          null;

        const italy =
          formatItalianDate(
            eventDate
          );


        /*
         * Stato partita.
         */
        const status =
          competitionData.status ||
          header.competitions?.[0]
            ?.status ||
          null;

        const statusType =
          status?.type || {};


        /*
         * Stadio.
         */
        const venue =
          competitionData.venue ||
          null;


        matches.push({

          id:
            event.id ||
            null,


          competition: {

            id:
              competitionId,

            name:
              competition.name,

            country:
              competition.country,

            flag:
              competition.flag

          },


          italy,


          home:
            formatTeam(home),


          away:
            formatTeam(away),


          status: {

            state:
              statusType.state ||
              null,

            name:
              statusType.name ||
              null,

            description:
              statusType.description ||
              null,

            detail:
              statusType.detail ||
              null,

            clock:
              status?.displayClock ||
              null,

            period:
              status?.period ??
              null,

            completed:
              statusType.completed ??
              false

          },


          venue: venue
            ? {
                name:
                  venue.fullName ||
                  venue.name ||
                  null,

                city:
                  venue.address?.city ||
                  null,

                country:
                  venue.address?.country ||
                  null
              }
            : null

        });
      }
    }


    /*
     * Ordina per orario italiano.
     */
    matches.sort(
      (a, b) => {

        const dateA =
          a.italy?.dateTime || "";

        const dateB =
          b.italy?.dateTime || "";

        return dateA.localeCompare(
          dateB
        );
      }
    );


    /*
     * RISPOSTA.
     */
    return res.status(200).json({

      success: true,

      api:
        "100%SerieA&SerieB",

      timezone:
        TIMEZONE,

      date,

      count:
        matches.length,

      matches

    });


  } catch (error) {

    console.error(
      "MATCHES ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      error:
        "Errore durante il recupero delle partite",

      message:
        error?.message ||
        "Errore sconosciuto"

    });

  }
}
