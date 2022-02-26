import { error, getInput, setFailed, warning } from '@actions/core';
import { context, getOctokit } from '@actions/github';
let AUTHORS;
let UNIT_CODE;
let UNIT_NAME;
let UNIT_COORDINATOR;
let SEMESTER;
let YEAR;
let CONTENTS;
let WHICH_NOTES;
let COPYRIGHT;
const README_TEMPLATE = `# UNIT_CODE - UNIT_NAME

## UNIT_COORDINATOR

### Semester SEMESTER, YEAR

---

This repository provides WHICH_NOTES for **UNIT_CODE - UNIT_NAME**.

*The contents of the lecture notes are described below.*

---

## Contents

---

![Copyright](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)

This work is licensed under a [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-nc-sa/4.0/).
`;
async function run() {
    try {
        // Get client and context
        const client = getOctokit(getInput('GITHUB_TOKEN', { required: true }));
        // Look for lecture notes/exam notes files
        const LectureNotes = await client.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: context.actor,
            repo: context.payload.repository.name,
            path: `${context.payload.repository.name} Lecture Notes.tex`,
            ref: context.sha
        });
        const ExamNotes = await client.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner: context.actor,
            repo: context.payload.repository.name,
            path: `${context.payload.repository.name} Exam Notes.tex`,
            ref: context.sha
        });
        let LN = true;
        let EN = true;
        if (LectureNotes.status != 200) {
            LN = false;
            warning(`No lecture notes file was found. If this was unintended, please ensure that the file name has the following format:\n\t\`${context.payload.repository.name} Lecture Notes.tex\``);
        }
        if (ExamNotes.status != 200) {
            EN = false;
            warning(`No exam notes file was found. If this was unintended, please ensure that the file name has the following format:\n\t\`${context.payload.repository.name} Exam Notes.tex\``);
        }
        if (!LN && !EN) {
            error('No source files were found, ending workflow.');
            return;
        }
        // Set variables for README template
        // UNIT_CODE
        UNIT_CODE = context.payload.repository.name;
        // UNIT_NAME
        UNIT_NAME = context.payload.repository.name;
        // WHICH_NOTES
        if (LN && EN) {
            WHICH_NOTES = 'lecture notes and exam notes';
        }
        else if (LN) {
            WHICH_NOTES = 'lecture notes';
        }
        else if (EN) {
            WHICH_NOTES = 'exam notes';
        }
        // TODO Add alternative if only exam notes are provided.
        parseLectureNotesContents(LectureNotes.data.toString());
        return;
    }
    catch (error) {
        setFailed(error.message);
        return;
    }
}
function parseLectureNotesContents(s) {
    const lines = s.split(/\r?\n/);
    let copyrightVersion = '';
    let copyrightModifier = '';
    lines.forEach((v) => {
        v = v.trim();
        // Skip if comment
        if (v.startsWith('%')) {
            return;
        }
        // Find other macros
        if (v.startsWith('\\newcommand{\\unitName}')) {
            UNIT_NAME = v.slice(23).split('}')[0];
        }
        else if (v.startsWith('\\newcommand{\\unitTime}')) {
            let time = v.slice(23).split('}')[0];
            SEMESTER = parseInt(time[9]);
            YEAR = parseInt(time.slice(12));
        }
        else if (v.startsWith('\\newcommand{\\unitCoordinator}')) {
            UNIT_COORDINATOR = v.slice(30).split('}')[0];
        }
        else if (v.startsWith('modifier={')) {
            copyrightModifier = v.slice(10).split('}')[0];
        }
        else if (v.startsWith('version={')) {
            copyrightVersion = v.slice(9).split('}')[0];
        }
        else if (v.startsWith('\\section{')) {
        }
    });
    if (copyrightModifier && copyrightVersion) {
        COPYRIGHT = setCopyrightInformation(copyrightModifier, copyrightVersion);
    }
    else if (copyrightModifier && !copyrightVersion) {
        COPYRIGHT = setCopyrightInformation(copyrightModifier, '4.0');
    }
    else if (!copyrightModifier && copyrightVersion) {
        warning('No copyright modifier was set.');
        COPYRIGHT = '';
    }
    else {
        warning('No copyright license was set.');
        COPYRIGHT = '';
    }
}
function getAuthors() {
    return '';
}
function getSections(sections) {
    return '';
}
function setCopyrightInformation(copyrightModifier, copyrightVersion) {
    copyrightModifier = copyrightModifier.toLowerCase();
    let modifierText = '';
    let versionText = '';
    let iconURL = `https://licensebuttons.net/l/${copyrightModifier}/${copyrightVersion}/88x31.png`;
    let licenseURL = `http://creativecommons.org/licenses/${copyrightModifier}/${copyrightVersion}/`;
    switch (copyrightVersion) {
        case '1.0':
            versionText = '1.0 Generic';
        case '2.0':
            versionText = '2.0 Generic';
        case '3.0':
            versionText = '3.0 Unported';
        case '4.0':
            versionText = '4.0 International';
    }
    switch (copyrightModifier) {
        case 'by':
            modifierText = 'Attribution';
        case 'by-nd':
            modifierText = 'Attribution-NoDerivatives';
        case 'by-nc':
            modifierText = 'Attribution-NonCommercial';
        case 'by-nc-nd':
            modifierText = 'Attribution-NonCommercial-NoDerivatives';
        case 'by-nc-sa':
            modifierText = 'Attribution-NonCommercial-ShareAlike';
        case 'by-sa':
            modifierText = 'Attribution-ShareAlike';
    }
    return `\n---\n\n![Copyright](${iconURL})\n\nThis work is licensed under a [${modifierText} ${versionText} License](${licenseURL}).`;
}
run();
