import { error, getInput, info, setFailed, warning } from '@actions/core';
import { context, getOctokit } from '@actions/github';

// Template placeholders for README
let CONTRIBUTORS = '';

let UNIT_CODE = '';
let UNIT_NAME = '';
let UNIT_COORDINATOR = '';

let SEMESTER = '';
let YEAR = '';

let CONTENTS = '';
let WHICH_NOTES = '';

let COPYRIGHT = '';

async function run() {
    try {
        // Get client and context
        const client = getOctokit(getInput('GITHUB_TOKEN', { required: true }));

        let LectureNotes;
        let ExamNotes;
        let CodeOwners;

        let LN = true;
        let EN = true;

        // Look for lecture notes/exam notes files
        try {
            LectureNotes = await client.request(
                'GET /repos/{owner}/{repo}/contents/{path}',
                {
                    owner: context.actor,
                    repo: context.payload.repository!.name,
                    path: `${
                        context.payload.repository!.name
                    } Lecture Notes.tex`,
                    ref: context.sha,
                }
            );
        } catch (error: any) {
            LN = false;
            warning(
                `No lecture notes file was found. If this was unintended, please ensure that the file name has the following format:\n\t\`${
                    context.payload.repository!.name
                } Lecture Notes.tex\``
            );
        }

        try {
            ExamNotes = await client.request(
                'GET /repos/{owner}/{repo}/contents/{path}',
                {
                    owner: context.actor,
                    repo: context.payload.repository!.name,
                    path: `${context.payload.repository!.name} Exam Notes.tex`,
                    ref: context.sha,
                }
            );
        } catch (error: any) {
            EN = false;
            warning(
                `No exam notes file was found. If this was unintended, please ensure that the file name has the following format:\n\t\`${
                    context.payload.repository!.name
                } Exam Notes.tex\``
            );
        }

        // Try to get CODEOWNERS file
        try {
            CodeOwners = await client.request(
                'GET /repos/{owner}/{repo}/contents/{path}',
                {
                    owner: context.actor,
                    repo: context.payload.repository!.name,
                    path: `CODEOWNERS`,
                    ref: context.sha,
                }
            );
        } catch (error: any) {
            return error(`No CODEOWNERS file was provided in repository.`);
        }

        if (!LN && !EN) {
            return error('No source files were found, ending workflow.');
        }

        // Set variables for README template
        // UNIT_CODE
        UNIT_CODE = context.payload.repository!.name;

        // WHICH_NOTES
        if (LN && EN) {
            WHICH_NOTES = '**lecture notes** and **exam notes**';
        } else if (LN) {
            WHICH_NOTES = '**lecture notes**';
        } else if (EN) {
            WHICH_NOTES = '**exam notes**';
        }

        parseCODEOWNERS(CodeOwners.data.toString(), context.actor);

        // TODO Add alternative if only exam notes are provided.
        if (LectureNotes == undefined)
            return error('Lecture notes returned undefined.');

        let buffer = new Buffer(LectureNotes.data.toString());

        parseLectureNotesContents(buffer.toString('base64'));

        console.log('UNIT_CODE:', UNIT_CODE);
        console.log('UNIT_NAME:', UNIT_NAME);
        console.log('UNIT_COORDINATOR:', UNIT_COORDINATOR);
        console.log('SEMESTER:', SEMESTER);
        console.log('YEAR:', YEAR);
        console.log('CONTRIBUTORS:', CONTRIBUTORS);
        console.log('WHICH_NOTES:', WHICH_NOTES);
        console.log('CONTENTS:', CONTENTS);
        console.log('COPYRIGHT:', COPYRIGHT);

        let output = `# ${UNIT_CODE} - ${UNIT_NAME}

## ${UNIT_COORDINATOR}

### Semester ${SEMESTER}, ${YEAR}

${CONTRIBUTORS}---

This repository provides ${WHICH_NOTES} for **${UNIT_CODE} - ${UNIT_NAME}**.

${CONTENTS}---

${COPYRIGHT}`;

        console.log('---');
        console.log(output);
        console.log('---');

        let README;

        let buffer2 = new Buffer(output)

        try {
            README = await client.request(
                'PUT /repos/{owner}/{repo}/contents/{path}',
                {
                    owner: context.actor,
                    repo: context.payload.repository!.name,
                    path: 'README.md',
                    message: 'Automated README CI.',
                    content: buffer2.toString('base64')
                }
            );
        } catch (error: any) {
            return setFailed(error.message);
        }

        if (README.status == 200) {
            return info('Successfully updated README.md.');
        } else if (README.status == 201) {
            return info('Successfully created README.md.');
        }
    } catch (error: any) {
        return setFailed(error.message);
    }
}

function parseCODEOWNERS(s: string, owner: string) {
    const lines = s.split(/\r?\n/);
    let usernames = new Set<string>([]);

    lines.forEach((v) => {
        v = v.trim();

        // Skip if comment
        if (v.startsWith('%')) {
            return;
        }

        let ignoreComments = v.split('#')[0];

        let temp_usernames = ignoreComments.match(
            /\@([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38})/gi
        );
        if (temp_usernames == null) return;

        temp_usernames.forEach((u) => {
            usernames.add(u.slice(1));
        });
    });

    usernames.delete(owner);
    const usernamesArray = [...usernames];

    if (usernamesArray.length > 1) {
        let usernamesText = '';

        usernamesArray.forEach((u, i) => {
            if (i == usernamesArray.length - 1) {
                usernamesText += `and ${u}(https://github.com/${u})`;
            } else {
                if (usernamesArray.length == 2) {
                    usernamesText += `${u}(https://github.com/${u}) `;
                } else {
                    usernamesText += `${u}(https://github.com/${u}), `;
                }
            }
        });

        CONTRIBUTORS = `Thanks to ${usernamesText} for the collaboration.\n\n`;
    } else if (usernames.size == 1) {
        CONTRIBUTORS = `Thanks to ${usernamesArray[0]}(https://github.com/${usernamesArray[0]}) for the collaboration.\n\n`;
    } else {
        CONTRIBUTORS = '';
    }
}

export function parseLectureNotesContents(s: string) {
    const lines = s.split(/\r?\n/);

    let copyrightVersion = '';
    let copyrightModifier = '';
    let sections = new Array<string>();

    lines.forEach((v) => {
        v = v.trim();

        // Skip if comment
        if (v.startsWith('%')) {
            return;
        }

        // Find other macros
        if (v.startsWith('\\newcommand{\\unitName}')) {
            UNIT_NAME = v.slice(23).split('}')[0];
            // console.log('UNIT_NAME:', UNIT_NAME);
        } else if (v.startsWith('\\newcommand{\\unitTime}')) {
            let time = v.slice(23).split('}')[0];
            SEMESTER = time[9];
            YEAR = time.slice(12);
            // console.log('SEMESTER:', SEMESTER);
            // console.log('YEAR:', YEAR);
        } else if (v.startsWith('\\newcommand{\\unitCoordinator}')) {
            UNIT_COORDINATOR = v.slice(30).split('}')[0];
            // console.log('UNIT_COORDINATOR:', UNIT_COORDINATOR);
        } else if (v.startsWith('modifier={')) {
            copyrightModifier = v.slice(10).split('}')[0];
            // console.log('copyrightModifier:', copyrightModifier);
        } else if (v.startsWith('version={')) {
            copyrightVersion = v.slice(9).split('}')[0];
            // console.log('copyrightVersion:', copyrightVersion);
        } else if (v.startsWith('\\section{')) {
            sections.push(v.slice(9).split('}')[0]);
            // console.log('SECTIONS:', v.slice(9).split("}")[0]);
        }
    });

    if (copyrightModifier != '' && copyrightVersion != '') {
        COPYRIGHT = setCopyrightInformation(
            copyrightModifier,
            copyrightVersion
        );
    } else if (copyrightModifier != '' && copyrightVersion == '') {
        COPYRIGHT = setCopyrightInformation(copyrightModifier, '4.0');
    } else if (copyrightModifier == '' && copyrightVersion != '') {
        warning('No copyright modifier was set.');
        COPYRIGHT = '';
    } else {
        warning('No copyright license was set.');
        COPYRIGHT = '';
    }

    if (sections.length > 0) {
        CONTENTS = formatContents(sections);
    } else {
        CONTENTS = '';
    }
}

function formatContents(sections: Array<string>): string {
    let output =
        '*The contents of the lecture notes are described below.*\n\n---\n\n## Contents\n\n';

    sections.forEach((s, i) => {
        output += `${i + 1}. ${s}\n`;
    });

    output += '\n';

    return output;
}

function setCopyrightInformation(
    copyrightModifier: string,
    copyrightVersion: string
): string {
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
