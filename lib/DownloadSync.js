const fs = require('fs');
const fsProm = fs.promises;
const path = require('path');
const {google} = require('googleapis');

class DownloadSync {
    constructor(config, oAuth) {
        this.config = config;
        this.folderJobs = []; //all promises of running folder syncs will be in there

        this.drive = google.drive({
            version: 'v3',
            auth: oAuth
        });
    }

    async start() {
        //start root folder sync and add it to list
        const rootFolderSyncPromise = await this.syncFolder(this.config.remoteFolderID, this.config.localPath);
        this.folderJobs.push(rootFolderSyncPromise);

        let syncedFolders = await Promise.all(this.folderJobs);
        let syncedFiles = [];

        for(let i=0; i < syncedFolders.length; i++) {
            if(Array.isArray(syncedFolders[i])) {
                syncedFiles = syncedFiles.concat(syncedFolders[i]);
            }
        }

        // return list of all synced files, no matter if they were updated or not
        return syncedFiles;
    }

    async syncFolder(remoteFolderID, localPath) {
        //create folder
        if(!fs.existsSync(localPath)) {
            await fsProm.mkdir(localPath, {recursive: true});
        }

        const folderFilePromises = [];
        let queryResponse = await this.createNewQuery(`'${remoteFolderID}' in parents`);

        for(let i=0; i<queryResponse.files.length; i++) {
            const fileJob = this.syncFile(queryResponse.files[i], path.join(localPath, queryResponse.files[i].name));
            folderFilePromises.push(fileJob);
        }

        while(queryResponse.nextPageToken) {
            queryResponse = await this.continueQuery(queryResponse.nextPageToken);

            for(let i=0; i<queryResponse.files.length; i++) {
                const fileJob = this.syncFile(queryResponse.files[i], path.join(localPath, queryResponse.files[i].name));
                folderFilePromises.push(fileJob);
            }
        }

        let syncedFiles = await Promise.all(folderFilePromises);
        syncedFiles = syncedFiles.filter((file) => file !== undefined);

        console.log(`Folder ${localPath} complete`);
        return syncedFiles;
    }

    async syncFile(file, localPath) {
        if(file.mimeType === "application/vnd.google-apps.folder") {
            const folderPromise = this.syncFolder(file.id, localPath);
            this.folderJobs.push(folderPromise);
            return;
        } else if(file.mimeType.startsWith("application/vnd.google-apps.")) {
            //todo later: export these files, now: just skip them
            console.log("The following file was not downloaded: " + file.name + ", since its type is " + file.mimeType);
            return;
        }

        //if file does not exist, download it, else check modified time to see if it's necessary to download it again
        if(!await this.checkFileExists(localPath)) {
            await this.downloadFile(file.id, localPath);
        } else {
            const lastRemoteModified = new Date(file.modifiedTime).getTime(); //TimeZone: UTC
            const lastLocalModified = await this.getFileModifiedTime(localPath); //TimeZone: UTC (at least in linux and NTFS)

            if(lastRemoteModified > lastLocalModified) {
                await this.downloadFile(file.id, localPath);
            }
        }

        return localPath;
    }

    async getFileModifiedTime(path) {
        const stats = await fsProm.stat(path);
        return stats.mtimeMs;
    }

    async checkFileExists(path) {
        try {
            await fsProm.access(path);
            return true;
        } catch (e) {
            return false;
        }
    }

    async createNewQuery(query) {
        return await this.listFiles({q: query});
    }

    async continueQuery(pageToken) {
        return await this.listFiles({pageToken});
    }

    async listFiles(options) {
        options.fields = "nextPageToken,files(id,name,mimeType,modifiedTime)"; //to compare to local version
        let response = {};
        try {
            response = await this.drive.files.list(options);
        } catch (e) {
            response.data = {
                files: []
            };

            console.error(`Error while listing files: ${e}`)
        }

        return response.data;
    }

    //download file
    downloadFile(id, savePath) {
        return new Promise(async (resolve) => {
            const file = fs.createWriteStream(savePath);

            const res = await this.drive.files.get(
                {fileId: id, alt: 'media'},
                {responseType: 'stream'}
            );

            res.data
                .on('end', () => {
                    console.log(`Download of file ${savePath} completed`);
                    resolve();
                })
                .on('error', err => {
                    console.error(`Error downloading file ${savePath}: ${err}`);
                    //todo: error handling
                    resolve();
                })
                .pipe(file);
        });
    }
}

module.exports.DownloadSync = DownloadSync;