// Every rule here catches a bug that runs, not a style someone prefers.
//
// It exists because of autoPickCarry: used twice in the 100ms ticker, declared nowhere,
// shipped for thirty versions and past 620 assertions, and it permanently stopped any save
// that bought Full Automation from earning. Reading an undeclared name throws, and no test
// covered that branch because no fixture owned the tree node. A linter would have found it
// in under a second on the day it was written.
//
// no-unused-vars and no-empty are off: the first flags the game's deliberate table entries
// and the second its many intentionally silent catches, and neither describes a defect.
// Everything else in eslint:recommended stays on, including the two rules whose only hits
// were cleared rather than suppressed -- a disabled rule finds nothing later either.
const { execFileSync } = require("child_process");
const path = require("path");
const P = require("./paths.js");
const ok=[], bad=[];
const chk=(n,c,d)=>(c?ok:bad).push(n+(d?"  ["+d+"]":""));

const DIR = __dirname;
function lint(file){
  try {
    execFileSync(path.join(DIR, "node_modules", ".bin", "eslint"),
                 ["--no-error-on-unmatched-pattern", file],
                 { cwd: DIR, stdio: ["ignore", "pipe", "pipe"] });
    return "";
  } catch (e) {
    return String((e.stdout || "") + (e.stderr || "")).trim();
  }
}

// The shipping game, as extracted. This is the file the player runs.
const out = lint(path.join(DIR, "game.js"));
chk("the shipping script has no defects the linter can see", out === "",
    out ? out.split("\n").slice(0, 6).join(" | ") : "clean");

// A gate nobody has proved can fail is not a gate. Strip the declaration that the bug this
// suite exists for was missing, and the same run has to reject it.
const fs = require("fs");
const src = fs.readFileSync(path.join(DIR, "game.js"), "utf8");
const control = path.join(DIR, "game-lint-control.js");
const stripped = src.replace(/^  var autoPickCarry = 0;$/m, "");
chk("the control actually removes the declaration", stripped !== src,
    stripped === src ? "nothing was stripped -- this gate proves nothing" : "removed");
fs.writeFileSync(control, stripped);
const controlOut = lint(control);
fs.unlinkSync(control);
chk("and undeclared identifiers are rejected when present",
    /autoPickCarry.*is not defined/.test(controlOut),
    controlOut ? controlOut.split("\n").slice(1, 3).join(" | ") : "the control passed, so the gate is inert");

console.log("PASS:"); ok.forEach(x=>console.log("  + " + x));
if (bad.length){ console.log("FAIL:"); bad.forEach(x=>console.log("  - " + x)); }
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length ? 1 : 0);
