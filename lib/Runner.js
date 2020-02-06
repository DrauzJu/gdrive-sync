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
        const syncedFiles = await new DownloadSync(config, oAuth).start();

        //list all files in the local directory
        //and check if there were any unsynchronized files
        const localFiles = await this.listLocalFiles(config.localPath);
        let unsyncedFiles = localFiles.filter((item) => !syncedFiles.includes(item));

        if(config.direction === "downloadOnly" && config.deleteLocal) {
            //just delete any unsynced files
            for(let i=0; i<unsyncedFiles.length; i++) {
                console.log(`Deleting ${unsyncedFiles[i]}`);
                await fs.unlink(unsyncedFiles[i]);
            }
        }
    }

    async listLocalFiles(localPath) {
        try {
            await fs.access(localPath);
        } catch (e) {
            //directory does not even exist yet
            return [];
        }

        let files = [];

        const dirFiles = await fs.readdir(localPath);
        for(let i=0; i < dirFiles.length; i++) {
            const fullPath = path.join(localPath, dirFiles[i]);
            const isFolder = (await fs.stat(fullPath)).isDirectory();

            if(isFolder) {
                files = files.concat(await this.listLocalFiles(fullPath));
            } else {
                files.push(fullPath);
            }
        }

        return files;
    }
}

module.exports = Runner;