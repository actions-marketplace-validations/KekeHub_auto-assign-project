import * as core from '@actions/core'
import {Assiger, AssignerConfig} from './assigner'

async function run(): Promise<void> {
  try {
    const config: AssignerConfig = {
      app: {
        appId: core.getInput('app-integration-id') || '',
        installationId: core.getInput('app-installation-id') || '',
        privateKey: core.getInput('app-private-key') || ''
      },
      issueId: core.getInput('issue-id'),
      owner: core.getInput('owner', {required: true}),
      projectId: parseInt(core.getInput('project-id', {required: true}), 10),
      token: core.getInput('token', {required: true})
    }

    const assigner = new Assiger(config)
    await assigner.run()
  } catch (err: any) {
    core.setFailed(err.message)
    core.debug(err.stack)
  }
}

run()
