const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function collect(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : collect(full);
    return entry.name.endsWith(".js") ? [full] : [];
  });
}

const files = [
  ...collect(path.resolve(__dirname, "..", "src")),
  ...collect(path.resolve(__dirname)),
];

let failed = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) failed += 1;
}

if (failed) {
  console.error(`${failed} file(s) failed syntax check.`);
  process.exit(1);
}
console.log(`Syntax check passed for ${files.length} files.`);
