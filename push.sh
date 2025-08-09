#!/bin/bash

# Provide you defaults here
DOCKER_IMAGE_NAME="angular-frontend"
DOCKER_IMAGE_TAG=$(uuidgen)
IN_REMOTE_PATH="~"
NAMESPACE="crczp"
SSH_USER=""
SSH_HOST=""
SSH_KEY_PATH=""
DEPLOYMENT_NAME="angular-frontend"
MONITORING=False

while getopts "d:i:t:n:u:h:p:m" opt; do
    case $opt in
        d) DEPLOYMENT_NAME=$OPTARG
        ;;
        i) DOCKER_IMAGE_NAME=$OPTARG
        ;;
        t) DOCKER_IMAGE_TAG=$OPTARG
        ;;
        n) NAMESPACE=$OPTARG
        ;;
        u) SSH_USER=$OPTARG
        ;;
        h) SSH_HOST=$OPTARG
        ;;
        p) IN_REMOTE_PATH=$OPTARG
        ;;
        m) MONITORING=True
        ;;
        *) echo "Usage: $0 [-i docker_image_name] [-t docker_image_tag] [-n namespace] [-u ssh_user] [-h ssh_host] [-p in_remote_path] [-m] dockerfile-path"
           echo "Options:"
           echo "  -d DEPLOYMENT_NAME: Name of the deployment in Kubernetes"
           echo "  -i DOCKER_IMAGE_NAME: Name of the Docker image"
           echo "  -t DOCKER_IMAGE_TAG: Tag of the Docker image"
           echo "  -n NAMESPACE: Namespace in Kubernetes"
           echo "  -u SSH_USER: SSH user on the remote machine"
           echo "  -h SSH_HOST: SSH host of the remote machine"
           echo "  -p IN_REMOTE_PATH: Path to the directory in the remote machine"
           echo "  -m: Monitor the update"
           exit 0
        ;;
    esac
done

DOCKERFILE_DIR=$(dirname "$1")
IMAGE_TAR="$DOCKER_IMAGE_NAME.tar.gz"
REMOTE_TAR_PATH="$IN_REMOTE_PATH/$IMAGE_TAR"

shift $((OPTIND-1))

if [ "$#" -ne 1 ]; then
  echo "One argument specifying the Path to the Dockerfile is required"
  exit 1
fi

echo "Building Docker image..."
[[ -f $1 ]] || { echo "File $1 not found!"; exit 1; }
docker build -f $1 -t "$DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG" . || { echo "Failed to build Docker image!"; exit 1; }

echo "Saving Docker image to $DOCKERFILE_DIR/$IMAGE_TAR"
docker save "$DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG" -o "$DOCKERFILE_DIR/$IMAGE_TAR" || { echo "Failed to save Docker image to tar file!"; exit 1; }

echo "Copying image tar to remote machine..."
scp -i "$SSH_KEY_PATH" "$DOCKERFILE_DIR/$IMAGE_TAR" "$SSH_USER@$SSH_HOST:$IN_REMOTE_PATH" || { echo "Failed to copy image tar!"; exit 1; }

echo "Loading Docker image into Containerd service on remote machine..."
ssh -i "$SSH_KEY_PATH" "$SSH_USER@$SSH_HOST" "sudo k3s ctr images import $REMOTE_TAR_PATH" || { echo "Failed to load Docker image!"; exit 1; }

echo "Cleaning up image..."
rm -f "$DOCKERFILE_DIR/$IMAGE_TAR" || { echo "Failed to cleanup build sources"; }
echo "Deleted $DOCKERFILE_DIR/$IMAGE_TAR"
docker image rm "$DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG"

echo "Updating Helm deployment..."
ssh -i "$SSH_KEY_PATH" "$SSH_USER@$SSH_HOST" "sudo kubectl set image deployment/$DEPLOYMENT_NAME $DEPLOYMENT_NAME=$DOCKER_IMAGE_NAME:$DOCKER_IMAGE_TAG -n $NAMESPACE" || { echo "Failed to update!"; exit 1; }
if [[ $MONITORING == "True" ]]; then
  echo "Monitoring update...";
  ssh -i "$SSH_KEY_PATH" "$SSH_USER@$SSH_HOST" "kubectl rollout status deployment/$DEPLOYMENT_NAME -n $NAMESPACE" || { echo "Failed to monitor update!"; exit 1; };
fi
echo "Image updated successfully!"
