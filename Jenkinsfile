#!groovy

node {
    checkout scm

    nodeEnv = docker.image("kkarczmarczyk/node-yarn:7.5")
    workspace = pwd()

    stage 'Build'
    nodeEnv.inside("-e HOME=${workspace}") {
        sh 'make clean'
        sh 'make'
    }

    stage 'Test'
    nodeEnv.inside("-e HOME=${workspace}") {
        sh 'make test'
    }

    if (isTag()) {
        stage 'Publish'
        nodeEnv.inside("-e HOME=${workspace}") {
            withCredentials([
                [$class: 'StringBinding', credentialsId: 'npm-token', variable: 'NPM_TOKEN']]) {

                sh "echo '//registry.npmjs.org/:_authToken=${env.NPM_TOKEN}' >> \$HOME/.npmrc"
                sh "yarn publish"
            }
        }

        // Upload the contents of the package to an S3 bucket, which it
        // will then be served from.
        docker.image('nickstenning/s3-npm-publish')
              .withRun('', 'hypothesis s3://cdn.hypothes.is') { c ->
                sh "docker logs --follow ${c.id}"
              }
    }
}

boolean isTag() {
    try {
        sh 'git describe --exact-match --tags'
        return true
    } catch (Exception e) {
        echo e.toString()
        return false
    }
}
