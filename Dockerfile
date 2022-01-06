FROM node:stretch-slim

# create nonroot user
RUN adduser nonroot
RUN mkdir /app && chown -R nonroot:nonroot /app
WORKDIR /app

COPY --chown=nonroot:nonroot package-lock.json /app
COPY --chown=nonroot:nonroot package.json /app
RUN npm install

USER nonroot

COPY --chown=nonroot:nonroot deploy-commands-dev.mjs .
COPY --chown=nonroot:nonroot deploy-commands.mjs .
COPY --chown=nonroot:nonroot classic-commands/ classic-commands/
COPY --chown=nonroot:nonroot commands/ commands/
COPY --chown=nonroot:nonroot modules/ modules/
COPY --chown=nonroot:nonroot index.mjs .

ENTRYPOINT [ "node" ]
CMD [ "index.mjs" ]