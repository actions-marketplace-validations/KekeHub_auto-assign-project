import * as core from '@actions/core'
import {createAppAuth} from '@octokit/auth-app'
import {graphql} from '@octokit/graphql'

export interface AssignerConfig {
  app: {
    appId: string
    installationId: string
    privateKey: string
  }

  issueId: string
  owner: string
  projectId: number
  token: string
}

export class Assiger {
  #github

  constructor(private config: AssignerConfig) {
    if (
      config.app.appId &&
      config.app.installationId &&
      config.app.privateKey
    ) {
      core.info('Use GitHub App credentials for this integration')
      const auth = createAppAuth(config.app)

      this.#github = graphql.defaults({
        request: {
          hook: auth.hook
        }
      })
    } else {
      core.info('Use GitHub token for this integration')
      this.#github = graphql.defaults({
        headers: {
          authorization: `token ${config.token}`
        }
      })
    }
  }

  private async assignProject(
    project: string,
    contentId: string
  ): Promise<string> {
    const {addProjectNextItem} = await this.#github(
      `mutation ($project: ID!, $contentId: ID!) {
        addProjectNextItem(input: {projectId: $project, contentId: $contentId}){
          projectNextItem {
            id
          }
        }
    }`,
      {
        project,
        contentId
      }
    )

    return addProjectNextItem.projectNextItem.id
  }

  private async getOrganizationProjectId(
    owner: string,
    num: number
  ): Promise<string> {
    const {organization} = await this.#github(
      `query ($owner: String!, $number: Int!) {
        organization(login: $owner){
          projectNext(number: $number) {
            id
          }
        }
    }`,
      {
        owner,
        number: num
      }
    )

    const id = organization.projectNext.id
    return id
  }

  private async getUserProjectId(login: string, num: number): Promise<string> {
    const {user} = await this.#github(
      `query ($owner: String!, $number: Int!) {
        user(login: $login){
          projectNext(number: $number) {
            id
          }
        }
    }`,
      {
        login,
        number: num
      }
    )

    const id = user.projectNext.id
    return id
  }

  async run(): Promise<void> {
    let projectNodeId: string
    try {
      projectNodeId = await this.getOrganizationProjectId(
        this.config.owner,
        this.config.projectId
      )
      core.debug(
        `Found organization project ${projectNodeId}, skipping user project lookup`
      )
    } catch (e) {
      core.debug("Couldn't find organization project, looking for user project")
      projectNodeId = await this.getUserProjectId(
        this.config.owner,
        this.config.projectId
      )
    }

    const itemId = await this.assignProject(projectNodeId, this.config.issueId)
    core.setOutput('project-item-id', itemId)
  }
}
