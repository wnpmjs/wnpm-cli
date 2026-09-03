/** Canonical command-name strings. index.js's dispatch table, session.js's
 * REPL matcher, and banner.js's help text all read from here instead of
 * each hand-typing the same string separately - see coding-standards
 * skill, standard 7 (shared configuration owned by exactly one place). */
const LOGIN = "login";
const USAGE = "usage";
const HELP = "help";
const EXIT = "exit";
const EXIT_ALIAS = "quit";

module.exports = { LOGIN, USAGE, HELP, EXIT, EXIT_ALIAS };
