'use strict';

import fs = require('fs');
import path = require('path');
import vscode = require('vscode');

var binPathCache: { [bin: string]: string; } = {}

export function getBinPath(binname: string) {
    binname = correctBinname(binname);
    binname = vscode.workspace.getConfiguration('clang-format').get<string>("executable");
    if (fs.existsSync(binname)) {
        binPathCache[binname] = binname;
        return binname;
    }
    if (binPathCache[binname]) return binPathCache[binname];

    if (process.env["PATH"]) {
        var pathparts = process.env["PATH"].split(path.delimiter);
        for (var i = 0; i < pathparts.length; i++) {
            let binpath = path.join(pathparts[i], binname);
            if (fs.existsSync(binpath)) {
                binPathCache[binname] = binpath;
                return binpath;
            }
        }
    }

    // Else return the binary name directly (this will likely always fail downstream) 
    binPathCache[binname] = binname;
    return binname;
}

function correctBinname(binname: string) {
    if (process.platform === 'win32')
        return binname + ".exe";
    else
        return binname
}