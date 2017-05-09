#!/bin/bash

docker pull siggame/colisee-db:stable
docker rm --force builder-db
docker run -d --name builder-db --publish 5432:5432 siggame/colisee-db:stable

npm run test

docker stop builder-db
