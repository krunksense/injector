"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_store_1 = __importDefault(require("electron-store"));
const fs_1 = require("fs");
const electron_1 = require("electron");
const path_1 = require("path");
const store = new electron_store_1.default();
var DiscordStatus;
(function (DiscordStatus) {
    DiscordStatus[DiscordStatus["Loading"] = -1] = "Loading";
    DiscordStatus[DiscordStatus["NotLinked"] = 0] = "NotLinked";
    DiscordStatus[DiscordStatus["Linked"] = 1] = "Linked";
    DiscordStatus[DiscordStatus["Pending"] = 2] = "Pending";
})(DiscordStatus || (DiscordStatus = {}));
function verifyDiscordLink(refreshed = false) {
    fetch('https://discord.com/api/users/@me', {
        headers: {
            'Authorization': 'Bearer ' + store.get('discord', {}).accessToken
        }
    }).then(r => r.json()).then(async (info) => {
        if (info.code == 0) {
            discordLinked = DiscordStatus.NotLinked;
            initApp();
            return;
        }
        discordLinked = DiscordStatus.Linked;
        initApp();
    }).catch(async () => {
        discordLinked = DiscordStatus.NotLinked;
        initApp();
    });
}
electron_1.ipcRenderer.on('discord-callback', () => {
    console.log('discord-callback');
    discordLinked = store.get('discord', {}).accessToken ? DiscordStatus.Loading : DiscordStatus.NotLinked;
    if (discordLinked == DiscordStatus.Loading)
        verifyDiscordLink();
});
let discordLinked = store.get('discord', {}).accessToken ? DiscordStatus.Loading : DiscordStatus.NotLinked;
if (discordLinked == DiscordStatus.Loading)
    verifyDiscordLink();
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('clients').style.display = '';
    }, 2000);
});
function initApp() {
    let clientList = document.getElementById('clientList');
    let clients = store.get('clients', []);
    clientList.innerHTML = '';
    for (let client of clients) {
        let elem = document.createElement('div');
        elem.classList.add('client');
        let name = document.createElement('div');
        name.classList.add('name');
        name.innerText = client.name;
        elem.appendChild(name);
        let launch = document.createElement('div');
        launch.classList.add('launch');
        launch.classList.add('material-symbols-outlined');
        launch.innerText = 'play_circle';
        elem.appendChild(launch);
        launch.onclick = () => electron_1.ipcRenderer.send('launch', client);
        let del = document.createElement('div');
        del.classList.add('delete');
        del.classList.add('material-symbols-outlined');
        del.innerText = 'delete';
        elem.appendChild(del);
        del.onclick = async () => {
            if (!(await electron_1.ipcRenderer.invoke('dialog', true, 'Are you sure you want to delete this client?')))
                return;
            let clients = store.get('clients', []);
            clients = clients.filter(c => c.path != client.path);
            store.set('clients', clients);
            initApp();
        };
        clientList.appendChild(elem);
    }
    let addClient = document.createElement('div');
    addClient.classList.add('addClient');
    addClient.innerText = '+ Add Client';
    clientList.appendChild(addClient);
    let linkDiscord = document.createElement('div');
    linkDiscord.classList.add('addClient');
    linkDiscord.id = 'linkDiscord';
    linkDiscord.innerHTML = '<span class="material-symbols-outlined">link</span>Link Discord';
    clientList.appendChild(linkDiscord);
    switch (discordLinked) {
        case DiscordStatus.Loading:
            linkDiscord.setAttribute('disabled', '');
            linkDiscord.innerText = 'Loading...';
            break;
        case DiscordStatus.Linked:
            linkDiscord.innerHTML = '<span class="material-symbols-outlined">link_off</span>Unlink Discord';
            break;
        case DiscordStatus.Pending:
            linkDiscord.setAttribute('disabled', '');
            linkDiscord.innerText = 'Please check Discord...';
            break;
    }
    linkDiscord.onclick = async () => {
        switch (discordLinked) {
            case DiscordStatus.NotLinked: // Link
                discordLinked = DiscordStatus.Pending;
                initApp();
                electron_1.ipcRenderer.send('linkDiscord');
                break;
            case DiscordStatus.Linked: // Unlink
                store.delete('discord');
                discordLinked = DiscordStatus.NotLinked;
                initApp();
                break;
        }
    };
    let closeInjector = document.createElement('div');
    closeInjector.classList.add('addClient');
    closeInjector.innerText = 'Close Injector';
    closeInjector.onclick = () => electron_1.ipcRenderer.invoke('close');
    clientList.appendChild(closeInjector);
    addClient.onclick = async () => {
        await electron_1.ipcRenderer.invoke('dialog', false, 'Please select the folder containing the client. (or on MacOS, the .app file) NOTE: Only Electron clients are supported!');
        let dir = await electron_1.ipcRenderer.invoke('pick-folder');
        if (!dir[0])
            return;
        let path = dir[0];
        let validApp = (0, fs_1.existsSync)((0, path_1.join)(path, 'resources', 'app.asar')) || (0, fs_1.existsSync)((0, path_1.join)(path, 'resources', 'app'));
        let validAppMac = (0, fs_1.existsSync)((0, path_1.join)(path, 'Contents', 'Resources', 'app.asar'));
        if (!validApp && !validAppMac)
            return await electron_1.ipcRenderer.invoke('dialog', false, 'This is not a valid client!');
        let appName = (0, path_1.basename)(path).replace('.app', '');
        let clients = store.get('clients', []);
        if (clients.find(c => c.path == path))
            return await electron_1.ipcRenderer.invoke('dialog', false, 'This client is already added!');
        clients.push({
            name: appName,
            path: path
        });
        store.set('clients', clients);
        initApp();
    };
}
electron_1.ipcRenderer.on('refresh', () => initApp());
