// ==============================================
// PingAlert Pro — TCP Port Check
// ==============================================

import net from 'net';
import { config } from '../config';
import { CheckResult } from './ping.check';

export async function tcpCheck(host: string, port: number, timeout?: number): Promise<CheckResult> {
  const timeoutMs = timeout || config.monitoring.tcpTimeout;

  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      const responseTime = Date.now() - startTime;
      socket.destroy();
      resolve({
        success: true,
        responseTime,
      });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({
        success: false,
        responseTime: null,
        error: `TCP connection timeout (${timeoutMs}ms)`,
      });
    });

    socket.on('error', (error: any) => {
      socket.destroy();
      let errorMsg = error.message || 'Unknown error';
      if (error.code === 'ECONNREFUSED') {
        errorMsg = `Connection refused on port ${port}`;
      } else if (error.code === 'ENOTFOUND') {
        errorMsg = 'DNS lookup failed';
      } else if (error.code === 'EHOSTUNREACH') {
        errorMsg = 'Host unreachable';
      }

      resolve({
        success: false,
        responseTime: null,
        error: errorMsg.substring(0, 200),
      });
    });

    socket.connect(port, host);
  });
}
