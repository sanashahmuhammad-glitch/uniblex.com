package main

import (
	"fmt"
	"os"
)

func main() {
	// Deliberately fail closed until reviewed Supabase and R2 adapters exist.
	// No production configuration or implicit environment fallback is allowed.
	fmt.Fprintln(os.Stderr, "webgl extractor adapters are not configured")
	os.Exit(78)
}

