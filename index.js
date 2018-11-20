const Runner = require("./Runner/Runner.js");
const {version} = require("./package.json");

const ArgParser = require("argparse").ArgumentParser;

const parser = new ArgParser({
  version,
  addHelp: true,
  description: "A Google Drive File Sync Tool"
});

//add (optional) arguments
parser.addArgument("--clear-cache", {
  help: "Cleares the cache before starting the synchronisation",
  defaultValue: false,
  dest: clearCache,
  action: storeTrue
});

const runnerInstance = new Runner(parser.parseArgs());
runnerInstance.run();