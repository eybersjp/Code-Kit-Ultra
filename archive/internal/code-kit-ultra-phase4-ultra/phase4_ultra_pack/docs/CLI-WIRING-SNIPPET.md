# CLI Wiring Snippet

Below is the minimal pattern to register the new commands in your existing CLI.

```ts
import { handleTrace } from "./handlers/trace";
import { handleTimeline } from "./handlers/timeline";
import { handleScoreExplain } from "./handlers/score-explain";
import { handleReport } from "./handlers/report";

// inside your command router
if (command === "/ck-trace") {
  handleTrace(payload);
}

if (command === "/ck-timeline") {
  handleTimeline(payload);
}

if (command === "/ck-score-explain") {
  handleScoreExplain(payload);
}

if (command === "/ck-report") {
  handleReport(payload);
}
```
