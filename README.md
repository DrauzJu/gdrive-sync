# gdrive-sync
Google Drive Sync Tool based on NodeJS and the Google Drive API

## Installation
Requirements:
* nodejs (v7.10.1)
* npm

Download the repository and install all dependencies
```
git clone https://github.com/DrauzJu/gdrive-sync.git
cd gdrive-sync
npm i
```

## Configuration
You can configure which Google Drive folders should be synchronized with which local directories.
To do so, for every folder mapping create a .yaml file in the configuration directory.
The configuration directory could be specified with the parameter `--confDir` (default `gdrive-sync/configs`).

The following yaml attributes could be used:
* `remotePath`: the path on your google drive storage
* `localPath`: the path to the local directory
* `direction`: in which direction files should be synchronized:
  * `downloadOnly`: only downloads remote changes
  * `bidirectional`: download & upload of files (**not yet supported!**)
* `deleteLocal`: whether local files should be delete if they are deleted on google drive (`true`/`false`)

A sample configuration file can be found in the repository (`configs/sample.yaml`).

## Running the synchronization

```
node gdrive-sync/. 
```

Optional parameters:
* `--confDir directory`: specify the directory where to find the config files (default `gdrive-sync/configs`)
* `--clear-cache`: Clears the cache before starting the synchronisation

## Authorization
On the first run (or after clearing the cache) you will be asked for authorization to access your google drive account. 
Open the displayed link in a browser, follow the instructions and copy/paste the authorization token.
