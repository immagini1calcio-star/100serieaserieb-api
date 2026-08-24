import competitions from "../lib/competitions.js";

export default function handler(req, res) {
  res.status(200).json({
    success: true,
    count: Object.keys(competitions).length,
    competitions
  });
}
