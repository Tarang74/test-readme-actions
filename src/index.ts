import * as core from '@actions/core';
import * as github from '@actions/github';
import * as octokit from '@octokit/core';

const README_TEMPLATE = `
# UNIT_CODE - UNIT_NAME

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
`

async function run() {
    try {
        // Get client and context
        const client = github.getOctokit(
            core.getInput('GITHUB_TOKEN', { required: true })
        );
        const context = github.context;

        const LectureNotes = await client.request('GET /repos/{owner}/{repo}/contents/{path}',
        {
            owner: context.actor,
            repo: context.payload.repository!.name,
            path: `${context.payload.repository!.name} Lecture Notes.tex`,
            ref: context.sha
        });

        console.log(LectureNotes);

        return;

    } catch (error: any) {
        core.setFailed(error.message);
        return;
    }
}

run();