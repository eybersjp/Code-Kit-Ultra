# Security Runbooks

Incident response procedures, credential rotation, audit procedures, and security management for Code Kit Ultra.

## Security Incident Response

### Triage Flowchart

```
Incident Detected
  ├─ Critical?
  │  ├─ YES → Page on-call → Activate incident commander → Isolate system
  │  └─ NO → Open ticket → Schedule review → Monitor
  │
  ├─ Suspected breach?
  │  ├─ YES → Preserve evidence → Rotate credentials → Review logs
  │  └─ NO → Diagnose issue → Apply fix → Verify resolution
  │
  └─ Escalate if needed → Director of Eng → Legal → Comms
```

### Severity Levels

| Level | Impact | Response Time | Example |
|-------|--------|---|---------|
| **Critical** | System down, data loss risk | 15 min | Ransomware, active exfiltration |
| **High** | Partial outage, auth bypass | 30 min | Privilege escalation, password compromise |
| **Medium** | Degraded security, minor exposure | 1 hour | Unpatched vulnerability, weak auth |
| **Low** | Policy violation, no risk | 1 day | Missing audit log, weak config |

### Incident Response Timeline

**First 15 minutes (Stop the bleeding):**

1. Declare incident (Slack #incidents)
2. Identify severity level
3. Page on-call team if Critical/High
4. Isolate affected systems (if necessary)
5. Stop data exfiltration if detected
6. Preserve evidence (don't restart services immediately)

**Next 30 minutes (Understand the issue):**

7. Gather information
   - What happened?
   - When did it start?
   - Who/what is affected?
   - How did we detect it?

8. Determine root cause
   - Review logs and metrics
   - Check for external indicators
   - Interview affected users

9. Identify scope
   - How many systems affected?
   - How much data exposed?
   - What access was gained?

**Next 2 hours (Remediate):**

10. Apply immediate fix
11. Verify fix works
12. Rotate compromised credentials
13. Review similar systems for same issue

**Post-incident (Learn):**

14. Document timeline
15. Root cause analysis
16. Preventive measures
17. Post-mortem meeting (within 48 hours)

---

## Credential Rotation Procedures

### InsForge API Key Rotation

**Trigger:** Monthly, or on suspected compromise

**Procedure:**

```bash
# Step 1: Generate new API key in InsForge dashboard
# Settings → API Keys → Generate New Key
# Copy new key, save securely

# Step 2: Update environment variable
export ANTIGRAVITY_API_KEY="new-key-xxx"

# Step 3: Test with new key
curl -H "Authorization: Bearer $ANTIGRAVITY_API_KEY" \
  https://api.antigravity.dev/health

# Step 4: Verify control-service can still authenticate
docker compose logs control-service | grep -i "insforge\|auth" | tail -5

# Step 5: Update in all environments
# Docker: .env file
# Kubernetes: Secret object
# CI/CD: Repository secrets

# Step 6: Disable old key in InsForge dashboard
# Wait 30 days to ensure all systems using new key
# Then revoke old key

# Step 7: Verify no alerts about auth failure
sleep 300
docker compose logs control-service | grep -i "auth.*fail"

# Step 8: Log rotation in audit system
docker compose exec postgres psql -U postgres -d codekit -c "
  INSERT INTO audit_log (action, subject, details) 
  VALUES ('credential_rotation', 'antigravity_api_key', 'new_key_activated');
"
```

### Database Password Rotation

**Trigger:** Quarterly, or on suspected compromise

**Procedure:**

```bash
# Step 1: Generate strong password
NEW_PASSWORD=$(openssl rand -base64 32)
echo "New password: $NEW_PASSWORD"

# Step 2: Update PostgreSQL user password
docker compose exec postgres psql -U postgres -c "
  ALTER USER codekit_user WITH PASSWORD '$NEW_PASSWORD';
"

# Step 3: Update connection string
# Old: postgresql://codekit_user:old_pass@localhost:5432/codekit
# New: postgresql://codekit_user:$NEW_PASSWORD@localhost:5432/codekit

# Step 4: Update in .env
sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://codekit_user:${NEW_PASSWORD}@localhost:5432/codekit|" .env

# Step 5: Verify connection works
docker compose down && docker compose up postgres -d
sleep 5
docker compose exec postgres pg_isready -U codekit_user -c

# Step 6: Restart dependent services
docker compose up -d control-service

# Step 7: Test API is working
curl http://localhost:7474/health

# Step 8: Verify no auth errors in logs
docker compose logs control-service | grep -i "password\|auth.*fail" | wc -l
# Should be 0

# Step 9: Record in audit log
docker compose exec postgres psql -U postgres -d codekit -c "
  INSERT INTO audit_log (action, subject, details, created_by) 
  VALUES ('credential_rotation', 'db_password', 'rotated_quarterly', 'automation');
"

# Step 10: Securely communicate password to authorized users
# Use secure channel (1Password, LastPass, Vault)
# Do NOT send in Slack/Email
```

### Service Account Token Rotation

**Trigger:** Semi-annually, or on role change

**Procedure:**

```bash
# Step 1: Generate new token
NEW_TOKEN=$(pnpm --filter auth run generate-token \
  --subject=control-service \
  --permissions=runs:read,runs:write,gates:read,gates:approve \
  --expiry=6m)

# Step 2: Update control-service configuration
docker compose exec control-service env | grep SERVICE_ACCOUNT_TOKEN
# Verify old token currently in use

# Step 3: Update in all environments
# Docker: Update docker-compose.yml environment
# Kubernetes: Update Secret
# CI/CD: Update environment variable

# Step 4: Test new token
curl -H "Authorization: Bearer $NEW_TOKEN" \
  http://localhost:7474/runs

# Step 5: Deploy new token
docker compose restart control-service

# Step 6: Verify successful auth
sleep 5
docker compose logs control-service | grep -i "token\|auth" | head -10

# Step 7: Revoke old token
pnpm --filter auth run revoke-token --token="old-token-xxx"

# Step 8: Verify old token no longer works
# Should get 401 Unauthorized
curl -H "Authorization: Bearer old-token-xxx" \
  http://localhost:7474/runs 2>&1 | grep "401"

# Step 9: Record in audit log
docker compose exec postgres psql -U postgres -d codekit -c "
  INSERT INTO audit_log (action, subject, details) 
  VALUES ('token_rotation', 'service_account_token', 'new_token_activated');
"
```

### JWT Signing Key Rotation

**Trigger:** Annually, or if key is compromised

**Procedure:**

```bash
# WARNING: This affects all existing tokens!
# Plan for 1-2 hours of potential auth issues

# Step 1: Generate new JWT key
NEW_JWT_KEY=$(openssl rand -base64 64)
NEW_JWT_KEY_ID=$(uuidgen)

# Step 2: Update JWT configuration
docker compose exec postgres psql -U postgres -d codekit -c "
  INSERT INTO jwt_keys (key_id, key, is_active, created_at) 
  VALUES ('$NEW_JWT_KEY_ID', '$NEW_JWT_KEY', true, now());
  
  UPDATE jwt_keys SET is_active = false 
  WHERE key_id != '$NEW_JWT_KEY_ID';
"

# Step 3: Update environment variable
export JWT_SIGNING_KEY="$NEW_JWT_KEY"
export JWT_KEY_ID="$NEW_JWT_KEY_ID"

# Step 4: Restart services to use new key
docker compose restart control-service

# Step 5: Re-issue all active tokens
pnpm --filter auth run reissue-all-tokens

# Step 6: Users may need to re-login
# Monitor support tickets for auth issues

# Step 7: After 7 days, remove old key from database
docker compose exec postgres psql -U postgres -d codekit -c "
  DELETE FROM jwt_keys 
  WHERE key_id != '$NEW_JWT_KEY_ID' 
  AND created_at < now() - interval '7 days';
"

# Step 8: Verify no auth errors in logs
docker compose logs control-service | grep -i "jwt\|token.*invalid"
```

---

## Token Revocation Procedures

### Immediate Revocation (Compromise)

**Scenario:** Token leaked, needs immediate revocation

```bash
# Step 1: Identify token to revoke
TOKEN_ID="token-xyz-123"
curl http://localhost:7474/tokens/$TOKEN_ID

# Step 2: Revoke immediately
curl -X DELETE http://localhost:7474/tokens/$TOKEN_ID \
  -H "Authorization: Bearer admin-token"

# Step 3: Verify revocation
curl http://localhost:7474/tokens/$TOKEN_ID
# Should return 404

# Step 4: Check audit log
docker compose exec postgres psql -U postgres -d codekit -c "
  SELECT * FROM audit_log 
  WHERE action = 'token_revocation' 
  AND subject = '$TOKEN_ID' 
  ORDER BY created_at DESC LIMIT 1;
"

# Step 5: Monitor for unauthorized attempts
# Revoked token should be rejected immediately
docker compose logs control-service | grep "revoked.*token"

# Step 6: Notify token holder
# Send secure notification (Slack DM, email)
# Advise them to request new token
```

### Gradual Revocation (Planned)

**Scenario:** Long-lived token, rotating on schedule

```bash
# Step 1: Create new token first
NEW_TOKEN=$(pnpm --filter auth run generate-token \
  --subject=user-xyz \
  --expiry=30d)

# Step 2: Notify user of new token
# "Your token is being rotated. New token: ..."

# Step 3: Grace period (7 days)
# Old and new tokens both valid

# Step 4: Schedule revocation
docker compose exec postgres psql -U postgres -d codekit -c "
  UPDATE tokens 
  SET revoked_at = now() + interval '7 days'
  WHERE id = 'old-token-123';
"

# Step 5: After grace period, force revocation
docker compose exec postgres psql -U postgres -d codekit -c "
  DELETE FROM tokens 
  WHERE id = 'old-token-123' 
  AND revoked_at < now();
"

# Step 6: Verify old token no longer works
curl -H "Authorization: Bearer old-token-123" \
  http://localhost:7474/runs
# Should return 401 Unauthorized
```

### Bulk Revocation (Suspected Breach)

**Scenario:** Multiple tokens may be compromised, revoke all for user

```bash
# Step 1: Identify affected user(s)
USER_ID="user-xyz"

# Step 2: Revoke all their tokens
docker compose exec postgres psql -U postgres -d codekit -c "
  UPDATE tokens 
  SET revoked_at = now()
  WHERE subject = '$USER_ID' AND revoked_at IS NULL;
"

# Step 3: Force re-authentication
# Clear their sessions
docker compose exec postgres psql -U postgres -d codekit -c "
  DELETE FROM sessions 
  WHERE user_id = '$USER_ID';
"

# Step 4: Notify user
# "All your tokens have been revoked due to a security incident."
# "Please log in again."

# Step 5: Require password reset
# User must reset password before getting new token

# Step 6: Monitor for suspicious activity
docker compose logs control-service | grep "failed.*auth" | grep "$USER_ID"

# Step 7: Complete audit log entry
docker compose exec postgres psql -U postgres -d codekit -c "
  INSERT INTO audit_log (action, subject, details, severity) 
  VALUES ('bulk_token_revocation', '$USER_ID', 'suspected_breach', 'high');
"
```

---

## Audit Log Review Procedures

### Daily Security Review

**Frequency:** Every morning (automated or manual)

```bash
# Step 1: Check for errors
docker compose exec postgres psql -U postgres -d codekit -c "
  SELECT COUNT(*) as error_count 
  FROM audit_log 
  WHERE created_at > now() - interval '24 hours' 
  AND severity = 'error';
"
# Alert if error_count > 10

# Step 2: Check for unauthorized access attempts
docker compose exec postgres psql -U postgres -d codekit -c "
  SELECT subject, COUNT(*) as attempt_count 
  FROM audit_log 
  WHERE action LIKE 'auth%fail%' 
  AND created_at > now() - interval '24 hours' 
  GROUP BY subject 
  HAVING COUNT(*) > 5;
"

# Step 3: Check for privilege escalation
docker compose exec postgres psql -U postgres -d codekit -c "
  SELECT * FROM audit_log 
  WHERE action = 'role_change' 
  AND created_at > now() - interval '24 hours' 
  ORDER BY created_at DESC;
"

# Step 4: Check for data access anomalies
docker compose exec postgres psql -U postgres -d codekit -c "
  SELECT subject, COUNT(*) as access_count 
  FROM audit_log 
  WHERE action = 'data_access' 
  AND created_at > now() - interval '24 hours' 
  GROUP BY subject 
  HAVING COUNT(*) > 1000;
"

# Step 5: Review configuration changes
docker compose exec postgres psql -U postgres -d codekit -c "
  SELECT * FROM audit_log 
  WHERE action LIKE 'config%' 
  AND created_at > now() - interval '24 hours';
"
```

### Hash Chain Integrity Verification

**Frequency:** Weekly

```bash
# Step 1: Export audit log
docker compose exec postgres psql -U postgres -d codekit -c "
  SELECT id, previous_hash, hash, data 
  FROM audit_log 
  WHERE created_at > now() - interval '7 days' 
  ORDER BY created_at ASC;" > audit-export.csv

# Step 2: Verify hash chain
pnpm --filter cli run verify-audit-chain --file=audit-export.csv

# Step 3: Check result
# Expected: "Hash chain valid: 1000/1000 entries"

# Step 4: If verification fails, investigate
# - Check for corrupted entries
# - Identify when corruption started
# - Restore from backup if necessary

# Step 5: Report findings
# Create ticket if any issues found
```

### Anomaly Detection

**Frequency:** Real-time (automated)

```bash
# Set up alert rules in PostgreSQL
docker compose exec postgres psql -U postgres -d codekit << 'EOF'
CREATE TRIGGER audit_anomaly_check
BEFORE INSERT ON audit_log
FOR EACH ROW
EXECUTE FUNCTION check_audit_anomalies();

CREATE FUNCTION check_audit_anomalies()
RETURNS TRIGGER AS $$
BEGIN
  -- Flag unusual auth failures (>10 in 1 hour)
  IF (SELECT COUNT(*) FROM audit_log 
      WHERE action LIKE 'auth%fail%' 
      AND subject = NEW.subject 
      AND created_at > now() - interval '1 hour') > 10 THEN
    RAISE EXCEPTION 'Unusual auth failure pattern detected';
  END IF;
  
  -- Flag data exfiltration attempts (>100 records in 1 min)
  IF (SELECT COUNT(*) FROM audit_log 
      WHERE action = 'data_export' 
      AND subject = NEW.subject 
      AND created_at > now() - interval '1 minute') > 100 THEN
    RAISE EXCEPTION 'Possible data exfiltration detected';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
EOF

# Monitor alerts
docker compose logs postgres | grep "EXCEPTION\|anomal" | tail -20
```

---

## Access Control Management

### User Onboarding

**Procedure for new team member:**

```bash
# Step 1: Create user account
pnpm --filter auth run create-user \
  --email=newuser@company.com \
  --name="New User" \
  --role=operator

# Step 2: Generate temporary token
TEMP_TOKEN=$(pnpm --filter auth run generate-temp-token \
  --user=newuser@company.com \
  --expiry=1h)

# Step 3: Send securely (1Password, not Slack)
# "Welcome! Your temporary token: $TEMP_TOKEN"
# "This expires in 1 hour. Set a permanent token after login."

# Step 4: User sets up API key
# Login → Settings → API Keys → Generate New Key

# Step 5: Verify access
curl -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:7474/health

# Step 6: Record in audit log
docker compose exec postgres psql -U postgres -d codekit -c "
  INSERT INTO audit_log (action, subject, details, created_by) 
  VALUES ('user_created', 'newuser@company.com', 'operator_role', 'admin');
"

# Step 7: Schedule permissions review (3 months)
echo "Review permissions for newuser@company.com" | \
  mail -s "User onboarding follow-up" security@company.com
```

### User Offboarding

**Procedure for departing team member:**

```bash
# Step 1: Disable user account immediately
pnpm --filter auth run disable-user --email=departing@company.com

# Step 2: Revoke all tokens
docker compose exec postgres psql -U postgres -d codekit -c "
  UPDATE tokens 
  SET revoked_at = now()
  WHERE subject = 'departing@company.com' AND revoked_at IS NULL;
"

# Step 3: Clear sessions
docker compose exec postgres psql -U postgres -d codekit -c "
  DELETE FROM sessions WHERE user_id = 
  (SELECT id FROM users WHERE email = 'departing@company.com');
"

# Step 4: Audit user's recent activities
docker compose exec postgres psql -U postgres -d codekit -c "
  SELECT action, subject, created_at 
  FROM audit_log 
  WHERE created_by = 'departing@company.com' 
  OR subject = 'departing@company.com'
  ORDER BY created_at DESC LIMIT 100;
"

# Step 5: Verify no access
curl -H "Authorization: Bearer old-user-token" \
  http://localhost:7474/health
# Should return 401

# Step 6: Record offboarding
docker compose exec postgres psql -U postgres -d codekit -c "
  INSERT INTO audit_log (action, subject, details) 
  VALUES ('user_offboarded', 'departing@company.com', 'all_access_revoked');
"

# Step 7: Transfer ownership of runs/gates to another user
# Manual process: identify and reassign
```

### Permission Audit

**Procedure (Quarterly):**

```bash
# Step 1: Export all permissions
docker compose exec postgres psql -U postgres -d codekit -c "
  SELECT u.email, r.name as role, p.permission 
  FROM users u 
  JOIN user_roles ur ON u.id = ur.user_id 
  JOIN roles r ON ur.role_id = r.id 
  JOIN role_permissions rp ON r.id = rp.role_id 
  JOIN permissions p ON rp.permission_id = p.id 
  ORDER BY u.email, r.name;" > permissions-audit.csv

# Step 2: Review for anomalies
# - Users with excessive permissions?
# - Stale users still having access?
# - Roles aligned with job responsibilities?

# Step 3: Revoke unnecessary permissions
# For each user needing adjustment:
pnpm --filter auth run revoke-permission \
  --user=user@company.com \
  --permission=runs:delete

# Step 4: Document changes
# Create ticket for each change

# Step 5: Verify changes
docker compose logs control-service | grep "permission.*revoked"
```

---

## Network Security

### IP Whitelisting

**For control-service API:**

```nginx
# In nginx reverse proxy
upstream control_service {
  server 127.0.0.1:7474;
}

# Allow only trusted IPs
geo $allow_ip {
  default 0;
  10.0.0.0/8 1;  # Internal network
  203.0.113.0/24 1;  # VPN
}

server {
  listen 443 ssl;
  location / {
    if ($allow_ip = 0) {
      return 403;
    }
    proxy_pass http://control_service;
  }
}
```

### Rate Limiting

**Per endpoint limits:**

```typescript
import rateLimit from 'express-rate-limit';

// Auth endpoint: 5 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.'
});

// API endpoint: 100 requests per minute
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
});

// Gate approval: 10 per hour (rate limiting approval spam)
const approveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10
});

app.post('/login', authLimiter, loginHandler);
app.get('/runs', apiLimiter, listRunsHandler);
app.post('/gates/:id/approve', approveLimiter, approveGateHandler);
```

### DDoS Protection

**Enable CloudFlare or similar:**

```bash
# CloudFlare settings
# - DDoS Protection: Advanced
# - Rate Limiting: 100 req/min per IP
# - Challenge for suspicious traffic
# - WAF rules enabled

# Monitor DDoS attacks
docker compose logs nginx | grep "429\|403" | wc -l
```

---

## Data Privacy

### Data Classification

| Level | Examples | Encryption | Retention |
|-------|----------|-----------|-----------|
| **Public** | API docs, status page | Optional | Unlimited |
| **Internal** | Run logs, gate decisions | Recommended | 2 years |
| **Confidential** | API keys, passwords | Required | 1 year |
| **Restricted** | Personal data, payment info | Required | Minimal |

### Encryption at Rest

```bash
# PostgreSQL encryption
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/etc/postgresql/server.crt';
ALTER SYSTEM SET ssl_key_file = '/etc/postgresql/server.key';
SELECT pg_reload_conf();

# Verify encryption
docker compose exec postgres psql -U postgres -c "
  SELECT name, setting FROM pg_settings WHERE name LIKE 'ssl%';
"

# Redis encryption
docker compose exec redis redis-cli CONFIG SET requirepass "strong_password"
docker compose exec redis redis-cli CONFIG SET appendonly yes
```

### Encryption in Transit

```bash
# TLS for control-service
export TLS_CERT=/path/to/cert.pem
export TLS_KEY=/path/to/key.pem

# Verify HTTPS only
curl -k https://localhost:7474/health
# Should work

curl http://localhost:7474/health
# Should fail or redirect to HTTPS

# Check cipher suites
openssl s_client -connect localhost:7474
# Verify strong ciphers (TLS 1.2+)
```

---

## Cross-References

**Depends on:**
- [DEPLOYMENT.md](DEPLOYMENT.md) — Environment setup
- [control-service](../apps/control-service/CLAUDE.md) — API authentication
- [auth package](../packages/auth/CLAUDE.md) — Token system

**Related guides:**
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — Debugging security issues
- [MIGRATION.md](MIGRATION.md) — Secure upgrades
- [Root CLAUDE.md](../CLAUDE.md) — System overview
