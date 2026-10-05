pipeline {
    agent any

    environment {
        APP_NAME       = 'nutriscan-ai'
        IMAGE_TAG      = "${env.BUILD_NUMBER ?: 'latest'}"
        DOCKER_IMAGE   = "${APP_NAME}:${IMAGE_TAG}"
        CONTAINER_PORT = '3000'
    }

    options {
        timeout(time: 25, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '15'))
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout SCM') {
            steps {
                echo 'Checking out source code from Git repository...'
                checkout scm
            }
        }

        stage('Environment & Version Info') {
            steps {
                echo '=== Tool Versions ==='
                script {
                    if (isUnix()) {
                        sh 'node -v'
                        sh 'npm -v'
                        sh 'docker --version'
                    } else {
                        bat 'node -v'
                        bat 'npm -v'
                        bat 'docker --version'
                    }
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing dependencies with npm ci...'
                script {
                    if (isUnix()) {
                        sh 'npm ci'
                    } else {
                        bat 'call npm ci'
                    }
                }
            }
        }

        stage('Code Quality & Lint') {
            steps {
                echo 'Running Oxlint code quality validation...'
                script {
                    if (isUnix()) {
                        sh 'npm run lint'
                    } else {
                        bat 'call npm run lint'
                    }
                }
            }
        }

        stage('Automated Test Suite') {
            steps {
                echo 'Running automated tests (Functional, Unit, Integration, Security)...'
                script {
                    if (isUnix()) {
                        sh 'npm run test:fast'
                    } else {
                        bat 'call npm run test:fast'
                    }
                }
            }
        }

        stage('Production Build') {
            steps {
                echo 'Building optimized production assets with Vite...'
                script {
                    if (isUnix()) {
                        sh 'npm run build'
                    } else {
                        bat 'call npm run build'
                    }
                }
            }
        }

        stage('Docker Build & Tag') {
            steps {
                echo "Building Docker image ${DOCKER_IMAGE}..."
                script {
                    if (isUnix()) {
                        sh "docker build -t ${APP_NAME}:latest -t ${DOCKER_IMAGE} ."
                    } else {
                        bat "docker build -t ${APP_NAME}:latest -t ${DOCKER_IMAGE} ."
                    }
                }
            }
        }

        stage('Container Smoke & Health Test') {
            steps {
                echo 'Verifying container startup and /healthz endpoint...'
                script {
                    if (isUnix()) {
                        sh "docker rm -f nutriscan-ci-test 2>/dev/null || true"
                        sh "docker run -d --name nutriscan-ci-test -p ${CONTAINER_PORT}:80 ${APP_NAME}:latest"
                        sleep(time: 5, unit: 'SECONDS')
                        sh "curl -f http://localhost:${CONTAINER_PORT}/healthz || exit 1"
                        sh "docker rm -f nutriscan-ci-test"
                    } else {
                        bat "docker rm -f nutriscan-ci-test 2>nul || ver >nul"
                        bat "docker run -d --name nutriscan-ci-test -p ${CONTAINER_PORT}:80 ${APP_NAME}:latest"
                        sleep(time: 5, unit: 'SECONDS')
                        bat "curl -f http://localhost:${CONTAINER_PORT}/healthz"
                        bat "docker rm -f nutriscan-ci-test"
                    }
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline execution finished.'
            script {
                if (isUnix()) {
                    sh 'docker rm -f nutriscan-ci-test 2>/dev/null || true'
                } else {
                    bat 'docker rm -f nutriscan-ci-test 2>nul || ver >nul'
                }
            }
            cleanWs deleteDirs: true, notFailBuild: true
        }
        success {
            echo '=================================================='
            echo "🎉 NutriScan AI CI/CD Pipeline SUCCEEDED!"
            echo "   Docker image ${DOCKER_IMAGE} verified and ready."
            echo '=================================================='
        }
        failure {
            echo '❌ Pipeline failed! Please review the console log for errors.'
        }
    }
}
