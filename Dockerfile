FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=development PORT=3001

COPY --chown=node:node . .
RUN mkdir -p /app/data/uploads && chown -R node:node /app/data

USER node
EXPOSE 3001
CMD ["node", "server.js"]
