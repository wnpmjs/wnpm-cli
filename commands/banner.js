const pkg = require("../package.json");
const { LOGIN, USAGE, HELP, EXIT } = require("../constants/commandNames");

// wnpm brand palette (wnpm-website/src/app/globals.css: --bone, --green-500,
// --green-600, --red-600), converted from oklch to sRGB for truecolor ANSI.
const BONE = [242, 241, 238];
const GREEN_500 = [65, 170, 102];
const GREEN_600 = [19, 125, 65];
const RED_600 = [211, 59, 54];

// Generated via `figlet -f "ANSI Shadow" WNPM` - kept as a literal so the
// CLI has no runtime dependency on figlet.
const LOGO_LINES = [
  { text: "██╗    ██╗███╗   ██╗██████╗ ███╗   ███╗", color: BONE },
  { text: "██║    ██║████╗  ██║██╔══██╗████╗ ████║", color: BONE },
  { text: "██║ █╗ ██║██╔██╗ ██║██████╔╝██╔████╔██║", color: GREEN_500 },
  { text: "██║███╗██║██║╚██╗██║██╔═══╝ ██║╚██╔╝██║", color: GREEN_500 },
  { text: "╚███╔███╔╝██║ ╚████║██║     ██║ ╚═╝ ██║", color: GREEN_600 },
  { text: " ╚══╝╚══╝ ╚═╝  ╚═══╝╚═╝     ╚═╝     ╚═╝", color: RED_600 },
];

function colorize([r, g, b], text) {
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}

function printHelp() {
  console.log("Commands:");
  console.log(`  /${LOGIN}   Log in with Google`);
  console.log(`  /${USAGE}   Show today's usage`);
  console.log(`  /${HELP}    Show this help`);
  console.log(`  /${EXIT}    Exit\n`);
}

function printBanner() {
  console.log("");
  for (const line of LOGO_LINES) {
    console.log(colorize(line.color, line.text));
  }
  console.log(`  v${pkg.version} — Secure npm installs, right from your terminal.\n`);
  printHelp();
}

module.exports = { printBanner, printHelp };
