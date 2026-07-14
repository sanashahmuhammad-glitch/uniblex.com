package extractor

import (
	"archive/zip"
	"errors"
	"fmt"
	"io/fs"
	"strings"

	"uniblex.com/webgl-extractor/internal/model"
	"uniblex.com/webgl-extractor/internal/validation"
)

type Entry struct {
	File *zip.File
	Path string
}

func InspectArchive(reader *zip.ReadCloser, limits model.Limits) ([]Entry, int64, error) {
	if len(reader.File) == 0 || len(reader.File) > limits.MaxFiles {
		return nil, 0, errors.New("archive file count is outside allowed limits")
	}
	seen := make(map[string]struct{}, len(reader.File))
	entries := make([]Entry, 0, len(reader.File))
	var total int64
	for _, file := range reader.File {
		normalized, err := validation.NormalizeArchivePath(file.Name, limits.MaxPathBytes, limits.MaxDepth)
		if err != nil { return nil, 0, fmt.Errorf("unsafe archive entry: %w", err) }
		canonical := strings.ToLower(normalized)
		if _, exists := seen[canonical]; exists { return nil, 0, errors.New("duplicate normalized archive path") }
		seen[canonical] = struct{}{}
		mode := file.Mode()
		if mode&fs.ModeSymlink != 0 || !mode.IsRegular() && !mode.IsDir() {
			return nil, 0, errors.New("links and special files are not supported")
		}
		if file.Flags&0x1 != 0 { return nil, 0, errors.New("encrypted archives are not supported") }
		if file.Method != zip.Store && file.Method != zip.Deflate { return nil, 0, errors.New("unsupported ZIP compression method") }
		if validation.IsNestedArchive(normalized) { return nil, 0, errors.New("nested archives are not supported") }
		if mode.IsDir() { continue }
		uncompressed := int64(file.UncompressedSize64)
		compressed := int64(file.CompressedSize64)
		if uncompressed < 0 || uncompressed > limits.MaxFileBytes { return nil, 0, errors.New("archive entry is too large") }
		if uncompressed > 0 && compressed == 0 { return nil, 0, errors.New("invalid ZIP size metadata") }
		if compressed > 0 && float64(uncompressed)/float64(compressed) > limits.MaxCompressionRatio {
			return nil, 0, errors.New("archive entry compression ratio is too high")
		}
		if total > limits.MaxExtractedBytes-uncompressed { return nil, 0, errors.New("archive expands beyond the allowed size") }
		total += uncompressed
		entries = append(entries, Entry{File:file, Path:normalized})
	}
	return entries, total, nil
}

