export default function handler(req, res) {
  return res.status(200).json({
    success: true,
    version: "TEST-2026-08-25-001",
    message: "NUOVO CODICE VERCEL"
  });
}
