export default function handler(req, res) {
  res.status(200).json({
    success: true,
    api: "100%SerieA&SerieB",
    status: "online",
    message: "API funzionante!"
  });
}
