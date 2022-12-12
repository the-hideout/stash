FROM node:lts-alpine

WORKDIR /usr/src/app

RUN mkdir cache && chown -R node:node cache

COPY package*.json .

RUN npm install

USER node

COPY data/ data/
COPY bot.mjs .
COPY index.mjs .
COPY commands/ commands/
COPY modules/ modules/
COPY translations/ translations/

ENTRYPOINT [ "node" ]
CMD [ "index.mjs" ]

