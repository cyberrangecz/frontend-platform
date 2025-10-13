FROM node:20-bookworm-slim AS builder
ARG PROD=false

RUN npm add --global nx

COPY libs /build/libs
COPY apps/cyberrangecz-platform /build/apps/cyberrangecz-platform
COPY *.json /build/
COPY etc/.npmrc /build/

RUN cd /build && \
    npm i && \
    if [ "$PROD" = true ] ; then \
      nx run cyberrangecz-platform:build:production; \
    else \
      nx run cyberrangecz-platform:build:development; \
    fi && \
    rm -rf /build/.npmrc

FROM nginx:alpine
COPY --from=builder /build/dist/apps/cyberrangecz-platform/browser /app
RUN chmod o-rwx -R /app && chgrp nginx -R /app
COPY etc/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8000
