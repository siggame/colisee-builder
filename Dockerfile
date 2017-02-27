FROM node:latest

ADD . template
WORKDIR template

RUN npm run setup
RUN npm run build

CMD ["npm", "run", "quick-start"]