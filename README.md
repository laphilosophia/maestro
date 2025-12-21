# Maestro

> ⚠️ **ALPHA - NOT FOR PRODUCTION USE**
>
> This project is in early development. APIs may change without notice.

**Mechanical decision fabric for task admission under pressure.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is Maestro?

Maestro determines:

- **whether** a task should proceed
- **where** a task should be dispatched
- **under what pressure constraints**

Maestro explicitly does **not** determine: correctness, success, semantic validity, or business meaning.

## Packages

| Package                          | Description          |
| -------------------------------- | -------------------- |
| [@maestro/core](./packages/core) | Core decision fabric |

## Quick Start

```typescript
import { createMaestro } from '@maestro/core'

const maestro = createMaestro({
  onDispatch: ({ task, routeId }) => {
    console.log(`${task.id} → ${routeId}`)
  },
})

maestro.admit({
  id: 'task-001',
  metadata: { spawnBudget: 3, maxRetryDepth: 2, createdAt: Date.now() },
})
```

## Documentation

- [Core Package README](./packages/core/README.md)
- [RFC Documents](./docs/rfc/)

## License

MIT
