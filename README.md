# Deterministic Network Controller (v6.1)

A proactive, self-healing Wi-Fi management system designed for Linux environments. It uses a Betaflight-inspired PID controller to manage recovery escalation and ensures that NetworkManager settings remain enabled.

## Features

1.  **Proactive Enforcement**: Automatically enables "Networking" and "Wi-Fi" in NetworkManager if they are disabled.
2.  **Self-Healing Engine**: A robust bash script (`fix-wifi.sh`) that monitors connectivity and executes recovery actions.
3.  **PID-based Recovery**: Implements a dampened recovery mechanism to prevent over-escalation and "limp mode" for persistent failures.
4.  **Multi-Interface Balancing**: Monitors all network interfaces and adjusts routing metrics to favor stable connections.
5.  **Forensic Telemetry**: Collects detailed system logs (`dmesg`, `journalctl`, `nmcli`) upon detecting network issues.
6.  **Integrated Audit**: Includes a security self-audit (linting) to check for hardcoded credentials and unsafe script patterns.
7.  **Real-time Dashboard**: A React-based frontend to visualize health, logs, and forensic data.

## Installation & Setup

### 1. Environment Variables

Define the following in your `.env` file:

```env
PROJECT_ROOT="/app/applet"
IFACE="wlp2s0b1"
```

### 2. Sudoers Configuration

The script requires `sudo` for certain operations. Add the following to your `/etc/sudoers` file (using `visudo`):

```sudoers
# Allow the app user to run network management commands without a password
<your-user> ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart NetworkManager, /usr/sbin/modprobe, /usr/sbin/ip route, /usr/bin/nmcli
```

### 3. Running the Application

Start the full-stack application:

```bash
npm run dev
```

The server will start on port 3000, serving the React frontend and the API.

## Architecture

- **`fix-wifi.sh`**: The core engine. Runs as a background process or via the API.
- **`server.ts`**: Express server that bridges the engine with the frontend.
- **`App.tsx`**: React dashboard for monitoring and control.
- **`recovery_state.db`**: SQLite database for persistent logs and telemetry.

## Compliance & Security

- **Verbatim Transparency**: All system commands and their outputs are logged to the database.
- **Zero-State Resilience**: The engine initializes its own database and log files if they are missing.
- **Directory Derivation**: All paths are derived from the `PROJECT_ROOT` environment variable.
- **Sanitized Execution**: Commands are executed through a wrapper that logs and captures exit codes.
- **Security Audit**: Use `./fix-wifi.sh --lint` to perform a static analysis of the codebase.

## Troubleshooting

- **Check Logs**: View `fix-wifi.log` for detailed engine output.
- **Audit Findings**: Check the "Security Audit" section in the dashboard for potential script issues.
- **Interface Name**: Ensure `IFACE` matches your system's Wi-Fi interface (check `nmcli device`).
