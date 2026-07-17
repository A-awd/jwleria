# Sanitized source index

| Source | Use | Migration treatment |
|---|---|---|
| Final One Brain registry and repository plan | canonical identity and disposition | summarized |
| Existing `jwleria` history | preservation baseline | retained in place; not rewritten |
| Private `jwleria-s-gembox` repository | duplicate-reconciliation evidence | read-only recent commit-history metadata summarized; no code, files, or secret values copied |
| AI-platform project inventories | high-level project purpose | public-safe summary only |
| Platform-local conversations | discovery context | non-authoritative; not copied |

No credentials, customer or order data, supplier records, private assets, financial records, production configuration, or raw conversations are included.

The read-only comparison verified that the duplicate imported canonical source and later diverged around Arabic-only behavior, removal of demo/catalog and price/currency UI, WhatsApp localization, and Supabase client configuration. One commit message reports a hardcoded client key; the value is deliberately excluded and must be replaced before integration.
