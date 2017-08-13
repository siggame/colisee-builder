FROM node:alpine

ADD . app
WORKDIR app

RUN npm run setup
RUN npm run build

CMD ["npm", "run", "start-prod"]
