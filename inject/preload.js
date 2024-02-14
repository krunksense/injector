const bytenode = require(__dirname + '/bytenode');
const { ipcRenderer } = require('electron');
const preload = ipcRenderer.sendSync('$get-preload$');
if (preload) require(preload);

(async () => {
    window.addEventListener('message', ({ data }) => {
        let panicMessage = 'PANIC'
            .split('')
            .map((x) => String.fromCharCode(x.charCodeAt(0) ^ 0x1337))
            .join('');
        if (data == panicMessage) ipcRenderer.send('$panic$');
    });

    const cheetInfo = await ipcRenderer.invoke('$get-cheet$');
    if (!cheetInfo.content || cheetInfo.panic) return;
    const cheetContent = Buffer.from(cheetInfo.content, 'base64');

    let url = new URL(location.href);
    if (!['browserfps.com', 'krunker.io'].includes(url.hostname)) return;

    window.KRUNKSENSE_TOKEN = cheetInfo.token;
    if (cheetInfo.bytenode) {
        bytenode.runBytecode(cheetContent)();
    } else {
        new Function('require', cheetContent.toString())(require);
    }
})();
