#!/bin/bash

docker pull siggame/colisee-db:stable
docker rm --force template-db
docker run -d --name template-db --publish 5432:5432 siggame/colisee-db:stable

npm run test

docker stop template-db
