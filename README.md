# Deterministic Network Controller (v6.1-Upgraded)

A high-performance, self-healing Wi-Fi management engine designed for mission-critical reliability. This system implements a "Nuclear" recovery strategy for hardware failures, advanced telemetry collection, and deterministic environment reconciliation.

## Core Features

- **Self-Healing Engine**: Proactive monitoring and recovery of Wi-Fi interfaces with Betaflight-style PID dampening for escalation.
- **Verbatim Telemetry**: Captures 16 diagnostic sources (dmesg, journalctl, nmcli, etc.) with real-time terminal transparency.
- **Hardware Recovery**: Specialized recovery paths for `b43` and other problematic Broadcom hardware via aggressive module reloading.
- **Deterministic Updates**: Atomic reconciliation of local changes, upstream pulls, and environment restoration via `sync-updates.sh`.
- **Security Self-Audit**: Integrated v6.3 linting engine for static analysis and secret detection.
- **Directory Derivation**: Strict compliance with `PROJECT_ROOT` derivation for all paths and binaries.

## Technical Architecture

### 1. The Healing Engine (`fix-wifi.sh`)
The core engine runs in a continuous loop, performing health checks and executing recovery blocks. It uses a forensic database (`forensics.db`) to track recovery success rates and optimize escalation strategies.

### 2. Reconciliation Layer (`sync-updates.sh`)
Ensures the development environment is always in a known-good state. It handles git rebasing, dependency installation, and integrity verification in a single deterministic flow.

### 3. Controller API (`server.ts`)
An Express-based API that exposes the engine's functionality to the frontend, allowing for remote diagnostics, linting, and recovery triggers.

## Usage

### Cold-Start Recovery
To perform a cold-start recovery in a zero-state environment, execute the following verbatim:

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
export PROJECT_ROOT=$(pwd)
export IFACE="wlp2s0b1"

# 3. Initialize database and log (via engine check)
sudo PROJECT_ROOT=$PROJECT_ROOT bash fix-wifi.sh $PROJECT_ROOT --audit

# 4. Start the controller
npm run dev
```

### Common Commands
- **Run Audit**: `npm run audit` (Verifies the forensic database and system settings).
- **Sync Updates**: `npm run sync-updates` (Reconciles local and upstream states).
- **Static Analysis**: `./fix-wifi.sh $PROJECT_ROOT --lint` (Runs the v6.3 linting engine).

## Compliance & Governance

This repository adheres to the following strict compliance rules:
1. Restore all telemetry data (ensure verbatim transparency in terminal).
2. Fix recovery failures (especially for b43 hardware).
3. Number the requests in the code comments.
4. Fix each request individually.
5. Emit upgraded code repository.
6. Limit prose to verbose code comments.
7. Include cutting-edge best practices linting code (v6.3).

## Troubleshooting

- **Check Logs**: View `verbatim_handshake.log` and `fix-wifi.log` for detailed output.
- **Audit Findings**: Check the "Security Audit" section in the dashboard for potential script issues.
- **Interface Name**: Ensure `IFACE` matches your system's Wi-Fi interface (check `nmcli device`).
