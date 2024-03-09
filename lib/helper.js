"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.targetDir = void 0;
const targetDir = ({ runId, artifactName, date }) => `${date}_${runId}_${artifactName}`;
exports.targetDir = targetDir;
