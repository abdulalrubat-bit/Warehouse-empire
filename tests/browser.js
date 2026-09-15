// Two suites need a real browser. Which Chromium that is depends on where the suite runs:
// CI installs one under Playwright's own root, a dev box may have it somewhere else, and
// a preinstalled one may not include the headless shell that a bare launch() reaches for.
// Resolve it once, here, instead of pinning a build number in two test files.
const { chromium } = require("playwright");
const fs = require("fs");

function executable(){
  if (process.env.WE_CHROMIUM) return process.env.WE_CHROMIUM;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (root) {
    try {
      const dir = fs.readdirSync(root).filter(d => /^chromium-\d+$/.test(d)).sort().pop();
      if (dir) {
        const exe = `${root}/${dir}/chrome-linux/chrome`;
        if (fs.existsSync(exe)) return exe;
      }
    } catch(e){}
  }
  return null;                       // let Playwright resolve its own download
}

module.exports = {
  launch(){
    const exe = executable();
    return chromium.launch(exe ? { executablePath: exe } : {});
  }
};
