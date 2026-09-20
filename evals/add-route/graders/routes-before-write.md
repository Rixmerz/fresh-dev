---
type: tool_order
before: fresh_routes
after: Write
---
`fresh_routes` must be called before the first `Write`: the route neighbourhood is
checked before any file is created.
