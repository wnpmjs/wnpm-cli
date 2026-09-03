const auth = require("../auth");

/** Core login logic, shared by the direct `wnpm login` CLI command and the
 * `/login` command inside the interactive session. `promptForCode` lets
 * the interactive session supply its own already-open readline's
 * `.question` instead of auth.js spinning up a second one on the same
 * stdin - see auth.js's defaultPromptForCode for the direct-CLI case.
 * Throws on failure - callers decide whether that means `process.exit` or
 * just printing. */
async function login(promptForCode) {
  return auth.login(promptForCode);
}

async function runLogin() {
  try {
    await login();
    console.log("\n✅ Logged in.");
  } catch (e) {
    console.error(`\n❌ Login failed: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { login, runLogin };
