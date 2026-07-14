FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/webgl-extractor ./cmd/webgl-extractor

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/webgl-extractor /webgl-extractor
USER nonroot:nonroot
ENTRYPOINT ["/webgl-extractor"]

