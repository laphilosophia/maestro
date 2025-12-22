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

| Package                                        | Description              |
| ---------------------------------------------- | ------------------------ |
| [@maestro/core](./packages/core)               | Core decision fabric     |
| [@maestro/worker-gate](./packages/worker-gate) | Worker pool gate adapter |

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

# Examples

> You can find them in the [examples](./examples) directory.

- [Basic Handler Patterns](./examples/basic-handler-pattern.ts)
- [Envelope IoT Example](./examples/envelope-iot-example.ts)
- [IoT Ingestion](./examples/iot-ingestion.ts)
- [Retry Flow](./examples/retry-flow.ts)
- [IoT Flood](./examples/test-iot-flood.ts)
- [Restart](./examples/test-restart.ts)
- [Sensor Stall](./examples/test-sensor-stall.ts)
- [Worker Pool Gate](./examples/worker-gate-demo.ts)

## Documentation

- [Core Package README](./packages/core/README.md)
- [RFC Documents](./docs/rfc/)

## License

MIT
