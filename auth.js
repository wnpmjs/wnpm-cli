const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");
const { spawn } = require("child_process");
const { getDashboardBaseUrl, getUsage } = require("./api");

const CREDENTIALS_DIR = path.join(os.homedir(), ".wnpm");
const CREDENTIALS_PATH = path.join(CREDENTIALS_DIR, "credentials.json");

function loadCredentials() {
  try {
    return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
  } catch {
    return null;
  }
}

function saveCredentials({ apiKey }) {
  fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
  const record = { apiKey };
  // 0o600: only the owner can read this file - it holds a live API key,
  // same sensitivity as a password.
  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(record, null, 2), { mode: 0o600 });
  return record;
}

function clearCredentials() {
  try {
    fs.unlinkSync(CREDENTIALS_PATH);
  } catch {
    // already gone - not an error
  }
}

/** Returns the stored API key, or null if not logged in. Unlike the old
 * access-token model this replaced, there's no expiry to check and no
 * refresh call to make - a `wnpm-...` key is sent as-is until the user
 * deletes it from the dashboard's API Keys page (which this CLI has no
 * way to detect locally; a revoked key just starts getting 401s from the
 * API, same as one that was never valid). Still `async` to keep every
 * call site's `await auth.getApiKey()` unchanged even though nothing here
 * actually awaits anything. */
async function getApiKey() {
  return loadCredentials()?.apiKey || null;
}

function openBrowser(url) {
  try {
    if (process.platform === "darwin") {
      spawn("open", [url], { stdio: "ignore", detached: true }).unref();
    } else if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", '""', url], { stdio: "ignore", detached: true, shell: true }).unref();
    } else {
      spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
    }
  } catch {
    // Best-effort only - the URL is already printed for the user to open by hand.
  }
}

/** One-off prompt for when there's no already-open readline interface
 * (a direct `wnpm login` invocation). The interactive session passes its
 * own `rl.question`-backed function instead - see commands/session.js -
 * so `/login` there doesn't spin up a second interface competing for the
 * same stdin. */
function defaultPromptForApiKey() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question("Paste the API key shown in your browser: ", (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/** Opens the browser to the dashboard's /cli-login page - not
 * wnpm-server directly, and not accounts.google.com directly either. If
 * that browser already has a dashboard session, a fresh `wnpm-...` API
 * key shows up immediately with no repeat Google round trip (the
 * dashboard just asks wnpm-server to mint one for the already-
 * authenticated user - see wnpm-server/docs/features/routes/apiKeys.md);
 * otherwise the dashboard sends it through the normal login flow first
 * and lands back on the same page once that's done. Either way this CLI
 * process just waits for the user to copy the key back into the
 * terminal - modeled on how `claude login` works, and deliberately not an
 * automatic localhost-redirect catch: a CLI's ephemeral local port is
 * exactly what VPNs, corporate proxies, SSH/remote sessions, and some
 * browser security policies silently break, which looks indistinguishable
 * from the login just hanging. Works identically whether the browser is
 * on this machine or a different one - the key just needs to end up typed
 * into wherever this is running.
 *
 * Unlike the old short-lived code this replaced, the pasted value *is*
 * the real credential - there's no exchange step. It's verified with one
 * real API call (GET /api/usage) before being saved, so a mis-pasted key
 * fails loudly here instead of silently on the next `wnpm install`. */
async function login(promptForApiKey) {
  const url = `${getDashboardBaseUrl()}/cli-login`;
  console.log(`Opening your browser to log in...\nIf it doesn't open automatically, visit:\n\n  ${url}\n`);
  openBrowser(url);

  const rawKey = await (promptForApiKey || defaultPromptForApiKey)();
  const apiKey = rawKey.trim();
  if (!apiKey) {
    throw new Error("No API key entered.");
  }

  try {
    await getUsage(apiKey);
  } catch {
    throw new Error("That API key doesn't look valid - check you copied the whole thing and try again.");
  }

  return saveCredentials({ apiKey });
}

module.exports = {
  loadCredentials,
  saveCredentials,
  clearCredentials,
  getApiKey,
  login,
};
