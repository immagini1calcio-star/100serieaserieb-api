export default function handler(req, res) {
  return res.status(200).json({
    success: true,
    message: "API 100%SerieA&SerieB funzionante",
    timezone: "Europe/Rome"
  });
}
