// Module 2 part 2: did the student move stock out of the JSON file and into
// Supabase? Read from the repo, not the live site: the landing page never
// renders stock (it only appears inside an answer), and Module 1's AC-1.4
// forbids the status route we would otherwise ask the live site for.
//
// This proves the code change and the migration. Whether their own Supabase
// project is awake and seeded is answered by the report (questions 7 and 9).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS = "supabase/migrations";

const supabaseCheck = {
  id: "supabase",
  description: "Stock moved to Supabase",
  criteria: ["SUPABASE"],
  cache: true,
  needsWorkspace: true,
  async run(ctx) {
    const path = (file) => join(ctx.dir, file);
    const misses = [];

    if (existsSync(path("lib/copper/data/inventory.json"))) {
      misses.push("lib/copper/data/inventory.json is still there");
    }

    const inventory = path("lib/copper/inventory.ts");
    if (!existsSync(inventory)) {
      misses.push("lib/copper/inventory.ts is missing");
    } else {
      const source = readFileSync(inventory, "utf8");
      if (!/supabase/i.test(source)) {
        misses.push("readInventory() doesn't mention Supabase");
      }
      if (/data\/inventory\.json/.test(source)) {
        misses.push("readInventory() still reads the JSON file");
      }
    }

    const dir = path(MIGRATIONS);
    const sql = existsSync(dir)
      ? readdirSync(dir).filter((file) => file.endsWith(".sql"))
      : [];
    const createsTable = sql.some((file) =>
      /create\s+table[^;]*inventory/is.test(
        readFileSync(join(dir, file), "utf8"),
      ),
    );
    if (!createsTable) {
      misses.push(`no migration in ${MIGRATIONS} creates an inventory table`);
    }

    return {
      results: [
        {
          criterion: "SUPABASE",
          passed: misses.length === 0,
          detail:
            misses.length === 0
              ? "stock reads from Supabase; the JSON file is gone"
              : misses.join("; "),
        },
      ],
      errors: [],
    };
  },
};

export default supabaseCheck;
