#!/usr/bin/env node
// Runs every test-*.js and reports one line each, plus a total. Each suite is its own
// process on purpose: they all load the whole game into a stubbed DOM and several rewrite
// Date.now, so sharing a process would let one suite's fixtures decide another's result.
//
//   node tests/run.js              every suite
//   node tests/run.js --no-browser skip the two that need Chromium
//   node tests/run.js telemetry    only suites whose name matches
const { execFileSync, spawnSync } = require("child_process");
const fs   = require("fs");
const path = require("path");

const DIR = __dirname;
const args = process.argv.slice(2);
const noBrowser = args.includes("--no-browser");
const filter = args.filter(a => !a.startsWith("--"))[0];

try {
  execFileSync("sh", [path.join(DIR, "extract.sh")], { stdio: "inherit" });
} catch (e) {
  console.error("\nextract.sh failed — the suite cannot run against the shipping file.");
  process.exit(1);
}

const needsBrowser = f =>
  fs.readFileSync(path.join(DIR, f), "utf8").includes('require("./browser.js")');

let files = fs.readdirSync(DIR).filter(f => /^test-.*\.js$/.test(f)).sort();
if (filter) files = files.filter(f => f.includes(filter));

let total = 0, failed = [], skipped = [];
for (const f of files) {
  if (noBrowser && needsBrowser(f)) { skipped.push(f); continue; }
  const r = spawnSync(process.execPath, [path.join(DIR, f)], { encoding: "utf8" });
  const out = (r.stdout || "") + (r.stderr || "");
  const n = (out.match(/^ {2}\+ /gm) || []).length;
  total += n;
  if (r.status !== 0) {
    failed.push(f);
    console.log(`FAIL ${f}`);
    // Print the failing assertions, and the whole tail if it died before reporting any.
    const lines = out.match(/^ {2}- .*$/gm);
    console.log(lines ? lines.join("\n") : out.trim().split("\n").slice(-12).join("\n"));
  } else {
    console.log(`ok   ${f.padEnd(26)} ${String(n).padStart(3)} assertions`);
  }
  const skips = out.match(/^ {2}~ .*$/gm);
  if (skips) skips.forEach(s => console.log("     " + s.trim()));
}

console.log(`\n${total} assertions across ${files.length - skipped.length} suites`);
if (skipped.length) console.log(`skipped (no browser): ${skipped.join(", ")}`);
if (failed.length) { console.log(`FAILED: ${failed.join(" ")}`); process.exit(1); }
console.log("no failures");
