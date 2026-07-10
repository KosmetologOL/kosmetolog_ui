import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import Procedure from "../models/ProcedureSchema";

dotenv.config({ path: path.resolve(__dirname, "../config/.env") });

const FOOTER_PATTERNS = [
  /якщо\s+вас\s+щось\s+турбує/iu,
  /обов[’'ʼ]?язково/iu,
  /повідомте\s+за\s+номером/iu,
  /телефону/iu,
  /instagram/iu,
  /telegram/iu,
  /позаробочий/iu,
  /термінових\s+станах/iu,
  /декілька\s+разів/iu,
  /робочий\s+час/iu,
  /без\s+відповіді/iu,
  /\+38\s*\(073\)\s*838-23-23/iu,
];

const hasFooterText = (value: string) => {
  if (!value) return false;
  return FOOTER_PATTERNS.some((pattern) => pattern.test(value));
};

const normalizeRecommendation = (value: string) => {
  if (!value || !hasFooterText(value)) return value;

  const match = value.match(/(?:якщо\s+вас\s+щось\s+турбує|обов[’'ʼ]?язково|повідомте\s+за\s+номером|телефону|instagram|telegram|позаробочий|термінових\s+станах|декілька\s+разів|робочий\s+час|без\s+відповіді|\+38\s*\(073\)\s*838-23-23)/iu);
  const cutIndex = match?.index ?? 0;

  return value
    .slice(0, cutIndex)
    .replace(/(?:\s*\n){3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\s+\n/g, "\n")
    .trim();
};

async function cleanupProcedureRecommendations() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("MONGODB_URI is not configured");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("Mongo connected");

    const procedures = await Procedure.find({ recommendation: { $exists: true } });
    const matchingProcedures = procedures.filter((procedure) =>
      hasFooterText(procedure.recommendation || ""),
    );

    console.log(`Found ${matchingProcedures.length} procedures with the footer text`);

    let updated = 0;

    for (const procedure of matchingProcedures) {
      const cleaned = normalizeRecommendation(procedure.recommendation || "");

      if (cleaned !== procedure.recommendation) {
        procedure.recommendation = cleaned;
        await procedure.save();
        updated += 1;
      }
    }

    console.log(`Updated ${updated} procedures`);
  } catch (error) {
    console.error("Cleanup failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

cleanupProcedureRecommendations();
