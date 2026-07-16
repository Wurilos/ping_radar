// ==============================================
// PingAlert Pro — HTTP/HTTPS Check
// ==============================================

import { config } from '../config';
import logger from '../config/logger';
import { CheckResult } from './ping.check';

export async function httpCheck(host: string, timeout?: number): Promise<CheckResult> {
  const timeoutMs = timeout || config.monitoring.httpTimeout;

  // Ensure URL has protocol
  let url = host;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'PingAlert-Pro/1.0 (Monitoring)',
      },
    });
    const responseTime = Date.now() - startTime;

    clearTimeout(timeoutId);

    // Consider 2xx and 3xx as success
    const success = response.status >= 200 && response.status < 400;

    return {
      success,
      responseTime,
      statusCode: response.status,
      error: success ? undefined : `HTTP ${response.status} ${response.statusText}`,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    let errorMsg = error.message || 'Unknown error';
    if (error.name === 'AbortError') {
      errorMsg = `Request timeout (${timeoutMs}ms)`;
    } else if (error.cause?.code === 'ECONNREFUSED') {
      errorMsg = 'Connection refused';
    } else if (error.cause?.code === 'ENOTFOUND') {
      errorMsg = 'DNS lookup failed';
    } else if (error.cause?.code === 'CERT_HAS_EXPIRED') {
      errorMsg = 'SSL certificate expired';
    }

    return {
      success: false,
      responseTime: null,
      error: errorMsg.substring(0, 200),
    };
  }
}
