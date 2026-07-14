package model

import "time"

type Limits struct {
	MaxCompressedBytes   int64
	MaxExtractedBytes    int64
	MaxFileBytes         int64
	MaxFiles             int
	MaxDepth             int
	MaxPathBytes         int
	MaxCompressionRatio  float64
}

func ConservativeLimits() Limits {
	return Limits{
		MaxCompressedBytes:  2 << 30,
		MaxExtractedBytes:   8 << 30,
		MaxFileBytes:        2 << 30,
		MaxFiles:            10_000,
		MaxDepth:            20,
		MaxPathBytes:        512,
		MaxCompressionRatio: 200,
	}
}

type Operation struct {
	ID               string
	State            string
	StateVersion     int64
	SourceBucket     string
	SourceObjectKey  string
	StagingPrefix    string
	ExpectedSize     int64
	ExpectedChecksum string
	LeaseToken       string
	LeaseExpiresAt   time.Time
}

type ManifestEntry struct {
	Path            string `json:"path"`
	ObjectKey       string `json:"objectKey"`
	Size            int64  `json:"size"`
	Checksum        string `json:"checksum"`
	ContentType     string `json:"contentType"`
	ContentEncoding string `json:"contentEncoding,omitempty"`
}

