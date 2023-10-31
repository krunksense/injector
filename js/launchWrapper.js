"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = __importDefault(require("events"));
const original_fs_1 = require("original-fs");
const asar_1 = __importDefault(require("@electron/asar"));
const path_1 = require("path");
class LaunchWrapper extends events_1.default {
    constructor() {
        super();
    }
    discoverAppFolderOrASAR(appRoot) {
        return (0, original_fs_1.existsSync)((0, path_1.join)(appRoot, 'resources', 'app.asar')) ? (0, path_1.join)(appRoot, 'resources', 'app.asar') :
            (0, original_fs_1.existsSync)((0, path_1.join)(appRoot, 'resources', 'app')) ? (0, path_1.join)(appRoot, 'resources', 'app') :
                (0, original_fs_1.existsSync)((0, path_1.join)(appRoot, 'Contents', 'Resources', 'app.asar')) ? (0, path_1.join)(appRoot, 'Contents', 'Resources', 'app.asar') :
                    null;
    }
    async copyApp(appRoot, dest) {
        await new Promise((resolve, reject) => (0, original_fs_1.cp)(appRoot, dest, { recursive: true }, err => {
            if (err)
                return reject(err);
            resolve();
        }));
        let app = this.discoverAppFolderOrASAR(dest);
        if (!app)
            throw new Error('Invalid app root!');
        if (app.endsWith('.asar')) {
            asar_1.default.extractAll(app, app.replace('.asar', ''));
            (0, original_fs_1.rmSync)(app);
        }
    }
}
exports.default = new LaunchWrapper();
