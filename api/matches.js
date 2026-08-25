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

      return {
        id: event.id,

        date: event.date,

        home: {
          name:
            home?.team?.displayName || null,

          score:
            home?.score ?? "-",

          logo:
            home?.team?.logo || null
        },

        away: {
          name:
            away?.team?.displayName || null,

          score:
            away?.score ?? "-",

          logo:
            away?.team?.logo || null
        },

        status:
          competition?.status?.type?.description ||
          null
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
