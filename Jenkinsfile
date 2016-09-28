#!groovy

node {
    checkout scm

    nodeEnv = docker.image("node:6.2")
    workspace = pwd()

    stage 'Build'
    nodeEnv.inside("-e HOME=${workspace}") {
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
                sh "npm publish"
            }
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
