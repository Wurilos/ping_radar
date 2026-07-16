// ==============================================
// PingAlert Pro — Ping/ICMP Check
// ==============================================

import { exec } from 'child_process';
import { config } from '../config';
import logger from '../config/logger';

export interface CheckResult {
  success: boolean;
  responseTime: number | null;
  statusCode?: number;
  error?: string;
}

export async function pingCheck(host: string, timeout?: number): Promise<CheckResult> {
  const timeoutMs = timeout || config.monitoring.pingTimeout;
  const timeoutSec = Math.ceil(timeoutMs / 1000);

  return new Promise((resolve) => {
    // Use OS ping command (works on Windows, Linux, Mac)
    const isWindows = process.platform === 'win32';
    const cmd = isWindows
      ? `ping -n 1 -w ${timeoutMs} ${host}`
      : `ping -c 1 -W ${timeoutSec} ${host}`;

    const startTime = Date.now();

    exec(cmd, { timeout: timeoutMs + 2000 }, (error, stdout, stderr) => {
      const elapsed = Date.now() - startTime;

      if (error) {
        resolve({
          success: false,
          responseTime: null,
          error: `Ping failed: ${error.message.substring(0, 200)}`,
        });
        return;
      }

      // Parse response time from stdout
      let responseTime: number | null = null;

      if (isWindows) {
        // Windows: "Reply from x.x.x.x: bytes=32 time=10ms TTL=57"
        const match = stdout.match(/time[=<](\d+)ms/i);
        if (match) responseTime = parseInt(match[1], 10);
        
        // Check for "Request timed out" or "Destination host unreachable"
        if (stdout.includes('Request timed out') || stdout.includes('Destination host unreachable') || stdout.includes('could not find host')) {
          resolve({
            success: false,
            responseTime: null,
            error: 'Host unreachable',
          });
          return;
        }
      } else {
        // Linux/Mac: "64 bytes from x.x.x.x: icmp_seq=1 ttl=57 time=10.2 ms"
        const match = stdout.match(/time[=<]([\d.]+)\s*ms/i);
        if (match) responseTime = parseFloat(match[1]);

        if (stdout.includes('100% packet loss') || stdout.includes('Destination Host Unreachable')) {
          resolve({
            success: false,
            responseTime: null,
            error: 'Host unreachable',
          });
          return;
        }
      }

      resolve({
        success: true,
        responseTime: responseTime || elapsed,
      });
    });
  });
}
