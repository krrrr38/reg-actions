"use strict";
// This file is based on https://github.com/s0/git-publish-subdir-action
// MIT License
//
// Copyright (c) 2018 Sam Lanning
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushImages = void 0;
const fast_glob_1 = require("fast-glob");
const fs_1 = require("fs");
const os_1 = require("os");
const path = __importStar(require("path"));
const cpy_1 = __importDefault(require("cpy"));
const io_1 = require("@actions/io");
const git_1 = require("./git");
const logger_1 = require("./logger");
const path_1 = require("./path");
const constants = __importStar(require("./constants"));
const exponential_backoff_1 = require("exponential-backoff");
const genConfig = (input) => {
    const { branch, env } = input;
    // Determine the type of URL
    if (!input.githubToken)
        throw new Error('GITHUB_TOKEN must be specified when REPO == self');
    if (!env.GITHUB_REPOSITORY)
        throw new Error('GITHUB_REPOSITORY must be specified when REPO == self');
    const url = `https://x-access-token:${input.githubToken}@github.com/${env.GITHUB_REPOSITORY}.git`;
    const config = {
        repo: url,
        branch,
    };
    return config;
};
const copyImages = (result, temp, dest) => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.log.info(`Copying all files`);
    if (result.deletedItems.length > 0) {
        logger_1.log.info(`Copying deleted files`);
        const deleted = result.deletedItems.map(item => `${path.join((0, path_1.workspace)(), constants.EXPECTED_DIR_NAME)}/${item}`);
        yield (0, cpy_1.default)(deleted, `${temp}/${dest}/expected/`);
    }
    if (result.newItems.length > 0) {
        logger_1.log.info(`Copying new files`);
        const newGlobs = result.newItems.map(item => `${path.join((0, path_1.workspace)(), constants.ACTUAL_DIR_NAME)}/${item}`);
        yield (0, cpy_1.default)(newGlobs, `${temp}/${dest}/actual/`);
    }
    if (result.failedItems.length > 0) {
        const failedGlobs = result.failedItems.map(item => `${path.join((0, path_1.workspace)(), constants.DIFF_DIR_NAME)}/${item}`);
        yield (0, cpy_1.default)(failedGlobs, `${temp}/${dest}/diff/`);
        const expectedGlobs = result.failedItems.map(item => `${path.join((0, path_1.workspace)(), constants.EXPECTED_DIR_NAME)}/${item}`);
        yield (0, cpy_1.default)(expectedGlobs, `${temp}/${dest}/expected/`);
        const actualGlobs = result.failedItems.map(item => `${path.join((0, path_1.workspace)(), constants.ACTUAL_DIR_NAME)}/${item}`);
        yield (0, cpy_1.default)(actualGlobs, `${temp}/${dest}/actual/`);
    }
    return;
});
const pushImages = (input) => __awaiter(void 0, void 0, void 0, function* () {
    var e_1, _a;
    var _b, _c, _d, _e, _f;
    const { env } = input;
    const config = genConfig(input);
    const TMP_PATH = yield fs_1.promises.mkdtemp(path.join((0, os_1.tmpdir)(), 'reg-actions-'));
    const REPO_TEMP = path.join(TMP_PATH, 'repo');
    if (!env.GITHUB_EVENT_PATH)
        throw new Error('Expected GITHUB_EVENT_PATH');
    const event = JSON.parse((yield fs_1.promises.readFile(env.GITHUB_EVENT_PATH)).toString());
    const name = /* input.commitName ?? */ (_d = (_c = (_b = event.pusher) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : env.GITHUB_ACTOR) !== null && _d !== void 0 ? _d : 'Git Publish Subdirectory';
    const email = 
    // input.commitEmail ??
    (_f = (_e = event.pusher) === null || _e === void 0 ? void 0 : _e.email) !== null && _f !== void 0 ? _f : (env.GITHUB_ACTOR ? `${env.GITHUB_ACTOR}@users.noreply.github.com` : 'nobody@nowhere');
    // Set Git Config
    yield (0, git_1.configureName)(name);
    yield (0, git_1.configureEmail)(email);
    // Environment to pass to children
    const execEnv = env;
    // Clone the target repo
    yield (0, git_1.clone)({ repo: config.repo, dist: REPO_TEMP }, { env: execEnv });
    const execOptions = { env: execEnv, cwd: REPO_TEMP };
    // Fetch branch if it exists
    yield (0, git_1.fetchOrigin)({ branch: config.branch }, execOptions).catch(err => {
        const s = err.toString();
        if (s.indexOf("Couldn't find remote ref") === -1) {
            logger_1.log.warn("Failed to fetch target branch, probably doesn't exist");
            logger_1.log.error(err);
        }
    });
    // Check if branch already exists
    logger_1.log.info(`Checking if branch ${config.branch} exists already`);
    const branchExist = yield (0, git_1.hasBranch)(config.branch, execOptions);
    if (!branchExist) {
        // Branch does not exist yet, let's check it out as an orphan
        logger_1.log.info(`${config.branch} does not exist, creating as orphan`);
        yield (0, git_1.checkout)(config.branch, true, execOptions);
    }
    else {
        yield (0, git_1.checkout)(config.branch, false, execOptions);
    }
    // Update contents of branch
    logger_1.log.info(`Updating branch ${config.branch}`);
    /**
     * The list of globs we'll use for clearing
     */
    if (!branchExist) {
        const globs = ['**/*', '!.git'];
        logger_1.log.info(`Removing all files from target branch`);
        const filesToDelete = (0, fast_glob_1.stream)(globs, { absolute: true, dot: true, followSymbolicLinks: false, cwd: REPO_TEMP });
        logger_1.log.info(filesToDelete);
        try {
            // Delete all files from the filestream
            for (var filesToDelete_1 = __asyncValues(filesToDelete), filesToDelete_1_1; filesToDelete_1_1 = yield filesToDelete_1.next(), !filesToDelete_1_1.done;) {
                const entry = filesToDelete_1_1.value;
                yield fs_1.promises.unlink(entry);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (filesToDelete_1_1 && !filesToDelete_1_1.done && (_a = filesToDelete_1.return)) yield _a.call(filesToDelete_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    const destDir = input.targetDir;
    // Make sure the destination sourceDir exists
    yield (0, io_1.mkdirP)(path.resolve(REPO_TEMP, destDir));
    yield copyImages(input.result, REPO_TEMP, destDir);
    yield (0, git_1.add)(execOptions);
    const message = `Update ${input.branch} to output generated at runId:${input.runId}`;
    yield (0, git_1.commit)(message, execOptions);
    logger_1.log.info(`Pushing`);
    (() => __awaiter(void 0, void 0, void 0, function* () {
        return (0, exponential_backoff_1.backOff)(() => __awaiter(void 0, void 0, void 0, function* () {
            if (branchExist) {
                yield (0, git_1.rebase)(config.branch, execOptions);
            }
            const res = yield (0, git_1.push)(config.branch, execOptions);
            logger_1.log.info(res.stdout);
            logger_1.log.info(`Deployment Successful`);
        }), { numOfAttempts: 5 });
    }))();
});
exports.pushImages = pushImages;
