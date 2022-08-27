FROM node:lts-alpine

WORKDIR /usr/src/app

COPY package*.json .

RUN npm install

USER node

COPY data/ data/
COPY bot.mjs .
COPY index.mjs .
COPY classic-commands/ classic-commands/
COPY commands/ commands/
COPY modules/ modules/

ENTRYPOINT [ "node" ]
CMD [ "index.mjs" ]

