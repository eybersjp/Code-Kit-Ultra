# Adapter API Specification

Recommended interface:

```ts
interface PlatformAdapter {
  name: string;
  canHandle(taskType: string): boolean;
  execute(payload: unknown): Promise<unknown>;
}
```
