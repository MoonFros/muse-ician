import type { IncomingMessage, ServerResponse } from 'node:http';
import { allowMethods, sendJson } from './_lib/http.js';
import { statusPayload } from './_lib/provider.js';

/** Reports which optional integrations are configured — never any secret values. */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!allowMethods(req, res, ['GET'])) return;
  sendJson(res, 200, statusPayload());
}
