const readline = require("readline");
const { login } = require("./login");
const { fetchUsage, formatUsage, NotLoggedInError } = require("./usage");
const { printBanner, printHelp } = require("./banner");
const { LOGIN, USAGE, HELP, EXIT, EXIT_ALIAS } = require("../constants/commandNames");

function isExitCommand(command) {
  return command === `/${EXIT}` || command === `/${EXIT_ALIAS}`;
}

async function handleUsageCommand() {
  try {
    console.log(formatUsage(await fetchUsage()));
  } catch (e) {
    console.log(
      e instanceof NotLoggedInError
        ? "Not logged in. Run /login first."
        : `❌ Could not fetch usage: ${e.message}`
    );
  }
}

/** Reuses the REPL's own already-open readline interface for the "paste
 * the API key" prompt instead of auth.js spinning up a second one - a
 * second interface reading the same stdin would race this one's
 * persistent `"line"` listener. `rl.question` is specifically designed to
 * intercept just the next line for interfaces that also have a `"line"`
 * listener, so this is safe. */
function promptForApiKey(rl) {
  return new Promise((resolve) => rl.question("Paste the API key shown in your browser: ", resolve));
}

async function handleLoginCommand(rl) {
  try {
    await login(() => promptForApiKey(rl));
    console.log("✅ Logged in.");
  } catch (e) {
    console.log(`❌ Login failed: ${e.message}`);
  }
}

function handleUnknownCommand(input) {
  console.log(`Unknown command: ${input}. Type /help for a list of commands.`);
}

// Commands that hit the network and need the `busy` guard. `/help`/`/exit`
// are handled separately below since they're synchronous meta-commands
// with no network wait to guard against.
const COMMAND_HANDLERS = {
  [`/${USAGE}`]: () => handleUsageCommand(),
  [`/${LOGIN}`]: (rl) => handleLoginCommand(rl),
};

/** Bare `wnpm` with no arguments opens this interactive session (like
 * typing `claude`). `wnpm install ...` etc. as direct CLI args bypass this
 * entirely and go straight to their own command handler. */
function runInteractiveSession() {
  printBanner();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "wnpm > ",
  });
  rl.prompt();

  let busy = false;

  rl.on("line", async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }
    if (busy) {
      console.log("Still working on the previous command — please wait.\n");
      rl.prompt();
      return;
    }

    // Only the first token matters - no command takes flags/arguments.
    const command = input.split(/\s+/)[0];

    if (isExitCommand(command)) {
      rl.close();
      return;
    }
    if (command === `/${HELP}`) {
      printHelp();
      rl.prompt();
      return;
    }

    const handler = COMMAND_HANDLERS[command];
    busy = true;
    try {
      if (handler) {
        await handler(rl);
      } else {
        handleUnknownCommand(input);
      }
    } finally {
      console.log("");
      busy = false;
      rl.prompt();
    }
  });

  return new Promise((resolve) => {
    rl.on("close", () => {
      console.log("Bye!");
      resolve();
    });
  });
}

module.exports = { runInteractiveSession };
