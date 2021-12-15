#!groovy

// `color` can be a color code or one of "good", "warning" or "danger".
// See https://www.jenkins.io/doc/pipeline/steps/slack/.
def postSlack(color, message) {
    slackSend channel: "#eng-ci", color: color, message: message
    if (color != "good") {
      // Post failures to #eng-frontend for added visibility.
      slackSend channel: "#eng-frontend", color: color, message: message
    }
}

// Enable concurrent builds of this project to be throttled using the
// throttle-concurrents Jenkins plugin (https://plugins.jenkins.io/throttle-concurrents)

throttle(['client']) {
node {
    checkout scm

    workspace = pwd()

    // Tag used when deploying to NPM.
    npmTag = "latest"

    // Git branch which releases are deployed from.
    releaseFromBranch = "master"

    // S3 bucket where the embedded client is served from.
    s3Bucket = "cdn.hypothes.is"

    // URL where the embedded client will be served from.
    cdnURL = "https://${s3Bucket}/hypothesis"

    // Pre-release suffix added to new package version number when deploying,
    // eg. "testing".
    //
    // If this is empty, the new deployed version will become the live version.
    //
    // Note that once an npm package has been published with a given version,
    // it is *not* possible to overwrite that version in future (eg. you cannot
    // publish "v1.1-testing" twice).
    versionSuffix = ""

    if (versionSuffix != "") {
        npmTag = "prerelease"
    }

    lastCommitHash = sh (
      script: 'git show HEAD --no-patch --format="%h"',
      returnStdout: true
    ).trim()

    pkgName = sh (
      script: 'cat package.json | jq -r .name',
      returnStdout: true
    ).trim()

    // Update local information about tags to match the remote,
    // including removing any local tags that no longer exist.
    //
    // The `--prune-tags` option is not supported in Git 2.11 so we
    // use the workaround from https://github.com/git/git/commit/97716d217c1ea00adfc64e4f6bb85c1236d661ff
    sh "git fetch --quiet --prune origin 'refs/tags/*:refs/tags/*' "

    // Determine version number for next release.
    pkgVersion = sh (
      script: 'git tag --list | sort --version-sort --reverse | head -n1 | tail -c +2',
      returnStdout: true
    ).trim()
    newPkgVersion = bumpMinorVersion(pkgVersion)
    if (versionSuffix != "") {
        newPkgVersion = newPkgVersion + "-" + versionSuffix
    }
    echo "Building and testing ${newPkgVersion}"

    sh "docker build -t hypothesis-client-tests ."
    nodeEnv = docker.image("hypothesis-client-tests")

    stage('Setup') {
      nodeEnv.inside("-e HOME=${workspace}") {
        sh "yarn install"
      }
    }

    stage('Test') {
        nodeEnv.inside("-e HOME=${workspace}") {
            withCredentials([
                string(credentialsId: 'codecov-token', variable: 'CODECOV_TOKEN')
            ]) {
              sh "make checkformatting lint test"
              sh """
              export CODECOV_TOKEN=${env.CODECOV_TOKEN}
              yarn run report-coverage
              """
            }
        }
    }

    if (env.BRANCH_NAME != releaseFromBranch) {
        echo "Skipping QA deployment because ${env.BRANCH_NAME} is not the ${releaseFromBranch} branch"
        return
    }

    milestone()

    stage('Publish to QA') {
        postSlack 'good', "Starting QA deployment of ${lastCommitHash}"

        try {
            qaVersion = pkgVersion + "-${lastCommitHash}"
            nodeEnv.inside("-e HOME=${workspace}") {
                withCredentials([
                    string(credentialsId: 'npm-token', variable: 'NPM_TOKEN'),
                    string(credentialsId: 'sentry-token', variable: 'SENTRY_AUTH_TOKEN'),
                    usernamePassword(credentialsId: 'github-jenkins-user',
                                     passwordVariable: 'GITHUB_TOKEN_NOT_USED',
                                     usernameVariable: 'GITHUB_USERNAME'),
                    [$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 's3-cdn']
                    ]) {
                    sh """
                    git config --replace-all user.email ${env.GITHUB_USERNAME}@hypothes.is
                    git config --replace-all user.name ${env.GITHUB_USERNAME}
                    """

                    // Build a prerelease version of the client, configured to load
                    // the sidebar from the qa h deployment.
                    sh """
                    export SIDEBAR_APP_URL=https://qa.hypothes.is/app.html
                    export NOTEBOOK_APP_URL=https://qa.hypothes.is/notebook
                    yarn version --no-git-tag-version --new-version ${qaVersion}
                    """

                    uploadFilesToSentry(cdnURL, qaVersion)

                    // Deploy to S3, so the package can be served by
                    // https://qa.hypothes.is/embed.js.
                    //
                    // If we decide to build a QA browser extension using the QA
                    // client in future then we will need to deploy to npm as well.
                    sh """
                    export AWS_ACCESS_KEY_ID=${env.AWS_ACCESS_KEY_ID}
                    export AWS_SECRET_ACCESS_KEY=${env.AWS_SECRET_ACCESS_KEY}
                    scripts/deploy-to-s3.js --bucket ${s3Bucket} --tag qa --no-cache-entry
                    """
                }
            }
            postSlack 'good', "QA deployment of ${lastCommitHash} succeeded"
        } catch (exc) {
            postSlack 'danger', "QA deployment of ${lastCommitHash} failed"
            throw exc
        }
    }
}
}

if (env.BRANCH_NAME != releaseFromBranch) {
    echo "Skipping prod deployment because ${env.BRANCH_NAME} is not the ${releaseFromBranch} branch"
    return
}

milestone()
stage('Publish') {
    input(message: "Publish new client release?")
    milestone()

    node {
        checkout scm

        workspace = pwd()

        echo "Publishing ${pkgName} v${newPkgVersion} from ${releaseFromBranch} branch."
        postSlack 'good', "Starting prod deployment of v${newPkgVersion} (${lastCommitHash})"

        try {
            nodeEnv.inside("-e HOME=${workspace} -e BRANCH_NAME=${env.BRANCH_NAME}") {
                withCredentials([
                    string(credentialsId: 'npm-token', variable: 'NPM_TOKEN'),
                    string(credentialsId: 'sentry-token', variable: 'SENTRY_AUTH_TOKEN'),
                    usernamePassword(credentialsId: 'github-jenkins-user',
                                      passwordVariable: 'GITHUB_TOKEN',
                                      usernameVariable: 'GITHUB_USERNAME'),
                    [$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 's3-cdn']
                    ]) {

                    // Configure author for tag and auth credentials for pushing tag to GitHub.
                    // See https://git-scm.com/docs/git-credential-store.
                    sh """
                    git config --replace-all user.email ${env.GITHUB_USERNAME}@hypothes.is
                    git config --replace-all user.name ${env.GITHUB_USERNAME}
                    git config credential.helper store
                    echo https://${env.GITHUB_USERNAME}:${env.GITHUB_TOKEN}@github.com >> \$HOME/.git-credentials
                    """

                    // Create and push a git tag.
                    sh "git tag v${newPkgVersion}"
                    sh "git push https://github.com/hypothesis/client.git v${newPkgVersion}"
                    sh "sleep 2" // Give GitHub a moment to realize the tag exists.

                    // Bump the package version.
                    sh """
                    export SIDEBAR_APP_URL=https://hypothes.is/app.html
                    export NOTEBOOK_APP_URL=https://hypothes.is/notebook
                    yarn version --no-git-tag-version --new-version ${newPkgVersion}
                    """

                    uploadFilesToSentry(cdnURL, newPkgVersion)

                    // Create GitHub release with changes since previous release.
                    sh "scripts/create-github-release.js v${pkgVersion}"

                    sh "echo '//registry.npmjs.org/:_authToken=${env.NPM_TOKEN}' >> \$HOME/.npmrc"
                    sh "yarn publish --no-interactive --tag ${npmTag} --new-version=${newPkgVersion}"
                    sh "scripts/wait-for-npm-release.sh ${npmTag}"

                    // Deploy the client to cdn.hypothes.is, where the embedded
                    // client is served from by https://hypothes.is/embed.js.
                    sh """
                    export AWS_ACCESS_KEY_ID=${env.AWS_ACCESS_KEY_ID}
                    export AWS_SECRET_ACCESS_KEY=${env.AWS_SECRET_ACCESS_KEY}
                    scripts/deploy-to-s3.js --bucket ${s3Bucket}
                    """
                }
            }
            postSlack 'good', "Prod deployment of v${newPkgVersion} (${lastCommitHash}) succeeded"
        } catch (exc) {
            postSlack 'danger', "Prod deployment of v${newPkgVersion} (${lastCommitHash}) failed"
            throw exc
        }
    }
}

milestone()
stage('Update browser extension') {
    build(job: 'browser-extension/master',
          parameters: [
               string(name: 'BUILD_TYPE', value: 'update-hypothesis-client')
          ])
}

// Increment the minor part of a `MAJOR.MINOR.PATCH` semver version.
String bumpMinorVersion(String version) {
    def parts = version.tokenize('.')
    if (parts.size() != 3) {
        error "${version} is not a valid MAJOR.MINOR.PATCH version"
    }
    def newMinorVersion = parts[1].toInteger() + 1

    return "${parts[0]}.${newMinorVersion}.${parts[2]}"
}

// Upload the source files and sourcemaps for a new release to Sentry.
//
// See https://docs.sentry.io/product/cli/releases/#sentry-cli-sourcemaps.
void uploadFilesToSentry(String cdnURL, String version) {
  def sentryCmd = "yarn run sentry-cli releases --org hypothesis --project client"

  sh """
${sentryCmd} new ${version}
${sentryCmd} files ${version} upload-sourcemaps --url-prefix ${cdnURL}/${version}/build/scripts/ build/scripts/
${sentryCmd} finalize ${version}
"""
}
