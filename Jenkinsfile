#!groovy

node {
    checkout scm

    nodeEnv = docker.image("node:4")
    workspace = pwd()

    stage 'Build'
    nodeEnv.inside("-e HOME=${workspace}") {
        sh 'make'
    }

    stage 'Test'
    nodeEnv.inside("-e HOME=${workspace}") {
        sh 'make test'
    }
}
