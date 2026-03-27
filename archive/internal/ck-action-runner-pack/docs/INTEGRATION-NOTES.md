# Integration Notes

## Where this fits
This pack assumes you already have:
- persistent run store
- phase artifacts
- multi-agent execution layer
- mode controller

## Intended flow
1. builder agent emits `BuilderAction[]`
2. action runner validates actions against policy
3. mode controller decides:
   - auto execute
   - require approval
   - block
4. action runner writes:
   - execution artifact
   - action log
   - failure log if needed
5. run store records completed execution batch

## Replaceable executor
The default executor is filesystem/local-shell oriented.
Swap it for Antigravity tool calls if desired:
- write_to_file
- run_command
- create_directory
