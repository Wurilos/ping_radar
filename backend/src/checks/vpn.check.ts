import fs from 'fs';
import { CheckResult } from './ping.check';

/**
 * Checks if an OpenVPN client is connected by reading the OpenVPN status log.
 * The `commonName` is expected to be passed as the host.
 */
export async function openVpnCheck(commonName: string): Promise<CheckResult> {
  const logPath = process.env.OPENVPN_LOG_PATH || 'C:\\openvpn-status.log';
  const startTime = Date.now();

  try {
    if (!fs.existsSync(logPath)) {
      return {
        success: false,
        error: `VPN Log file not found at ${logPath}`,
      };
    }

    const logContent = await fs.promises.readFile(logPath, 'utf8');
    
    // OpenVPN Status Log format usually contains lines like:
    // client_name,192.168.1.1:50000,100,200,Thu Jun 28 09:00:00 2026
    // We split by lines and look for the exact commonName followed by a comma.
    const lines = logContent.split(/\r?\n/);
    const isConnected = lines.some(line => line.startsWith(`${commonName},`));

    const responseTime = Date.now() - startTime;

    if (isConnected) {
      return {
        success: true,
        responseTime, // local file read is practically 0ms, but we log it
        statusCode: 200,
      };
    } else {
      return {
        success: false,
        error: `Client ${commonName} not found in VPN log`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: `Error reading VPN log: ${error.message}`,
    };
  }
}
