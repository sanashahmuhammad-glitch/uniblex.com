# Immutable activation sequence

```mermaid
sequenceDiagram
  participant A as Admin route
  participant D as Supabase
  participant W as Workflow
  participant R as R2
  A->>D: Create owner-scoped publish intent (idempotency key)
  D-->>A: Operation locator and expected state version
  A->>W: Enqueue operation locator only
  W->>D: Claim versioned lease
  D-->>W: Authoritative source and new destination bindings
  W->>R: Assert destination prefix is empty
  W->>R: Copy manifest-listed objects
  W->>R: Verify count, bytes, and checksums
  W->>D: Activate with immutable verified receipt
  D->>D: Lock operation, build, and game; compare-and-set
  D->>D: Atomically swap active build pointer
  D-->>W: Published receipt or stale-operation rejection
```

