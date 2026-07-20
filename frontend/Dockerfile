FROM node:22-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM golang:1.24-alpine AS gateway-build
WORKDIR /src
COPY server/main.go .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -buildid=" -o /gateway main.go

FROM alpine:3.22
RUN addgroup -S app && adduser -S -G app -u 10001 app
WORKDIR /srv
COPY --from=gateway-build /gateway /usr/local/bin/gateway
COPY --from=build /workspace/dist /srv/public
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/gateway"]
