import competitions from "../lib/competitions.js";

const TIMEZONE = "Europe/Rome";

/* =========================================
   DATA E ORA ITALIANA
========================================= */

function getItalianParts(isoDate) {
  if (!isoDate) {
    return {
      date: null,
      time: null
    };
  }

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
   DATA ITALIANA PER ESPN
========================================= */

function getESPNDate(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year =
    parts.find(
      part => part.type === "year"
    )?.value;

  const month =
    parts.find(
      part => part.type === "month"
    )?.value;

  const day =
    parts.find(
      part => part.type === "day"
    )?.value;

  return `${year}${month}${day}`;
}


/* =========================================
   AGGIUNGI GIORNI
========================================= */

function addDays(date, amount) {
  const result =
    new Date(date);

  result.setUTCDate(
    result.getUTCDate() + amount
  );

  return result;
}


/* =========================================
   TROVA IL PROSSIMO GIOVEDÌ
========================================= */

function getNextThursday() {
  const now =
    new Date();

  /*
   * Otteniamo il giorno della settimana
   * nella timezone italiana.
   *
   * 1 = lunedì
   * 2 = martedì
   * 3 = mercoledì
   * 4 = giovedì
   * 5 = venerdì
   * 6 = sabato
   * 7 = domenica
   */

  const weekday =
    new Intl.DateTimeFormat(
      "it-IT",
      {
        timeZone: TIMEZONE,
        weekday: "long"
      }
    ).format(now);

  const days = [
    "domenica",
    "lunedì",
    "martedì",
    "mercoledì",
    "giovedì",
    "venerdì",
    "sabato"
  ];

  const currentIndex =
    days.indexOf(weekday);

  /*
   * Giovedì = 4
   */

  let daysUntilThursday =
    (4 - currentIndex + 7) % 7;

  /*
   * Se oggi è giovedì,
   * partiamo da oggi.
   */

  return addDays(
    new Date(
      Date.UTC(
        Number(
          new Intl.DateTimeFormat(
            "en-US",
            {
              timeZone: TIMEZONE,
              year: "numeric"
            }
          ).format(now)
        ),

        Number(
          new Intl.DateTimeFormat(
            "en-US",
            {
              timeZone: TIMEZONE,
              month: "numeric"
            }
          ).format(now)
        ) - 1,

        Number(
          new Intl.DateTimeFormat(
            "en-US",
            {
              timeZone: TIMEZONE,
              day: "numeric"
            }
          ).format(now)
        ),

        12,
        0,
        0
      )
    ),
    daysUntilThursday
  );
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

function formatMatch(
  event
) {
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
    getItalianParts(
      event.date
    );

  /*
   * Partita non ancora iniziata.
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
          : (
              home?.score ??
              0
            ),

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
          : (
              away?.score ??
              0
            ),

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


    /* =====================================
       COMPETIZIONE OBBLIGATORIA
    ===================================== */

    if (!requestedCompetition) {

      return res.status(400).json({

        success: false,

        error:
          "Inserisci una competizione"

      });
    }


    /* =====================================
       CERCA COMPETIZIONE
    ===================================== */

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
          Object.keys(
            competitions
          )

      });
    }


    /* =====================================
       CODICE ESPN
    ===================================== */

    if (!competition.league) {

      return res.status(400).json({

        success: false,

        error:
          "Questa competizione non ha un codice ESPN"

      });
    }


    /* =====================================
       PROSSIMO GIOVEDÌ
    ===================================== */

    const thursday =
      getNextThursday();


    const matches = [];


    /* =====================================
       GIOVEDÌ → MARTEDÌ
    ===================================== */

    for (
      let i = 0;
      i < 6;
      i++
    ) {

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


      for (
        const event of events
      ) {

        matches.push(
          formatMatch(
            event
          )
        );

      }

    }


    /* =====================================
       ORDINA PER DATA E ORA
    ===================================== */

    matches.sort(
      (a, b) => {

        const dateA =
          `${a.date || ""} ${a.time || ""}`;

        const dateB =
          `${b.date || ""} ${b.time || ""}`;

        return dateA.localeCompare(
          dateB
        );

      }
    );


    /* =====================================
       RISPOSTA
    ===================================== */

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
