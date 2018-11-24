const Authenticator = require("./Authenticator.js");
const DownloadSync = require("./DownloadSync.js").DownloadSync;
const {ConfigFilesFinder, ConfigParser} = require('./Config');
const globals = require('./_globals');

const fs = require('fs').promises;
const path = require('path');

class Runner {
    constructor(args) {
        this.args = args;
    }

    async run() {
        if(this.args.clearCache) {
            const aFiles = await fs.readdir(globals.getCacheDir());
            for(let i=0; i<aFiles.length; i++) {
                await fs.unlink(path.join(globals.getCacheDir(), aFiles[i]));
            }
        }

        const oAuth = await Authenticator.authenticate();
        const aConfigFiles = await ConfigFilesFinder.getConfigFiles(this.args.confDir);

        const parser = new ConfigParser(aConfigFiles, oAuth);
        await parser.parse();
        const aConfigs = parser.getConfigs();

        const aJobs = [];
        aConfigs.forEach((config) => aJobs.push(this.startConfigJob(config, oAuth)));
        await Promise.all(aJobs);
    }

    async startConfigJob(config, oAuth) {
        if(config.direction === "downloadOnly") {
            await new DownloadSync(config, oAuth).start();
        }
    }
}

module.exports = Runner;