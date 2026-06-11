import { execSync } from "node:child_process";

const ports = process.argv.slice(2).map(Number).filter(Boolean);

function killPortWindows(port) {
  try {
    const output = execSync(`netstat -ano | findstr ":${port}"`, { encoding: "utf8" });
    const pids = new Set();

    for (const line of output.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts.at(-1);
      if (pid && pid !== "0") pids.add(pid);
    }

    for (const pid of pids) {
      execSync(`taskkill /PID ${pid} /F /T`, { stdio: "ignore" });
      console.log(`Freed port ${port} (PID ${pid})`);
    }
  } catch {
    // Nothing listening on this port.
  }
}

for (const port of ports) {
  if (process.platform === "win32") {
    killPortWindows(port);
  }
}
