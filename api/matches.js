export default function handler(req, res) {
  return res.status(200).json({
    success: true,
    api: "100%SerieA&SerieB",
    message: "Matches API funzionante",
    timezone: "Europe/Rome",
    matches: []
  });
}
