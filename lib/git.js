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
exports.rebase = exports.push = exports.commit = exports.add = exports.checkout = exports.hasBranch = exports.fetchOrigin = exports.clone = exports.configureEmail = exports.configureName = exports.findTargetHash = void 0;
const exec_1 = require("@actions/exec");
const logger_1 = require("./logger");
const capture = (cmd, args, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    const res = {
        stdout: '',
        stderr: '',
        code: null,
    };
    try {
        const code = yield (0, exec_1.exec)(cmd, args, Object.assign(Object.assign({}, options), { listeners: {
                stdout(data) {
                    res.stdout += data.toString();
                },
                stderr(data) {
                    res.stderr += data.toString();
                },
            } }));
        res.code = code;
        return res;
    }
    catch (err) {
        const msg = `Command '${cmd}' failed with args '${args.join(' ')}': ${res.stderr}: ${err}`;
        logger_1.log.debug(`@actions/exec.exec() threw an error: ${msg}`);
        throw new Error(msg);
    }
});
const findTargetHash = (baseSha, headSha) => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.log.info(`base sha is ${baseSha}, head sha is ${headSha}`);
    yield capture('git', ['config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*']);
    yield capture('git', ['fetch', '--all']);
    const args = ['merge-base', '-a', `${baseSha}`, `${headSha}`];
    const res = yield capture('git', args);
    if (res.code !== 0) {
        throw new Error(`Command 'git ${args.join(' ')}' failed: ${JSON.stringify(res)}`);
    }
    const targetHash = res.stdout;
    return targetHash;
});
exports.findTargetHash = findTargetHash;
const configureName = (name) => __awaiter(void 0, void 0, void 0, function* () {
    yield capture('git', ['config', '--global', 'user.name', name]);
});
exports.configureName = configureName;
const configureEmail = (email) => __awaiter(void 0, void 0, void 0, function* () {
    yield capture('git', ['config', '--global', 'user.email', email]);
});
exports.configureEmail = configureEmail;
const clone = (input, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    return capture('git', ['clone', input.repo, input.dist], options);
});
exports.clone = clone;
const fetchOrigin = (input, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    return capture('git', ['fetch', '-u', 'origin', `${input.branch}:${input.branch}`], options);
});
exports.fetchOrigin = fetchOrigin;
const hasBranch = (branch, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield capture('git', ['branch', '--list', branch], options);
    return res.stdout.trim() !== '';
});
exports.hasBranch = hasBranch;
const checkout = (branch, orphan, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    const args = orphan ? ['checkout', '--orphan', branch] : ['checkout', branch];
    return capture('git', args, options);
});
exports.checkout = checkout;
const add = (options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    return capture('git', ['add', '-A', '.'], options);
});
exports.add = add;
const commit = (message, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    return capture('git', ['commit', '-m', message], options);
});
exports.commit = commit;
const push = (branch, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    return capture('git', ['push', 'origin', branch], options);
});
exports.push = push;
const rebase = (branch, options = {}) => __awaiter(void 0, void 0, void 0, function* () {
    return capture('git', ['rebase', `origin/${branch}`], options);
});
exports.rebase = rebase;
