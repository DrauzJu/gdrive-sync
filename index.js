const Runner = require("./lib/Runner.js");
const version = require("./package.json").version;

const ArgumentParser = require('argparse').ArgumentParser;
const path = require('path');

const parser = new ArgumentParser({
  version,
  addHelp: true,
  description: "A Google Drive File Sync Tool"
});

//add arguments
parser.addArgument("--clear-cache", {
  help: "Clears the cache before starting the synchronisation",
  defaultValue: false,
  dest: "clearCache",
  action: "storeTrue"
});

parser.addArgument("--confDir", {
    help: "Sets the directory where to look for the config files",
    defaultValue: path.join(__dirname,"configs")
});

const runnerInstance = new Runner(parser.parseArgs());
runnerInstance.run().then(() => console.log("Finished syncing"));