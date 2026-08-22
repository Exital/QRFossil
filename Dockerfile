FROM node:20-alpine

WORKDIR /app

COPY docker/pages-build.sh /usr/local/bin/pages-build
RUN chmod +x /usr/local/bin/pages-build

ENTRYPOINT ["pages-build"]
