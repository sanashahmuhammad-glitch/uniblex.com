# Container extraction specification

The skeleton under `containers/webgl-extractor` uses bounded ephemeral disk and
the Go standard ZIP reader. Before any extracted object upload it must complete a
metadata pass and reject: oversized source/archive/file/count/path/depth/ratio,
ZIP64 overflow, encrypted entries, unsupported methods, symlinks/special files,
nested archives, NUL/invalid UTF-8, absolute/drive/UNC/backslash traversal,
duplicate normalized or case-folded paths, local/central header mismatch, invalid
CRC, overlapping entries, and data after declared bounds.

During the second pass it streams each entry through an independent byte limit,
CRC32 and SHA-256 calculation. Actual size and CRC must match the central record.
Objects are uploaded only under the database-bound operation staging prefix.
Before the first upload the Container proves the prefix empty; a nonempty prefix
fails closed. An implementation must either buffer the fully validated build on
bounded disk before upload or upload into a fresh attempt subprefix and seal only
after full validation—never expose a partially validated prefix as ready.

The deterministic manifest is path-sorted and records object key, byte size,
SHA-256, CRC32, MIME type, content encoding, cache-control, immutable flag, source
build checksum, operation/build IDs, format, compression mode, and manifest schema
version. HTML is non-immutable. Hashed/versioned assets may be immutable. WASM uses
`application/wasm`; JavaScript uses a JavaScript MIME; Brotli/Gzip set real
`Content-Encoding` behavior.

Detection validates referenced files for Unity Brotli, Gzip, uncompressed,
`.unityweb`, and generic HTML5. It rejects mixed compression, missing entry points,
ambiguous multiple roots, escaping references, and inconsistent loader metadata.
No Moto Rider or game-specific rule is permitted.

