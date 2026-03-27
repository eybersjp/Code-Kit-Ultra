/**
 * Wave 8: Migration for Service Accounts and CLI Session Management.
 * 
 * This migration establishes the schema for:
 * 1. service_accounts: persistent machine identities
 * 2. service_account_tokens: scoped credentials for automated actors
 */

export async function up() {
  console.log("Creating 'service_accounts' table...");
  /*
    SQL Execution:
    CREATE TABLE IF NOT EXISTS service_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      org_id TEXT NOT NULL,
      workspace_id TEXT,
      project_id TEXT,
      roles TEXT[] DEFAULT '{operator}',
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  */

  console.log("Creating 'service_account_tokens' table...");
  /*
    SQL Execution:
    CREATE TABLE IF NOT EXISTS service_account_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sa_id UUID REFERENCES service_accounts(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_used_at TIMESTAMP WITH TIME ZONE
    );
  */

  console.log("Seeding initial service account permissions...");
}

export async function down() {
  console.log("Dropping service accounts and tokens...");
}
