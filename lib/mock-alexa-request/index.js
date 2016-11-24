"use strict";
var fs = require("fs");
var path = require("path");
var fixturePath;

function MockAlexaRequest(fPath) {
    if (fPath) {
        fixturePath = fPath
    }
    return this;
}

MockAlexaRequest.prototype.load = function (mockFile) {
    return JSON.parse(fs.readFileSync(fixturePath + "/" + mockFile, "utf8"));
};

module.exports = MockAlexaRequest;
