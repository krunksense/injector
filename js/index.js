"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electron_store_1 = __importDefault(require("electron-store"));
const launchWrapper_1 = __importDefault(require("./launchWrapper"));
const path_1 = require("path");
const child_process_1 = require("child_process");
const original_fs_1 = require("original-fs");
const asar_1 = __importDefault(require("@electron/asar"));
const fs_1 = require("fs");
const discord_rpc_revamp_1 = require("discord-rpc-revamp");
const store = new electron_store_1.default();
const debug = require('electron').app.commandLine.hasSwitch('inspect');
let rpc = new discord_rpc_revamp_1.Client();
const DISCORD_CLIENT_ID = '1112438872085889024';
const CHEAT_URL = 'http://localhost:2314';
// const CHEAT_URL = 'http://localhost/cheat';
const TMP_DIR = (0, path_1.join)(electron_1.app.getPath('temp'), 'KSI_$iìíïîìî');
electron_1.app.whenReady().then(async () => {
    let mainWindow = new electron_1.BrowserWindow({
        width: 600,
        height: 700,
        frame: false,
        webPreferences: {
            preload: __dirname + '/preload.js',
            nodeIntegration: true
        }
    });
    mainWindow.setMenu(null);
    mainWindow.loadFile('html/index.html');
    electron_1.ipcMain.handle('pick-folder', async () => {
        let dirs = electron_1.dialog.showOpenDialogSync({
            properties: ['openDirectory']
        });
        return dirs;
    });
    electron_1.ipcMain.handle('dialog', async (event, isConfirm, message) => {
        let res = electron_1.dialog.showMessageBoxSync({
            type: isConfirm ? 'question' : 'info',
            message: message,
            title: 'Injector',
            buttons: isConfirm ? ['Yes', 'No'] : ['OK'],
            noLink: true
        });
        return !res;
    });
    electron_1.ipcMain.on('launch', (event, info) => {
        let launchWindow = new electron_1.BrowserWindow({
            width: 800,
            height: 400,
            frame: false,
            webPreferences: {
                preload: __dirname + '/launchPreload.js',
                nodeIntegration: true
            }
        });
        let mainWinPos = mainWindow.getPosition();
        let mainWinSize = mainWindow.getSize();
        let launchWinPos = [
            mainWinPos[0] + mainWinSize[0] + 10,
            mainWinPos[1]
        ];
        launchWindow.setPosition(launchWinPos[0], launchWinPos[1]);
        launchWindow.setMenu(null);
        launchWindow.loadFile('html/launch.html');
        doLaunch(info, launchWindow);
    });
    electron_1.ipcMain.on('linkDiscord', async () => {
        rpc.connect({
            clientId: DISCORD_CLIENT_ID,
            scopes: ['identify']
        }).then(() => {
            store.set('discord', {
                accessToken: rpc.accessToken,
                refreshToken: rpc.refreshToken
            });
            mainWindow.webContents.send('discord-callback');
        }).catch(() => mainWindow.webContents.send('discord-callback'));
    });
    electron_1.ipcMain.handle('close', () => electron_1.app.quit());
    electron_1.app.on('window-all-closed', () => {
        if (process.platform !== 'darwin')
            electron_1.app.quit();
    });
});
function doLaunch(info, launchWindow) {
    let killOld = 'progress';
    let copyFiles = '';
    let inject = '';
    let repack = '';
    let launchClient = '';
    let windowClosed = false;
    launchWindow.webContents.on('did-finish-load', () => {
        launchWindow.webContents.send('client-info', info);
        launchWindow.webContents.send('update-progress', 'killOld', killOld);
        launchWindow.webContents.send('update-progress', 'copyFiles', copyFiles);
        launchWindow.webContents.send('update-progress', 'inject', inject);
        launchWindow.webContents.send('update-progress', 'repack', repack);
        launchWindow.webContents.send('update-progress', 'launchClient', launchClient);
    });
    launchWindow.on('close', () => windowClosed = true);
    launchWindow.webContents.once('did-finish-load', async () => {
        try {
            if (process.platform == 'win32') {
                (0, child_process_1.spawnSync)('taskkill', ['/IM', (0, path_1.basename)(info.path) + '.exe', '/F']);
                await new Promise(r => setTimeout(r, 1000));
            }
            else
                (0, child_process_1.spawnSync)('killall', [(0, path_1.basename)(info.path)]);
            killOld = 'done';
            launchWindow.webContents.send('update-progress', 'killOld', killOld);
        }
        catch (e) {
            console.error(e);
            killOld = 'error';
            launchWindow.webContents.send('update-progress', 'killOld', killOld);
        }
        if (windowClosed)
            return;
        copyFiles = 'progress';
        launchWindow.webContents.send('update-progress', 'copyFiles', copyFiles);
        let copyTo = (0, path_1.join)(TMP_DIR, info.name || 'unknown');
        try {
            if ((0, original_fs_1.existsSync)(copyTo))
                (0, original_fs_1.rmSync)(copyTo, { recursive: true });
            (0, original_fs_1.mkdirSync)(copyTo, { recursive: true });
            await launchWrapper_1.default.copyApp(info.path, copyTo);
            copyFiles = 'done';
            launchWindow.webContents.send('update-progress', 'copyFiles', copyFiles);
        }
        catch (e) {
            console.error(e);
            copyFiles = 'error';
            launchWindow.webContents.send('update-progress', 'copyFiles', copyFiles);
            return;
        }
        if (windowClosed)
            return;
        let appRoot = launchWrapper_1.default.discoverAppFolderOrASAR(copyTo);
        inject = 'progress';
        launchWindow.webContents.send('update-progress', 'inject', inject);
        let oldMain = 'index.js';
        let dirname = Array.from({ length: 10 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('');
        let oldPackageJSON = '';
        try {
            oldPackageJSON = (0, original_fs_1.readFileSync)((0, path_1.join)(appRoot, 'package.json'), 'utf8');
            let packageJSON = JSON.parse(oldPackageJSON);
            oldMain = packageJSON.main;
            packageJSON.main = dirname + '/bootstrap.js';
            (0, original_fs_1.writeFileSync)((0, path_1.join)(appRoot, 'package.json'), JSON.stringify(packageJSON, null, 4));
            (0, original_fs_1.mkdirSync)((0, path_1.join)(appRoot, dirname));
            (0, original_fs_1.writeFileSync)((0, path_1.join)(appRoot, dirname, 'package.json'), oldPackageJSON);
            (0, original_fs_1.cpSync)((0, path_1.join)(__dirname, '../inject'), (0, path_1.join)(appRoot, dirname), { recursive: true });
            inject = 'done';
            launchWindow.webContents.send('update-progress', 'inject', inject);
        }
        catch (e) {
            console.error(e);
            inject = 'error';
            launchWindow.webContents.send('update-progress', 'inject', inject);
            return;
        }
        if (windowClosed)
            return;
        repack = 'progress';
        launchWindow.webContents.send('update-progress', 'repack', repack);
        try {
            await asar_1.default.createPackage(appRoot, appRoot + '.asar');
            (0, original_fs_1.rmSync)(appRoot, { recursive: true });
            repack = 'done';
            launchWindow.webContents.send('update-progress', 'repack', repack);
        }
        catch (e) {
            console.error(e);
            repack = 'error';
            launchWindow.webContents.send('update-progress', 'repack', repack);
            return;
        }
        if (windowClosed)
            return;
        launchClient = 'progress';
        launchWindow.webContents.send('update-progress', 'launchClient', launchClient);
        try {
            let launchArgs = [oldMain, [
                    CHEAT_URL,
                    store.get('discord.accessToken', '') || ''
                ].map(x => Buffer.from(x).toString('base64')).join(':')];
            if (process.platform == 'darwin') {
                (0, child_process_1.spawn)(copyTo, launchArgs, {
                    stdio: debug ? 'inherit' : 'ignore'
                }).unref();
            }
            else {
                let dir = (0, fs_1.readdirSync)(copyTo, { withFileTypes: true });
                let executables = dir.filter(d => d.isFile() && !d.name.startsWith('Uninstall ') && d.name !== 'LICENSE' && (process.platform == 'win32' ? (0, path_1.extname)(d.name) == '.exe' : (0, path_1.extname)(d.name) == ''));
                let exeName = executables[0].name;
                (0, child_process_1.spawn)((0, path_1.join)(copyTo, exeName), launchArgs, {
                    stdio: debug ? 'inherit' : 'ignore'
                }).unref();
            }
            launchClient = 'done';
            launchWindow.webContents.send('update-progress', 'launchClient', launchClient);
        }
        catch (e) {
            console.error(e);
            launchClient = 'error';
            launchWindow.webContents.send('update-progress', 'launchClient', launchClient);
        }
    });
}
process.noAsar = true;
