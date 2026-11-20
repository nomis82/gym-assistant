<!-- AGENT-MEMORY:BEGIN -->
- Keep exercise defaults, backup validation and session rules in a browser-safe training module so concrete rules can be unit tested.
- Share locally persisted training state through a root provider; hydrate storage only after mount to avoid SSR mismatches.
- Register the generated offline worker only through the guarded PWA wrapper so previews never retain stale app caches.
<!-- AGENT-MEMORY:END -->
