import type { IncomingMessage, ServerResponse } from 'node:http';
import { isAuthorizedCronRequest } from '../../server/cronAuth.js';
import { runPreparedDailyReminderJob } from '../../server/notifications.js';

type RequestLike = IncomingMessage & { method?: string };
type ResponseLike = ServerResponse<IncomingMessage> & {
  status?: (code: number) => ResponseLike;
  json?: (body: unknown) => void;
};

function sendJson(response: ResponseLike, status: number, body: unknown) {
  if (response.status && response.json) return response.status(status).json(body);
  response.statusCode = status;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(body));
}

export default async function handler(request: RequestLike, response: ResponseLike) {
  response.setHeader('cache-control', 'no-store');
  if (request.method !== 'GET') return sendJson(response, 405, { ok: false, error: 'Method not allowed.' });
  const authorization = Array.isArray(request.headers.authorization)
    ? request.headers.authorization[0]
    : request.headers.authorization;
  if (!isAuthorizedCronRequest(authorization, process.env.CRON_SECRET)) {
    return sendJson(response, 401, { ok: false, error: 'Unauthorized.' });
  }
  try {
    const result = await runPreparedDailyReminderJob();
    const statusCounts = result.results.reduce<Record<string, number>>((counts, item) => {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
      return counts;
    }, {});
    return sendJson(response, 200, {
      ok: true,
      dayKey: result.dayKey,
      timezone: result.timezone,
      eligibleUsers: result.results.length,
      statusCounts,
    });
  } catch (error) {
    console.error('[DailyNotificationsCron] Execution failed:', error instanceof Error ? error.message : 'unknown error');
    return sendJson(response, 500, { ok: false, error: 'Daily notification job failed.' });
  }
}
