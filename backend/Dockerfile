# ── Die Eine Kette — Backend-Image (Relay-Motor, Backend-only) ───────────────
# Liefert NUR die API. Die Oberfläche ist das eigene Next.js-Frontend (../frontend).
# Das alte eingebaute Web-UI wird bewusst nicht mehr gebaut; statt dessen eine
# neutrale gebrandete API-Seite (main.go embeddet web/build/*).
# Herkunft: Relay-Motor basiert auf One API (MIT) — siehe ./LICENSE und ../README.

# Stage 1 — Go-Binary „die-eine-kette" bauen (CGO für sqlite-Treiber)
FROM golang:alpine AS backend
RUN apk add --no-cache gcc musl-dev sqlite-dev build-base
ENV GO111MODULE=on CGO_ENABLED=1 GOOS=linux
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Backend-only: kein altes Frontend mehr einbetten — neutrale API-Seite als Embed.
# Der Motor serviert web/build/<THEME>/index.html (Default-Theme „default").
RUN mkdir -p web/build/default && printf '%s' \
  '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Die Eine Kette — API</title><style>body{background:#15171E;color:#D4AF37;font-family:Georgia,serif;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center}p{color:#a1a1aa;font-family:system-ui,sans-serif}a{color:#D4AF37}</style></head><body><div><h1>&#9939; Die Eine Kette</h1><p>API-Backend. Die Oberfl&auml;che l&auml;uft als eigenes Frontend.</p></div></body></html>' \
  > web/build/default/index.html
RUN go build -trimpath \
    -ldflags "-s -w -X 'github.com/songquanpeng/one-api/common.Version=$(cat VERSION)' -linkmode external -extldflags '-static'" \
    -o die-eine-kette

# Stage 2 — schlankes Runtime-Image
FROM alpine:latest
RUN apk add --no-cache ca-certificates tzdata
COPY --from=backend /build/die-eine-kette /die-eine-kette
EXPOSE 3000
WORKDIR /data
ENTRYPOINT ["/die-eine-kette"]
