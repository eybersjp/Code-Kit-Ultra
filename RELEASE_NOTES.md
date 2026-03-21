# Release Notes

## v1.0.0-rc2
This release focuses on shipping safety and productionization:
- hardened CI validation
- release packaging automation
- startup env validation
- runtime hardening policies
- operational runbooks

## Upgrade notes
- copy `.env.example` into `.env`
- run `npm run preflight`
- verify docs and packaging with CI before tagging