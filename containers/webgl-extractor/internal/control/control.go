package control

import (
	"context"
	"io"

	"uniblex.com/webgl-extractor/internal/model"
)

// Authority is the only source of resource identifiers. Implementations must
// call service-role RPCs and must never construct keys from request parameters.
type Authority interface {
	Claim(ctx context.Context, operationID, executionToken string) (model.Operation, error)
	Heartbeat(ctx context.Context, operation model.Operation) error
	CompleteExtraction(ctx context.Context, operation model.Operation, manifest []model.ManifestEntry, checksum string) error
	FailAndRequestCleanup(ctx context.Context, operation model.Operation, code string) error
}

type Objects interface {
	DownloadTo(ctx context.Context, bucket, key string, dst io.Writer, maxBytes int64) (checksum string, bytes int64, err error)
	Put(ctx context.Context, bucket, key string, body io.Reader, size int64, metadata map[string]string) (checksum string, err error)
	ListPrefix(ctx context.Context, bucket, prefix, cursor string) (keys []string, next string, err error)
	DeleteExact(ctx context.Context, bucket string, keys []string) error
}

