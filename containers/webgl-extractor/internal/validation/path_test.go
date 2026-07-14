package validation

import "testing"

func TestNormalizeArchivePath(t *testing.T) {
	valid, err := NormalizeArchivePath("Build/game.wasm", 512, 20)
	if err != nil || valid != "Build/game.wasm" { t.Fatalf("valid path rejected: %q %v", valid, err) }
	for _, raw := range []string{"../secret", "/root", `C:\\secret`, `dir\\..\\secret`, "bad\x00name"} {
		if _, err := NormalizeArchivePath(raw, 512, 20); err == nil { t.Fatalf("unsafe path accepted: %q", raw) }
	}
}

