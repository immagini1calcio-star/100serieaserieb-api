const teamNames = {
  /* =========================================
     🇮🇹 SERIE A / ITALIA
  ========================================= */

  "Inter Milan": "Inter",
  "Internazionale": "Inter",
  "FC Internazionale Milano": "Inter",
  "Inter": "Inter",

  "AC Milan": "Milan",
  "Milan": "Milan",

  "AS Roma": "Roma",
  "Roma": "Roma",

  "SS Lazio": "Lazio",
  "Lazio": "Lazio",
  "Lazio Rome": "Lazio",

  "Juventus FC": "Juventus",
  "Juventus": "Juventus",

  "SSC Napoli": "Napoli",
  "Napoli": "Napoli",

  "Atalanta BC": "Atalanta",
  "Atalanta": "Atalanta",

  "Bologna FC": "Bologna",
  "Bologna": "Bologna",

  "ACF Fiorentina": "Fiorentina",
  "Fiorentina": "Fiorentina",

  "Torino FC": "Torino",
  "Torino": "Torino",

  "Genoa CFC": "Genoa",
  "Genoa": "Genoa",

  "US Sassuolo": "Sassuolo",
  "Sassuolo": "Sassuolo",

  "Udinese Calcio": "Udinese",
  "Udinese": "Udinese",

  "Cagliari Calcio": "Cagliari",
  "Cagliari": "Cagliari",

  "Como 1907": "Como",
  "Como": "Como",

  "Parma Calcio": "Parma",
  "Parma": "Parma",

  "US Lecce": "Lecce",
  "Lecce": "Lecce",

  "Hellas Verona": "Verona",
  "Verona": "Verona",

  "Empoli FC": "Empoli",
  "Empoli": "Empoli",

  "Pisa SC": "Pisa",
  "Pisa": "Pisa",

  "US Cremonese": "Cremonese",
  "Cremonese": "Cremonese",

  "US Catanzaro": "Catanzaro",
  "Catanzaro": "Catanzaro",

  "Venezia FC": "Venezia",
  "Venezia": "Venezia",

  "Sampdoria": "Sampdoria",
  "UC Sampdoria": "Sampdoria",

  /* =========================================
     🏴 PREMIER LEAGUE
  ========================================= */

  "Manchester United": "Manchester United",
  "Manchester City": "Manchester City",

  "Liverpool FC": "Liverpool",
  "Liverpool": "Liverpool",

  "Arsenal FC": "Arsenal",
  "Arsenal": "Arsenal",

  "Chelsea FC": "Chelsea",
  "Chelsea": "Chelsea",

  "Tottenham Hotspur": "Tottenham",
  "Tottenham": "Tottenham",

  "Newcastle United": "Newcastle United",

  "Aston Villa": "Aston Villa",

  "West Ham United": "West Ham",

  "Crystal Palace": "Crystal Palace",

  "Everton": "Everton",
  "Everton FC": "Everton",

  "Fulham": "Fulham",
  "Fulham FC": "Fulham",

  "Brighton & Hove Albion": "Brighton",
  "Brighton": "Brighton",

  "Wolverhampton Wanderers": "Wolverhampton",
  "Wolverhampton": "Wolverhampton",

  "Nottingham Forest": "Nottingham Forest",

  "Brentford": "Brentford",
  "Brentford FC": "Brentford",

  "Bournemouth": "Bournemouth",
  "AFC Bournemouth": "Bournemouth",

  "Leeds United": "Leeds United",

  "Burnley": "Burnley",

  "Sunderland": "Sunderland",

  /* =========================================
     🇪🇸 LA LIGA
  ========================================= */

  "Real Madrid": "Real Madrid",

  "FC Barcelona": "Barcellona",
  "Barcelona": "Barcellona",

  "Atletico Madrid": "Atletico Madrid",
  "Atlético Madrid": "Atletico Madrid",
  "Atlético de Madrid": "Atletico Madrid",

  "Athletic Club": "Atletico Bilbao",
  "Athletic Bilbao": "Atletico Bilbao",

  "Real Sociedad": "Real Sociedad",

  "Villarreal CF": "Villarreal",
  "Villarreal": "Villarreal",

  "Sevilla FC": "Siviglia",
  "Sevilla": "Siviglia",

  "Valencia CF": "Valencia",
  "Valencia": "Valencia",

  "Real Betis": "Real Betis",
  "Real Betis Balompié": "Real Betis",

  "Celta Vigo": "Celta Vigo",
  "RC Celta": "Celta Vigo",

  "Getafe CF": "Getafe",
  "Getafe": "Getafe",

  "CA Osasuna": "Osasuna",
  "Osasuna": "Osasuna",

  "RCD Mallorca": "Maiorca",
  "Mallorca": "Maiorca",

  "Girona FC": "Girona",
  "Girona": "Girona",

  "Rayo Vallecano": "Rayo Vallecano",

  "Espanyol": "Espanyol",
  "RCD Espanyol": "Espanyol",

  /* =========================================
     🇩🇪 BUNDESLIGA
  ========================================= */

  "Bayern Munich": "Bayern Monaco",
  "Bayern München": "Bayern Monaco",
  "FC Bayern München": "Bayern Monaco",
  "Bayern": "Bayern Monaco",

  "Borussia Dortmund": "Borussia Dortmund",

  "Bayer Leverkusen": "Bayer Leverkusen",

  "RB Leipzig": "RB Lipsia",
  "Leipzig": "RB Lipsia",

  "Eintracht Frankfurt": "Eintracht Francoforte",

  "VfB Stuttgart": "Stoccarda",
  "Stuttgart": "Stoccarda",

  "Borussia Mönchengladbach":
    "Borussia Mönchengladbach",

  "Borussia Monchengladbach":
    "Borussia Mönchengladbach",

  "VfL Wolfsburg": "Wolfsburg",
  "Wolfsburg": "Wolfsburg",

  "Werder Bremen": "Werder Brema",

  "SC Freiburg": "Friburgo",
  "Freiburg": "Friburgo",

  "TSG Hoffenheim": "Hoffenheim",

  "Mainz": "Mainz",
  "1. FSV Mainz 05": "Mainz",

  "FC Augsburg": "Augusta",
  "Augsburg": "Augusta",

  "Union Berlin": "Union Berlino",
  "1. FC Union Berlin": "Union Berlino",

  /* =========================================
     🇫🇷 LIGUE 1
  ========================================= */

  "Paris Saint-Germain": "Paris Saint-Germain",
  "Paris Saint-Germain FC": "Paris Saint-Germain",
  "PSG": "Paris Saint-Germain",

  "Olympique de Marseille": "Marsiglia",
  "Olympique Marseille": "Marsiglia",
  "Marseille": "Marsiglia",

  "Olympique Lyonnais": "Lione",
  "Olympique Lyon": "Lione",
  "Lyon":
