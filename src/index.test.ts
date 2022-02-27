import { parseLectureNotesContents } from './index';

import fs from 'fs';
import path from 'path';

test('Example test.', () => {
    const file = path.join(__dirname, "../", "test-readme-actions Lecture Notes.tex");
    const s = fs.readFileSync(file, "utf8");
    
    parseLectureNotesContents(s);
});
