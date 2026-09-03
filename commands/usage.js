const auth = require("../auth");
const { getUsage } = require("../api");

function usageBar(used, limit, width = 30) {
  const filled = Math.max(0, Math.min(width, Math.round((used / limit) * width)));
  return "█".repeat(filled) + "░".repeat(width - filled);
}

/** Thrown by fetchUsage when there's no valid token - a structural marker
 * (checked via `instanceof`, not by comparing `.message` text) so a future
 * wording change can never silently break the "not logged in" branch. */
class NotLoggedInError extends Error {}

/** Core usage-fetch logic, shared by `wnpm usage` and the `/usage` command
 * inside the interactive session. */
async function fetchUsage() {
  const apiKey = await auth.getApiKey();
  if (!apiKey) {
    throw new NotLoggedInError("Not logged in.");
  }
  return getUsage(apiKey);
}

function formatUsage(usage) {
  return (
    `Usage today: ${usage.used} / ${usage.limit}  [${usageBar(usage.used, usage.limit)}]\n` +
    `Resets at ${new Date(usage.resetsAt).toISOString()} (UTC midnight)`
  );
}

async function runUsage() {
  try {
    console.log(formatUsage(await fetchUsage()));
  } catch (e) {
    if (e instanceof NotLoggedInError) {
      console.log("Not logged in. Run `wnpm login` first.");
    } else {
      console.error(`❌ Could not fetch usage: ${e.message}`);
    }
    process.exit(1);
  }
}

module.exports = { fetchUsage, formatUsage, runUsage, NotLoggedInError };
