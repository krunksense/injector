"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.ipcRenderer.on('client-info', (event, info) => document.getElementById('clientName').innerText = info.name);
electron_1.ipcRenderer.on('update-progress', (event, id, progress) => document.getElementById(id).className = 'logItem ' + progress);
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.getElementById('copyApp').className = 'logItem done';
    }, 5000);
});
