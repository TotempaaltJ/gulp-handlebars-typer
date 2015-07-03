'use strict';
var through = require('through2');
var gutil = require('gulp-util');
var path = require('path');
var File = gutil.File;

var PLUGIN_NAME = 'gulp-hbstypingsFile';
var re = /module\.exports((?:\["[a-zA-Z0-9._ -]+"\])+) = (\w+)/gi;
var partRe = /\["([a-zA-Z0-9._ -]+)"\]/gi;

String.prototype.repeat = function(count) {
    if (count < 1) return '';
    var result = '', pattern = this.valueOf();
    while (count > 1) {
            if (count & 1) result += pattern;
            count >>= 1, pattern += pattern;
        }
    return result + pattern;
};

module.exports = function(fileName, opts) {
    opts = opts || {};
    var typingsFile;

    return through.obj(function(file, enc, callback) {
        if (file.isNull()) {
            return callback(null, file);
        }

        if (file.isStream()) {
            this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
            return callback();
        }

        var contents = file.contents.toString();

        var struct = {};

        var match;
        while((match = re.exec(contents)) !== null) {
            var type = match[2];

            var hierarchy = [];
            var part;
            while((part = partRe.exec(match[1])) !== null) {
                hierarchy.push(part[1]);
            }

            if(type === 'module\.exports') {
                continue;
            }

            for(var n = 0; n < hierarchy.length; n++) {
                var tmp = struct;

                for(var i = 0; i <= n; i++) {
                    var part = hierarchy[i];

                    if(typeof tmp[part] !== 'undefined' && hierarchy.length > n + 1) {
                        tmp[part] = {'()': true};
                    }
                    tmp[part] = tmp[part] || {};

                    var tmp = tmp[part];
                }
            }
        }

        var recurse = function(rest, level) {
            var indent = '    '.repeat(level);
            var mod = '';

            for(var item of Object.keys(rest)) {
                if(item == '()') {
                    mod += indent + item + ': Template;' + '\n';
                } else if(!Object.keys(rest[item]).length) {
                    mod += indent + item + ': Template;' + '\n';
                } else {
                    mod += indent + item + ': {' + '\n';
                    mod += recurse(rest[item], level + 1) + '\n';
                    mod += indent + '}' + '\n';
                }
            }
            return mod;
        };
        var out = 'interface Template {\n    (data?: any): string,\n}\n\n' +
                  'interface HbsHierarchy {\n' + recurse(struct, 1)+ '\n}\n\n' +
                  'declare module "hbs.js" {\n' +
                  '    export var hbs: HbsHierarchy;\n' +
                  '    export default hbs;\n' +
                  '}';

        if (typeof fileName === 'string') {
            typingsFile = file.clone({contents: false});
            typingsFile.path = path.join(file.base, fileName);
        } else {
            typingsFile = new File(fileName);
        }
        typingsFile.contents = new Buffer(out);

        callback();
    }, function(callback) {
        this.push(typingsFile);
        callback();
    });
}
