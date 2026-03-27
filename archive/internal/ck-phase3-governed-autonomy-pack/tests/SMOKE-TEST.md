# Manual Smoke Test

1. Run /ck-constraints with examples/constraints-policy.json
2. Run /ck-validate with examples/batch.json
3. Run /ck-consensus with examples/consensus-votes.json
4. Call runGovernedAutonomy() with:
   - originalIdea = "Build a dashboard module with a UI shell and basic setup"
   - batch = examples/batch.json
   - policy = examples/constraints-policy.json
   - votes = examples/consensus-votes.json
5. Confirm confidence score and kill switch output are generated.
