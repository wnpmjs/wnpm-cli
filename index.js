#!/usr/bin/env node

const { runLogin } = require("./commands/login");
const { runUsage } = require("./commands/usage");
const { runInteractiveSession } = require("./commands/session");
const { runInstall } = require("./commands/install");
const { LOGIN, USAGE } = require("./constants/commandNames");

const args = process.argv.slice(2);

// Central registry: a new named command is added here, not as another
// if/else branch. Anything not matched here (including `install`/`i`,
// which needs its own arg parsing) falls through to runInstall.
const commands = {
  [LOGIN]: runLogin,
  [USAGE]: runUsage,
};

(async () => {
  if (args.length === 0) {
    await runInteractiveSession();
    return;
  }

  const handler = commands[args[0]];
  if (handler) {
    await handler(args.slice(1));
    return;
  }

  await runInstall(args);
})();
