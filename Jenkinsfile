#!groovy

node {
    checkout scm

    nodeEnv = docker.image("node:10-stretch")
    workspace = pwd()

    // Tag used when deploying to NPM.
    npmTag = "latest"

    // Git branch which releases are deployed from.
    releaseFromBranch = "master"

    // S3 bucket where the embedded client is served from.
    s3Bucket = "cdn.hypothes.is"

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

    lastCommitAuthor = sh (
      script: 'git show HEAD --no-patch --format="%an"',
      returnStdout: true
    ).trim()

    lastCommitHash = sh (
      script: 'git show HEAD --no-patch --format="%h"',
      returnStdout: true
    ).trim()

    if (lastCommitAuthor == "jenkins-hypothesis") {
        echo "Skipping build of automated commit created by Jenkins"
        return
    }

    pkgName = sh (
      script: 'cat package.json | jq -r .name',
      returnStdout: true
    ).trim()

    pkgVersion = sh (
      script: 'cat package.json | jq -r .version',
      returnStdout: true
    ).trim()

    stage('Build') {
        nodeEnv.inside("-e HOME=${workspace}") {
            sh "echo Building Hypothesis client"
            sh 'make clean'
            sh 'make'
        }
    }

    stage('Test') {
        nodeEnv.inside("-e HOME=${workspace}") {
            sh 'make test'
        }
    }

    if (env.BRANCH_NAME != releaseFromBranch) {
        echo "Skipping deployment because this is not the ${releaseFromBranch} branch"
        return
    }

    milestone()
    stage('Publish to QA') {
        qaVersion = pkgVersion + "-${lastCommitHash}"
        nodeEnv.inside("-e HOME=${workspace}") {
            withCredentials([
                string(credentialsId: 'npm-token', variable: 'NPM_TOKEN'),
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
                yarn version --no-git-tag-version --new-version ${qaVersion}
                """

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

        // Revert back to the pre-QA commit.
        sh "git checkout ${lastCommitHash}"
    }

    milestone()
    stage('Publish') {
        input(message: "Publish new client release?")
        milestone()

        newPkgVersion = bumpMinorVersion(pkgVersion)
        if (versionSuffix != "") {
            newPkgVersion = newPkgVersion + "-" + versionSuffix
        }

        echo "Publishing ${pkgName} v${newPkgVersion} from ${releaseFromBranch} branch."

        nodeEnv.inside("-e HOME=${workspace} -e BRANCH_NAME=${env.BRANCH_NAME}") {
            withCredentials([
                string(credentialsId: 'npm-token', variable: 'NPM_TOKEN'),
                usernamePassword(credentialsId: 'github-jenkins-user',
                                  passwordVariable: 'GITHUB_TOKEN',
                                  usernameVariable: 'GITHUB_USERNAME'),
                [$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 's3-cdn']
                ]) {

                // Configure commit author for version bump commit and auth credentials
                // for pushing tag to GitHub.
                //
                // See https://git-scm.com/docs/git-credential-store
                sh """
                git config --replace-all user.email ${env.GITHUB_USERNAME}@hypothes.is
                git config --replace-all user.name ${env.GITHUB_USERNAME}
                git config credential.helper store
                echo https://${env.GITHUB_USERNAME}:${env.GITHUB_TOKEN}@github.com >> \$HOME/.git-credentials
                """

                // Update local information about tags to match the remote,
                // including removing any local tags that no longer exist.
                //
                // The `--prune-tags` option is not supported in Git 2.11 so we
                // use the workaround from https://github.com/git/git/commit/97716d217c1ea00adfc64e4f6bb85c1236d661ff
                sh "git fetch --quiet --prune origin 'refs/tags/*:refs/tags/*' "

                // Bump the package version and create the tag and GitHub release.
                sh "yarn version --new-version ${newPkgVersion}"

                // Publish the updated package to the npm registry.
                // Use `npm` rather than `yarn` for publishing.
                // See https://github.com/yarnpkg/yarn/pull/3391.
                sh "echo '//registry.npmjs.org/:_authToken=${env.NPM_TOKEN}' >> \$HOME/.npmrc"
                sh "npm publish --tag ${npmTag}"
                sh "scripts/wait-for-npm-release.sh"

                // Deploy the client to cdn.hypothes.is, where the embedded
                // client is served from by https://hypothes.is/embed.js.
                sh """
                export AWS_ACCESS_KEY_ID=${env.AWS_ACCESS_KEY_ID}
                export AWS_SECRET_ACCESS_KEY=${env.AWS_SECRET_ACCESS_KEY}
                scripts/deploy-to-s3.js --bucket ${s3Bucket}
                """
            }
        }
    }
}

// Increment the minor part of a `MAJOR.MINOR.PATCH` semver version.
String bumpMinorVersion(String version) {
    def parts = version.tokenize('.')
    if (parts.size() != 3) {
        throw new IllegalArgumentException("${version} is not a valid MAJOR.MINOR.PATCH version")
    }
    def newMinorVersion = parts[1].toInteger() + 1

    return "${parts[0]}.${newMinorVersion}.${parts[2]}"
}
