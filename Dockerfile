FROM node:latest

ADD . workspace
WORKDIR workspace

RUN npm run setup
RUN npm run build

#TODO: Delete docs folder
#TODO: Delete TS files

CMD ["npm", "run", "start-prod"]
