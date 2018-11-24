const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const Schema = require('validate');
const {google} = require('googleapis');

const configSchema = new Schema({
    remotePath: {
        type: 'string',
        required: true
    },
    localPath: {
        type: 'string',
        required: true
    },
    direction: {
        type: 'string',
        required: true,
        enum: ['downloadOnly']
    },
    deleteLocal: {
        type: 'boolean',
        required: false
    }
});

class ConfigFilesFinder {
    static async getConfigFiles(configDir) {
        let aFiles = await fs.readdir(configDir);
        aFiles =  aFiles.filter((file) => {
            return file.endsWith(".yaml");
        });
        return aFiles.map((file) => path.join(configDir, file));
    }
}

class ConfigParser {
    constructor(aConfigFiles, oAuth) {
        this.drive = google.drive({
            version: 'v3',
            auth: oAuth
        });
        this.aConfigFiles = aConfigFiles;
    }

    async parse() {
        let aConfigs = [];

        await Promise.all(this.aConfigFiles.map((file) => {
            return new Promise(async (resolve) => {
                let config = {};

                //read file
                try {
                    config = yaml.safeLoad(await fs.readFile(file));
                } catch (e) {
                    return console.error("Error loading config file: " + e);
                }

                //check config
                try {
                    this.checkConfig(config);
                } catch (e) {
                    return console.error("Invalid config " + file + ": " + e);
                }

                //load remote folder id
                try {
                    config.remoteFolderID = await this.getRemoteFolderID(config.remotePath);
                    delete config.remotePath; //not needed anymore
                } catch (e) {
                    return console.error(e);
                }

                aConfigs.push(config);
                resolve();
            });
        }));

        this.aConfigs = aConfigs;
    }

    async getRemoteFolderID(folderPath) {
        const aLevel = folderPath.split("/");
        let currentParentID = 'root'; //start searching the folder at root
        let i = 0;

        while(i < aLevel.length) {
            const aConditions = [
                "mimeType = 'application/vnd.google-apps.folder'",
                `'${currentParentID}' in parents`,
                `name = '${aLevel[i]}'`
            ];

            const response = await this.drive.files.list({
                pageSize: 1,
                q: aConditions.join(" and ")
            });

            if(response.data.files.length === 0) {
                throw new Error("Folder not found");
            }

            currentParentID = response.data.files[0].id;
            i++;
        }

        return currentParentID;
    }

    checkConfig(config) {
        const errors = configSchema.validate(config);

        if(Array.isArray(errors) && errors.length > 0) {
            const faultyProps = errors.map((error) => error.path);
            const msg = "Faulty properties: " + faultyProps.join(", ");
            throw new Error(msg);
        }
    }

    getConfigs() {
        return this.aConfigs;
    }
}

module.exports.ConfigParser = ConfigParser;
module.exports.ConfigFilesFinder = ConfigFilesFinder;