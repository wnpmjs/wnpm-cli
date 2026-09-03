const { spawnSync } = require("child_process");
const readline = require("readline");
const { auditPackages } = require("../api");
const auth = require("../auth");
const {
  getPackages,
  getDepsFromPackageJson,
  getResolvedVersion,
  packageBaseName,
} = require("../utils");

function askUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase());
    });
  });
}

/** Default command: resolve versions, audit them against the wnpm API, then
 * run the real `npm install` (possibly with substituted versions, or
 * blocked outright). Handles both `wnpm install <pkgs>` and a bare
 * `wnpm install`/`wnpm i` that installs from package.json as-is. */
async function runInstall(args) {
  let pkgs = getPackages(args);
  if (!pkgs.length) {
    pkgs = getDepsFromPackageJson();
  }

  console.log("🔍 Running wnpm checks...\n");

  const installOrder = [];
  const payload = [];

  for (const pkg of pkgs) {
    const name = packageBaseName(pkg);
    const version = getResolvedVersion(pkg);

    if (!version) {
      console.log(
        `⚠️ Could not resolve version for ${pkg}, installing as-is`
      );
      installOrder.push({ pkg, name, version: null, skipApi: true });
      continue;
    }

    installOrder.push({ pkg, name, version, skipApi: false });
    payload.push({ name, version });
  }

  let apiResults = [];
  if (payload.length > 0) {
    try {
      const apiKey = await auth.getApiKey();
      apiResults = (await auditPackages(payload, apiKey)) || [];
    } catch (e) {
      console.error("❌ API error:", e.message);
      process.exit(1);
    }
  }

  let hasHighRisk = false;
  const finalInstallList = [];
  let resultIdx = 0;

  for (const item of installOrder) {
    if (item.skipApi) {
      finalInstallList.push(item.pkg);
      continue;
    }

    const row = apiResults[resultIdx++];
    if (!row || !row.ok) {
      console.log(`\n⚠️ No API result for ${item.name}, installing as-is`);
      finalInstallList.push(item.pkg);
      continue;
    }

    console.log(`\n🔍 Checking ${item.name}@${row.version}...`);

    let finalVersion = row.version;
    let installBlocked = row.blocked;

    if (row.isNew) {
      console.log(
        `⚠️ ${item.name}@${row.version} was published very recently (< 24h ago).`
      );
    }

    if (row.vulnIds && row.vulnIds.length > 0) {
      const severityLabel = row.severity
        ? ` (${row.severity}${row.cvssScore != null ? `, CVSS ${row.cvssScore}` : ""})`
        : "";
      console.log(`❌ Findings${severityLabel}:`);
      row.vulnIds.forEach((id) => console.log(`   - ${id}`));
    }

    if (row.blocked && row.recommendedVersion) {
      console.log(`❌ ${item.name}@${row.version} is blocked due to known vulnerabilities.`);
      console.log(
        `   A non-vulnerable version is available: ${item.name}@${row.recommendedVersion}.`
      );
      const answer = await askUser(
        `   Install ${row.recommendedVersion} instead? (y/n): `
      );
      if (answer === "y") {
        console.log(`✔️ Using ${row.recommendedVersion} instead.`);
        finalVersion = row.recommendedVersion;
        installBlocked = false;
      } else {
        console.log("❌ Keeping requested version — install not allowed for this package.");
      }
    } else if (row.blocked) {
      console.log("❌ Install not allowed for this package.");
    } else if (row.level === "medium") {
      console.log("⚠️ Proceed with caution for this package.");
    } else {
      console.log("✅ Cleared to proceed.");
    }

    if (installBlocked) {
      hasHighRisk = true;
    }

    const specChanged = finalVersion !== row.version;
    finalInstallList.push(
      specChanged ? `${item.name}@${finalVersion}` : item.pkg
    );
  }

  if (hasHighRisk) {
    console.log("\n🚫 Installation stopped by wnpm.");
    process.exit(1);
  }

  console.log("\n📦 Final install list:", finalInstallList);
  console.log("\n🚀 Installing...\n");

  if (!getPackages(args).length) {
    spawnSync("npm", args, { stdio: "inherit" });
  } else {
    const result = spawnSync("npm", ["install", ...finalInstallList], {
      stdio: "inherit",
    });
    if (result.status !== 0) {
      console.log("❌ npm install failed");
      process.exit(1);
    }
  }
}

module.exports = { runInstall };
