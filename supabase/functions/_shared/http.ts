const commonHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, x-admin-password, content-type",
  "Cache-Control": "no-store",
} as const;

const jsonHeaders = {
  ...commonHeaders,
  "Content-Type": "application/json; charset=utf-8",
} as const;

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders,
  });
}

export function jsonError(
  message: string,
  code: string,
  status: number,
): Response {
  return json({ error: message, code }, status);
}

export function preflight(): Response {
  return new Response(null, {
    status: 204,
    headers: commonHeaders,
  });
}

export function methodNotAllowed(): Response {
  return jsonError("Method not allowed", "METHOD_NOT_ALLOWED", 405);
}
