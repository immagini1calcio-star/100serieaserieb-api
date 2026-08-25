export default async function handler(req, res) {
  try {
    const league = req.query.league || "ita.1";

    const url =
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`ESPN HTTP ${response.status}`);
    }

    const data = await response.json();

    const matches = (data.events || []).map(event => {
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

      /*
       * Stato della partita
       */
      const status =
        competition?.status;

      const statusType =
        status?.type;

      /*
       * Controlliamo se la partita
       * è già iniziata.
       *
       * Se completed = false e lo stato
       * è pregame, mostriamo "-".
       */
      const isNotStarted =
        statusType?.state === "pre" ||
        statusType?.name === "STATUS_SCHEDULED" ||
        statusType?.name === "STATUS_PRE";

      /*
       * Punteggio.
       *
       * Una partita non iniziata:
       * -
       *
       * Una partita iniziata:
       * 0, 1, 2, ecc.
       */
      const homeScore =
        isNotStarted
          ? "-"
          : (home?.score ?? "0");

      const awayScore =
        isNotStarted
          ? "-"
          : (away?.score ?? "0");

      return {
        id: event.id,

        date: event.date,

        home: {
          name:
            home?.team?.displayName ||
            null,

          score:
            homeScore,

          logo:
            home?.team?.logo ||
            null
        },

        away: {
          name:
            away?.team?.displayName ||
            null,

          score:
            awayScore,

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
    });

    return res.status(200).json({
      success: true,

      timezone:
        "Europe/Rome",

      league,

      count:
        matches.length,

      matches
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,

      error:
        error.message
    });
  }
}
