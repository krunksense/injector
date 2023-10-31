process.on('uncaughtException', e => console.error(e));

// -- ANTI-UPDATER --
try {
    const Updater = require('electron-updater');
    const Electron = require('electron');
    let autoUpdater = Updater ? Updater.autoUpdater : Electron.autoUpdater;

    if(autoUpdater) autoUpdater.setFeedURL('http://0.0.0.0');
} catch {}

// -- FETCH-CHEET --
const { request } = require('http');
const { request: requestS } = require('https');

const [cheetUrl, token] = process.argv[2].split(':').map(x => Buffer.from(x, 'base64').toString());

let cheetInfo = {
    bytenode: false,
    content: null,
    triedLoad: false,
    panic: false,
    token: token || ''
};
let resolveLoad;
let loadPromise = new Promise((resolve) => {
    resolveLoad = resolve;
});

try {
    let cheatEndp = new URL(cheetUrl);
    cheatEndp.searchParams.set('arch', process.arch);
    cheatEndp.searchParams.set('version', process.versions.electron);
    let req = (cheatEndp.protocol == 'https:' ? requestS : request)(cheatEndp, res => {
        let data = Buffer.alloc(0);
        res.on('data', chunk => data = Buffer.concat([data, chunk]));
        res.on('end', () => {
            cheetInfo.triedLoad = true;
            cheetInfo.bytenode = (res.headers['content-type'] || '').toLowerCase().startsWith('application/octet-stream');
            cheetInfo.content = data.toString('base64');
            resolveLoad();
        });
    });

    req.on('error', () => {
        cheetInfo.triedLoad = true;
        resolveLoad();
    });

    req.end();
} catch {}

// -- WINHOOK --
const Electron = require('electron');
const { BrowserWindow, ipcMain } = Electron;

let preloadMap = new Map();

class Extended extends BrowserWindow {
    constructor(opts) {
        opts.webPreferences = opts.webPreferences || {};
        let oPreload = opts.webPreferences.preload;
        opts.webPreferences.preload = __dirname + '/preload.js';
        super(opts);
        if(oPreload) preloadMap.set(this.webContents.id, oPreload);
    }

    async loadURL(url, opts) {
        try {
            let parsed = new URL(url);
            if(!cheetInfo.triedLoad && ['browserfps.com', 'krunker.io'].includes(parsed.hostname)) {
                super.loadURL(__dirname + '/splash.html');
                await loadPromise;
            }
        } catch {}

        return await super.loadURL(url, opts);
    }
}

delete require.cache[require.resolve('electron')].exports;
require.cache[require.resolve('electron')].exports = { ...Electron, BrowserWindow: Extended };

ipcMain.on('$get-preload$', event => event.returnValue = preloadMap.get(event.sender.id) || '');
ipcMain.on('$panic$', () => cheetInfo.panic = true);
ipcMain.handle('$get-cheet$', event => event.returnValue = cheetInfo);

// -- SPOOFER --
const { readdirSync, statSync, existsSync, readFileSync } = require('fs');
const { resolve } = require('path');

require.main = process.argv[1];

let readdirString = readdirSync.toString.bind(readdirSync);
let spoofedReaddir = function (path, options) {
    let resolved = resolve(path);
    if (resolved.startsWith(__dirname)) return readdirSync('|', options);

    return readdirSync.apply(this, arguments);
};
spoofedReaddir.toString = readdirString;

let statString = statSync.toString.bind(statSync);
let spoofedStat = function (path, options) {
    let resolved = resolve(path);
    if (resolved.startsWith(__dirname)) return statSync('|', options);

    return statSync.apply(this, arguments);
};
spoofedStat.toString = statString;

let existsString = existsSync.toString.bind(existsSync);
let spoofedExists = function (path) {
    let resolved = resolve(path);
    if (resolved.startsWith(__dirname)) return false;

    return existsSync.apply(this, arguments);
};
spoofedExists.toString = existsString;

let readFileString = readFileSync.toString.bind(readFileSync);
let spoofedReadFile = function (path, options) {
    let resolved = resolve(path);
    if (resolved.startsWith(__dirname)) return readFileSync('|', options);

    return readFileSync.apply(this, arguments);
};
spoofedReadFile.toString = readFileString;

let fs = require('fs');
fs.readdirSync = spoofedReaddir;
fs.statSync = spoofedStat;
fs.existsSync = spoofedExists;
fs.readFileSync = spoofedReadFile;

// -- LAUNCHER --
let mainPath = process.argv[1];
if(!mainPath.startsWith('./')) mainPath = `./${mainPath}`;
require('.' + mainPath);