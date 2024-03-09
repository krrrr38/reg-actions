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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const cpy_1 = __importDefault(require("cpy"));
const glob_1 = require("glob");
const make_dir_1 = __importDefault(require("make-dir"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const logger_1 = require("./logger");
const run_1 = require("./run");
const compare_1 = require("./compare");
const comment_1 = require("./comment");
const constants = __importStar(require("./constants"));
const path_1 = require("./path");
const push_1 = require("./push");
const helper_1 = require("./helper");
// Download expected images from target artifact.
const downloadExpectedImages = (client, latestArtifactId) => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.log.info(`Start to download expected images, artifact id = ${latestArtifactId}`);
    try {
        const zip = yield client.downloadArtifact(latestArtifactId);
        yield Promise.all(new adm_zip_1.default(Buffer.from(zip.data))
            .getEntries()
            .filter(f => !f.isDirectory && f.entryName.startsWith(constants.ACTUAL_DIR_NAME))
            .map((file) => __awaiter(void 0, void 0, void 0, function* () {
            const f = path.join((0, path_1.workspace)(), file.entryName.replace(constants.ACTUAL_DIR_NAME, constants.EXPECTED_DIR_NAME));
            yield (0, make_dir_1.default)(path.dirname(f));
            yield fs.promises.writeFile(f, file.getData());
        }))).catch(e => {
            logger_1.log.error('Failed to extract images.', e);
            throw e;
        });
    }
    catch (e) {
        if (e.message === 'Artifact has expired') {
            logger_1.log.error('Failed to download expected images. Because expected artifact has already expired.');
            return;
        }
        logger_1.log.error(`Failed to download artifact ${e}`);
    }
});
const copyActualImages = (imagePath) => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.log.info(`Start copyImage from ${imagePath}`);
    try {
        yield (0, cpy_1.default)(path.join(imagePath, `**/*.{png,jpg,jpeg,tiff,bmp,gif}`), path.join((0, path_1.workspace)(), constants.ACTUAL_DIR_NAME));
    }
    catch (e) {
        logger_1.log.error(`Failed to copy images ${e}`);
    }
});
// Compare images and upload result.
const compareAndUpload = (client, config) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield (0, compare_1.compare)(config);
    logger_1.log.debug('compare result', result);
    const files = (0, glob_1.sync)(path.join((0, path_1.workspace)(), '**/*'));
    logger_1.log.info('Start upload artifact');
    try {
        yield client.uploadArtifact(files, config.artifactName);
    }
    catch (e) {
        logger_1.log.error(e);
        throw new Error('Failed to upload artifact');
    }
    logger_1.log.info('Succeeded to upload artifact');
    return result;
});
const init = (config) => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.log.info(`start initialization.`);
    // Create workspace
    yield (0, make_dir_1.default)((0, path_1.workspace)());
    logger_1.log.info(`Succeeded to cerate directory.`);
    // Copy actual images
    yield copyActualImages(config.imageDirectoryPath);
    logger_1.log.info(`Succeeded to initialization.`);
});
const run = ({ event, runId, sha, client, date, config, }) => __awaiter(void 0, void 0, void 0, function* () {
    // Setup directory for artifact and copy images.
    yield init(config);
    // If event is not pull request, upload images then finish actions.
    // This data is used as expected data for the next time.
    if (typeof event.number === 'undefined') {
        logger_1.log.info(`event number is not detected.`);
        yield compareAndUpload(client, config);
        return;
    }
    logger_1.log.info(`start to find run and artifact.`);
    // Find current run and target run and artifact.
    const runAndArtifact = yield (0, run_1.findRunAndArtifact)({
        event,
        client,
        targetHash: config.targetHash,
        artifactName: config.artifactName,
    });
    // If target artifact is not found, upload images.
    if (!runAndArtifact || !runAndArtifact.run || !runAndArtifact.artifact) {
        logger_1.log.warn('Failed to find current or target runs');
        const result = yield compareAndUpload(client, config);
        // If we have current run, add comment to PR.
        if (runId) {
            const comment = (0, comment_1.createCommentWithoutTarget)({
                event,
                runId,
                result,
                artifactName: config.artifactName,
                customReportPage: config.customReportPage,
            });
            yield client.postComment(event.number, comment);
        }
        return;
    }
    const { run: targetRun, artifact } = runAndArtifact;
    // Download and copy expected images to workspace.
    yield downloadExpectedImages(client, artifact.id);
    const result = yield compareAndUpload(client, config);
    logger_1.log.info(result);
    // If changed, upload images to specified branch.
    if (!config.disableBranch) {
        if (result.deletedItems.length !== 0 || result.failedItems.length !== 0 || result.newItems.length !== 0) {
            yield (0, push_1.pushImages)({
                githubToken: config.githubToken,
                runId,
                result,
                branch: config.branch,
                targetDir: (0, helper_1.targetDir)({ runId, artifactName: config.artifactName, date }),
                env: process.env,
                // commitName: undefined,
                // commitEmail: undefined,
            });
        }
    }
    const comment = (0, comment_1.createCommentWithTarget)({
        event,
        runId,
        sha,
        targetRun,
        date,
        result,
        artifactName: config.artifactName,
        regBranch: config.branch,
        customReportPage: config.customReportPage,
        disableBranch: config.disableBranch,
        commentReportFormat: config.commentReportFormat,
    });
    yield client.postComment(event.number, comment);
    logger_1.log.info('post summary comment');
    yield client.summary(comment);
});
exports.run = run;
