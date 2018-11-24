const path = require('path');
const fs = require('fs');

module.exports.getCacheDir = function () {
    const cacheDir = path.join(__dirname, "../cache");
    if(!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir);
    }

    return cacheDir;
};