package validation

import (
	"errors"
	"path"
	"regexp"
	"strings"
	"unicode/utf8"
)

var drivePath = regexp.MustCompile(`^[A-Za-z]:`)

func NormalizeArchivePath(raw string, maxBytes, maxDepth int) (string, error) {
	if raw == "" || strings.ContainsRune(raw, '\x00') || !utf8.ValidString(raw) {
		return "", errors.New("invalid archive path")
	}
	if len(raw) > maxBytes || strings.HasPrefix(raw, "/") || strings.HasPrefix(raw, `\\`) || drivePath.MatchString(raw) {
		return "", errors.New("unsafe archive path")
	}
	raw = strings.ReplaceAll(raw, `\`, "/")
	parts := strings.Split(raw, "/")
	for _, part := range parts {
		if part == ".." || part == "" && len(parts) > 1 && parts[0] == "" {
			return "", errors.New("path traversal is not allowed")
		}
	}
	clean := strings.TrimSuffix(path.Clean(raw), "/")
	if clean == "." || clean == ".." || strings.HasPrefix(clean, "../") {
		return "", errors.New("invalid normalized path")
	}
	if len(strings.Split(clean, "/")) > maxDepth {
		return "", errors.New("archive path is too deep")
	}
	return clean, nil
}

func IsNestedArchive(name string) bool {
	lower := strings.ToLower(name)
	for _, suffix := range []string{".zip", ".7z", ".rar", ".tar", ".tgz", ".gz", ".bz2", ".xz"} {
		if strings.HasSuffix(lower, suffix) { return true }
	}
	return false
}

