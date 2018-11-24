const {google} = require("googleapis");
const readline = require('readline');
const fs = require('fs');
const fsProm = fs.promises;
const path = require('path');

const globals = require('./_globals');

const CACHE_PATH = globals.getCacheDir();
const TOKEN_PATH = path.join(CACHE_PATH, ".token");

class Authenticator {
    static async authenticate() {
        const oauth2Client = new google.auth.OAuth2(
            "17772065749-bqi8lg8v5kovrp75ai0efa6m2rbimp9s.apps.googleusercontent.com",
            "lVdcPKrKwpJncleFI77URygS",
            "https://drivesync-223223.appspot.com/"
        );

        //ensure that always the latest tokens are stored in the cache
        oauth2Client.on('tokens', async (newTokens) => {
            //if no token is stored yet: return
            if(!fs.existsSync(TOKEN_PATH)) {
                return;
            }

            let tokens = JSON.parse(await fsProm.readFile(TOKEN_PATH));
            tokens.access_token = newTokens.access_token;

            if (newTokens.refresh_token) {
                tokens.refresh_token = newTokens.refresh_token;
            }

            //save new tokens
            await fsProm.writeFile(TOKEN_PATH, JSON.stringify(tokens));
            console.log('Updated cached oAuth Tokens');
        });

        const tokens = await new Promise(async (resolve) => {
            //if token is already stored, use this one, otherwise ask for authorization to get a token
            if(fs.existsSync(TOKEN_PATH)) {
                let tokens = JSON.parse(await fsProm.readFile(TOKEN_PATH));
                resolve(tokens);
            } else {
                const url = oauth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: 'https://www.googleapis.com/auth/drive', //all Drive Permissions
                    prompt: 'consent'
                });

                console.log("Please open the following url in the browser: " + url);

                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });

                rl.question('Please enter the code: ', async (code) => {
                    rl.close();

                    let tokens = (await oauth2Client.getToken(code)).tokens;
                    //store the token in cache
                    await fsProm.writeFile(TOKEN_PATH, JSON.stringify(tokens));

                    resolve(tokens);
                });
            }
        });

        oauth2Client.setCredentials(tokens);

        return oauth2Client;
    }
}

module.exports = Authenticator;