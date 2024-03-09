"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = void 0;
const core = __importStar(require("@actions/core"));
const fs_1 = require("fs");
const constants_1 = require("./constants");
const path_1 = require("path");
const validateGitHubToken = (githubToken) => {
    if (!githubToken) {
        throw new Error(`'github-token' is not set. Please give API token.`);
    }
};
const validateImageDirPath = (path) => {
    if (!path) {
        throw new Error(`'image-directory-path' is not set. Please specify path to image directory.`);
    }
    try {
        const s = (0, fs_1.statSync)(path);
        if (s.isDirectory())
            return;
    }
    catch (_) {
        throw new Error(`'image-directory-path' is not directory. Please specify path to image directory.`);
    }
};
const getBoolInput = (name) => {
    const input = core.getInput(name);
    if (!input) {
        return false;
    }
    if (input !== 'true' && input !== 'false') {
        throw new Error(`'${name}' input must be boolean value 'true' or 'false' but got '${input}'`);
    }
    return input === 'true';
};
const getNumberInput = (name) => {
    const v = core.getInput(name);
    if (!v)
        return null;
    const n = Number(v);
    if (typeof n === 'number')
        return n;
    throw new Error(`'${name}' input must be number value but got '${n}'`);
};
const validateMatchingThreshold = (n) => {
    if (!(n >= 0 && n <= 1)) {
        throw new Error(`'matching-threshold' input must be 0 to 1 '${n}'`);
    }
};
const validateThresholdRate = (n) => {
    if (!(n >= 0 && n <= 1)) {
        throw new Error(`'threshold-rate' input must be 0 to 1 '${n}'`);
    }
};
const validateTargetHash = (h) => {
    if (!h)
        return;
    if (!/[0-9a-f]{5,40}/.test(h)) {
        throw new Error(`'target-hash' input must be commit hash but got '${h}'`);
    }
};
const validateCustomReportPage = (link) => {
    if (!link)
        return;
    if (!/^(?:http(s)?:\/\/)[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/.test(link)) {
        throw new Error(`'custom-report-page' input must be a valid url '${link}'`);
    }
};
const validateReportFilePath = (path) => {
    if (path === undefined || path === '') {
        return;
    }
    try {
        const s = (0, fs_1.statSync)((0, path_1.dirname)(path));
        if (s.isDirectory())
            return;
        else
            throw null;
    }
    catch (_) {
        throw new Error(`'report-file-path' is not in a valid directory. Please specify path to report file.`);
    }
};
function validateCommentReportFormat(format) {
    if (format !== 'raw' && format !== 'summarized') {
        throw new Error(`'comment-report-format' input must be 'raw' or 'summarized' but got '${format}'`);
    }
}
const getConfig = () => {
    var _a, _b, _c;
    const githubToken = core.getInput('github-token');
    const imageDirectoryPath = core.getInput('image-directory-path');
    validateGitHubToken(githubToken);
    validateImageDirPath(imageDirectoryPath);
    const matchingThreshold = (_a = getNumberInput('matching-threshold')) !== null && _a !== void 0 ? _a : 0;
    const thresholdRate = (_b = getNumberInput('threshold-rate')) !== null && _b !== void 0 ? _b : 0;
    const thresholdPixel = (_c = getNumberInput('threshold-pixel')) !== null && _c !== void 0 ? _c : 0;
    validateMatchingThreshold(matchingThreshold);
    validateThresholdRate(thresholdRate);
    const targetHash = core.getInput('target-hash') || null;
    validateTargetHash(targetHash);
    const artifactName = core.getInput('artifact-name') || constants_1.ARTIFACT_NAME;
    const branch = core.getInput('branch') || 'reg_actions';
    const customReportPage = core.getInput('custom-report-page') || null;
    validateCustomReportPage(customReportPage);
    const reportFilePath = core.getInput('report-file-path');
    validateReportFilePath(reportFilePath);
    const commentReportFormat = core.getInput('comment-report-format') || 'raw';
    validateCommentReportFormat(commentReportFormat);
    return {
        githubToken,
        imageDirectoryPath,
        enableAntialias: getBoolInput(core.getInput('enable-antialias')),
        matchingThreshold,
        thresholdRate,
        thresholdPixel,
        targetHash,
        artifactName,
        branch,
        disableBranch: getBoolInput(core.getInput('disable-branch')),
        customReportPage,
        reportFilePath,
        commentReportFormat,
    };
};
exports.getConfig = getConfig;
