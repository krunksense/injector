import { BrowserWindow, app, ipcMain, dialog } from 'electron';
import Store from 'electron-store';
import launchWrapper from './launchWrapper';
import { basename, extname, join } from 'path';
import { spawn, spawnSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'original-fs';
import asar from '@electron/asar';
import { readdirSync } from 'fs';
import { Client as DiscordRPC } from 'discord-rpc-revamp';
const store = new Store();
const debug = require('electron').app.commandLine.hasSwitch('inspect');

let rpc = new DiscordRPC();

const DISCORD_CLIENT_ID = '1112438872085889024';
const CHEAT_URL = 'http://localhost:2314';
const TMP_DIR = join(app.getPath('temp'), 'KSI_$iìíïîìî');

app.whenReady().then(async () => {
    let mainWindow = new BrowserWindow({
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
    ipcMain.handle('pick-folder', async () => {
        let dirs = dialog.showOpenDialogSync({
            properties: ['openDirectory']
        });

        return dirs;
    });

    ipcMain.handle('dialog', async (event, isConfirm, message) => {
        let res = dialog.showMessageBoxSync({
            type: isConfirm ? 'question' : 'info',
            message: message,
            title: 'Injector',
            buttons: isConfirm ? ['Yes', 'No'] : ['OK'],
            noLink: true
        });

        return !res;
    });

    ipcMain.on('launch', (event, info) => {
        let launchWindow = new BrowserWindow({
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

    ipcMain.on('linkDiscord', async () => {
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

    ipcMain.handle('close', () => app.quit());
    app.on('window-all-closed', () => {
        if(process.platform !== 'darwin') app.quit();
    });
});

function doLaunch(info: any, launchWindow: BrowserWindow) {
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
            if(process.platform == 'win32') {
                spawnSync('taskkill', ['/IM', basename(info.path) + '.exe', '/F']);
                await new Promise(r => setTimeout(r, 1000));
            } else spawnSync('killall', [basename(info.path)]);
            
            killOld = 'done';
            launchWindow.webContents.send('update-progress', 'killOld', killOld);
        } catch(e) {
            console.error(e);
            killOld = 'error';
            launchWindow.webContents.send('update-progress', 'killOld', killOld);
        }

        if (windowClosed) return;
        copyFiles = 'progress';
        launchWindow.webContents.send('update-progress', 'copyFiles', copyFiles);

        let copyTo = join(TMP_DIR, info.name || 'unknown');
        try {
            if(existsSync(copyTo)) rmSync(copyTo, { recursive: true });
            mkdirSync(copyTo, { recursive: true });
            await launchWrapper.copyApp(info.path, copyTo);
            copyFiles = 'done';
            launchWindow.webContents.send('update-progress', 'copyFiles', copyFiles);
        } catch(e) {
            console.error(e);
            copyFiles = 'error';
            launchWindow.webContents.send('update-progress', 'copyFiles', copyFiles);
            return;
        }

        if (windowClosed) return;
        let appRoot = launchWrapper.discoverAppFolderOrASAR(copyTo);
        
        inject = 'progress';
        launchWindow.webContents.send('update-progress', 'inject', inject);
        let oldMain = 'index.js';
        let dirname = Array.from({ length: 10 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('');
        let oldPackageJSON = '';

        try {
            oldPackageJSON = readFileSync(join(appRoot, 'package.json'), 'utf8');
            let packageJSON = JSON.parse(oldPackageJSON);
            oldMain = packageJSON.main;
            packageJSON.main = dirname + '/bootstrap.js';
            writeFileSync(join(appRoot, 'package.json'), JSON.stringify(packageJSON, null, 4));
            mkdirSync(join(appRoot, dirname));
            writeFileSync(join(appRoot, dirname, 'package.json'), oldPackageJSON);
            cpSync(join(__dirname, '../inject'), join(appRoot, dirname), { recursive: true });
            inject = 'done';
            launchWindow.webContents.send('update-progress', 'inject', inject);
        } catch(e) {
            console.error(e);
            inject = 'error';
            launchWindow.webContents.send('update-progress', 'inject', inject);
            return;
        }

        if (windowClosed) return;
        repack = 'progress';
        launchWindow.webContents.send('update-progress', 'repack', repack);
        
        try {
            await asar.createPackage(appRoot, appRoot + '.asar');
            rmSync(appRoot, { recursive: true });
            repack = 'done';
            launchWindow.webContents.send('update-progress', 'repack', repack);
        } catch(e) {
            console.error(e);
            repack = 'error';
            launchWindow.webContents.send('update-progress', 'repack', repack);
            return;
        }

        if (windowClosed) return;
        launchClient = 'progress';
        launchWindow.webContents.send('update-progress', 'launchClient', launchClient);
        
        try {
            let launchArgs = [oldMain, [
                CHEAT_URL,
                (store.get('discord.accessToken', '') as string) || ''
            ].map(x => Buffer.from(x).toString('base64')).join(':')];

            if(process.platform == 'darwin') {
                spawn(copyTo, launchArgs, {
                    stdio: debug ? 'inherit' : 'ignore'
                }).unref();
            } else {
                let dir = readdirSync(copyTo, { withFileTypes: true });
                let executables = dir.filter(d => d.isFile() && !d.name.startsWith('Uninstall ') && d.name !== 'LICENSE' && (process.platform == 'win32' ? extname(d.name) == '.exe' : extname(d.name) == ''));
                let exeName = executables[0].name;

                spawn(join(copyTo, exeName), launchArgs, {
                    stdio: debug ? 'inherit' : 'ignore'
                }).unref();
            }

            launchClient = 'done';
            launchWindow.webContents.send('update-progress', 'launchClient', launchClient);
        } catch(e) {
            console.error(e);
            launchClient = 'error';
            launchWindow.webContents.send('update-progress', 'launchClient', launchClient);
        }
    });
}

process.noAsar = true;