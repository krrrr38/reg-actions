"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRunAndArtifact = void 0;
const logger_1 = require("./logger");
const git_1 = require("./git");
const limitation = 200;
const findRunAndArtifact = ({ event, client, targetHash: inputTargetHash, artifactName, }) => __awaiter(void 0, void 0, void 0, function* () {
    let page = 0;
    while (true) {
        if (!event.pull_request) {
            return null;
        }
        try {
            logger_1.log.info(`start to fetch runs page = ${page}`);
            const runs = yield client.fetchRuns(page++);
            logger_1.log.info(`Succeeded to find ${runs.data.workflow_runs.length} runs`);
            // If target is passed to this function, use it.
            const targetHash = inputTargetHash !== null && inputTargetHash !== void 0 ? inputTargetHash : (yield (0, git_1.findTargetHash)(event.pull_request.base.sha, event.pull_request.head.sha));
            const targetHashShort = targetHash.slice(0, 7);
            logger_1.log.info(`targetHash = ${targetHash}`);
            for (const run of runs.data.workflow_runs.filter(run => run.head_sha.startsWith(targetHashShort))) {
                const res = yield client.fetchArtifacts(run.id);
                const { artifacts } = res.data;
                const found = artifacts.find(a => a.name === artifactName);
                if (found) {
                    return { run, artifact: found };
                }
            }
            if (runs.data.workflow_runs.length < 50) {
                logger_1.log.info('Failed to find target run', runs.data.workflow_runs.length);
                return null;
            }
            if (limitation <= page) {
                logger_1.log.info(`Failed to find target run, this is because page reached limitation`, limitation, page);
                return null;
            }
        }
        catch (e) {
            logger_1.log.error('Failed to find run', e);
            return null;
        }
    }
});
exports.findRunAndArtifact = findRunAndArtifact;
