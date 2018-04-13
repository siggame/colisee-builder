# See http://training.play-with-docker.com/node-zeit-pkg/

FROM node:latest AS build

RUN npm install -g pkg pkg-fetch
ENV NODE node8
ENV PLATFORM alpine
ENV ARCH x64
RUN /usr/local/bin/pkg-fetch ${NODE} ${PLATFORM} ${ARCH}

RUN mkdir -p /usr/src/app/release && cd /usr/src && git clone https://github.com/siggame/joueur.git
WORKDIR /usr/src/app

COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . /usr/src/app
RUN npm run build:dist && pkg -t ${NODE}-${PLATFORM}-${ARCH} --output builder release/index.js

FROM alpine:latest

ENV NODE_ENV=production

RUN addgroup -S siggame && adduser -S -G siggame siggame \
    && apk update && apk add --no-cache libstdc++ libgcc tar \
    && mkdir -p /app/output && mkdir -p /app/joueur \
    && chown -R siggame:siggame /app

COPY --from=build --chown=siggame:siggame /usr/src/app/builder /app/builder
COPY --from=build --chown=siggame:siggame /usr/src/joueur /app/joueur

USER siggame
WORKDIR /app

CMD ["/app/builder"]