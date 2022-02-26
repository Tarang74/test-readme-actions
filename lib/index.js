import * as core from '@actions/core';
import * as github from '@actions/github';
async function run() {
    try {
        // Get client and context
        const client = github.getOctokit(core.getInput('repoToken', { required: true }));
        const context = github.context;
        console.log('Client: ', client);
        console.log('Context: ', context);
        return;
    }
    catch (error) {
        core.setFailed(error.message);
        return;
    }
}
run();
