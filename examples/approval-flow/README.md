# Controlled Mode (Builder) Example: Database Migration

This example demonstrates the **Controlled Mode (Builder/Pro)** flow, where every sensitive operation is previewed and approved by a human.

## 🧠 Input Prompt

> "I need to add a `user_id` column to the `orders` table and update the schema. Please generate the migration script."

## ⚡ Commands Used

```bash
# 1. Select Controlled Mode
codekit /ck-mode builder

# 2. Initialize migration task
codekit /ck-init "Database migration: add user_id to orders"

# 3. Queue the build for preview
codekit /ck-run

# 4. Preview the diff before approval
codekit /ck-preview

# 5. Approve the specific batch for review
codekit /ck-approve-batch <batch_id>

# 6. Execute approved changes
codekit /ck-run
```

## 🛠️ Resulting Artifacts

- `.ck/queue/<batch_id>.json`: The pending migration batch.
- `.ck/previews/diff-<batch_id>.txt`: The line-level diff generated for review.
- `migrations/add-user-id-to-orders.sql`: The final SQL file created upon execution.

## 📊 Before/After Repo State

**Before:**

- `schema.sql` (orders table only has `id`, `amount`).

**After:**

- New `migrations/` folder.
- `schema.sql` updated or migration file added.
- `orders` table now has `user_id` column.
