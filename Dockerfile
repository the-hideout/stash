FROM node:lts-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

USER node

COPY deploy-commands-dev.mjs .
COPY deploy-commands.mjs .
COPY classic-commands/ classic-commands/
COPY commands/ commands/
COPY modules/ modules/
COPY index.mjs .

ENTRYPOINT [ "node" ]
CMD [ "index.mjs" ]
