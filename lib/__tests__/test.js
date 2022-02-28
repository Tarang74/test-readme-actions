"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
test('Example test.', () => {
    const file = path_1.default.join(__dirname, "../", "test-readme-actions Lecture Notes.tex");
    const s = fs_1.default.readFileSync(file, "utf8");
    (0, index_1.parseLectureNotesContents)(s);
});
