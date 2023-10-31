import EventEmitter from 'events';
import { cp, existsSync, rmSync } from 'original-fs';
import asar from '@electron/asar';
import { join } from 'path';

class LaunchWrapper extends EventEmitter {
    constructor() {
        super();
    }

    public discoverAppFolderOrASAR(appRoot: string) {
        return existsSync(join(appRoot, 'resources', 'app.asar')) ? join(appRoot, 'resources', 'app.asar') :
        existsSync(join(appRoot, 'resources', 'app')) ? join(appRoot, 'resources', 'app') :
        existsSync(join(appRoot, 'Contents', 'Resources', 'app.asar')) ? join(appRoot, 'Contents', 'Resources', 'app.asar') :
        null;
    }

    public async copyApp(appRoot: string, dest: string) {
        await new Promise<void>((resolve, reject) => cp(appRoot, dest, { recursive: true }, err => {
            if(err) return reject(err);
            resolve();
        }));

        let app = this.discoverAppFolderOrASAR(dest);
        if(!app) throw new Error('Invalid app root!');

        if(app.endsWith('.asar')) {
            asar.extractAll(app, app.replace('.asar', ''));
            rmSync(app);
        }
    }
}

export default new LaunchWrapper();