// Module 2 grading: the spec tests, the live site, and part 2's move of stock
// into Supabase.
//
// DEPLOY only proves the site is up: the Ask Copper heading renders with no
// keys at all. AI-KEY is the same page read again for the setup card, which
// appears only when GOOGLE_GENERATIVE_AI_API_KEY is missing from Vercel.
import deploy from "../../scripts/grade/checks/deploy.mjs";
import supabase from "./checks/supabase.mjs";

const grading = {
  // deploy reports AI-KEY as well, so say so here: the repo checks that every
  // auto-graded rubric row is covered by a test or a check.
  checks: ["tests", { ...deploy, criteria: [...deploy.criteria, "AI-KEY"] }, supabase],
  deploy: {
    marker: "Ask Copper",
    absent: {
      criterion: "AI-KEY",
      text: "Set up Google AI",
      detail:
        "the live site shows the setup card: add GOOGLE_GENERATIVE_AI_API_KEY " +
        "in Vercel > Project Settings > Environment Variables and redeploy",
    },
  },
};

export default grading;
