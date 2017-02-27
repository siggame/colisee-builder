FROM node:latest

ADD . workspace
WORKDIR workspace

RUN npm run setup
RUN npm run build

CMD ["npm", "run", "quick-start"]