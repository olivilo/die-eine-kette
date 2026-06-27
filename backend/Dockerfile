# ── Die Eine Kette — Backend-Image (Relay-Motor) ─────────────────────────────
# Mehrstufiger Build: Frontend (vorläufig, wird in Phase 2 ersetzt) → Go-Binary.
# Herkunft: Relay-Motor basiert auf One API (MIT) — siehe ./LICENSE und ../README.

# Stage 1 — Frontend-Theme „default" bauen (CRA; Node 16 wie vom Motor erwartet).
# Vorläufig nur ein Theme statt drei → schnellere Builds; Frontend folgt in Phase 2 neu.
FROM node:16 AS frontend
WORKDIR /web
COPY ./VERSION .
COPY ./web .
# /web/build muss existieren — das Theme-Build-Script verschiebt sein Ergebnis
# nach ../build/<theme> (bei nur 1 Theme legt es sonst niemand an).
RUN mkdir -p /web/build \
 && npm install --prefix /web/default \
 && DISABLE_ESLINT_PLUGIN='true' REACT_APP_VERSION=$(cat ./VERSION) \
    npm run build --prefix /web/default

# Stage 2 — Go-Binary „die-eine-kette" bauen (CGO für sqlite-Treiber)
FROM golang:alpine AS backend
RUN apk add --no-cache gcc musl-dev sqlite-dev build-base
ENV GO111MODULE=on CGO_ENABLED=1 GOOS=linux
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /web/build ./web/build
RUN go build -trimpath \
    -ldflags "-s -w -X 'github.com/songquanpeng/one-api/common.Version=$(cat VERSION)' -linkmode external -extldflags '-static'" \
    -o die-eine-kette

# Stage 3 — schlankes Runtime-Image
FROM alpine:latest
RUN apk add --no-cache ca-certificates tzdata
COPY --from=backend /build/die-eine-kette /die-eine-kette
EXPOSE 3000
WORKDIR /data
ENTRYPOINT ["/die-eine-kette"]
