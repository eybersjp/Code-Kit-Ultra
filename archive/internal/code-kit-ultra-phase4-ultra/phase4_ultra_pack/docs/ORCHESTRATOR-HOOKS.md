# Orchestrator Hook Points

Add the observability calls in your phase engine or governed pipeline in this order:

1. Create timeline builder when a run starts
2. Add event: governance started
3. Run intent engine and add event
4. Run constraint engine and add event
5. Run validation engine and add event
6. Run consensus engine and add event
7. Build governance trace from all outputs
8. Persist trace JSON
9. Persist timeline JSON
10. Render markdown report and persist it
11. Add final event for execute / pause / block

## Example event sequence

```text
[12:01:02] intake parsed
[12:01:03] governance started
[12:01:04] intent checked
[12:01:04] constraints checked
[12:01:05] validation checked
[12:01:05] consensus checked
[12:01:06] final decision = execute
[12:01:06] markdown report written
```
