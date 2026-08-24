const ESPN_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/soccer";

async function fetchESPN(league, params = "") {
  const url = `${ESPN_BASE}/${league}/scoreboard${params}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `ESPN error: ${response.status} ${response.statusText}`
    );
  }

  return await response.json();
}

export async function getScoreboard(league, date = null) {
  let params = "";

  if (date) {
    params = `?dates=${date}`;
  }

  return await fetchESPN(league, params);
}

export async function getToday(league) {
  return await getScoreboard(league);
}

export async function getMatchesByDate(league, date) {
  return await getScoreboard(league, date);
}

export async function getMatchSummary(league, eventId) {
  const url =
    `${ESPN_BASE}/${league}/summary?event=${eventId}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `ESPN summary error: ${response.status}`
    );
  }

  return await response.json();
}

export default {
  getScoreboard,
  getToday,
  getMatchesByDate,
  getMatchSummary
};
