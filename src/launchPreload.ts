import { ipcRenderer } from 'electron';

ipcRenderer.on('client-info', (event, info) => document.getElementById('clientName').innerText = info.name);
ipcRenderer.on('update-progress', (event, id, progress) => document.getElementById(id).className = 'logItem ' + progress);

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.getElementById('copyApp').className = 'logItem done';
    }, 5000);
});