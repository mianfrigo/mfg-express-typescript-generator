// Offset pagination for list endpoints: GET /user?page=2&limit=20
// Lenient on purpose: missing or invalid values fall back to the defaults.
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const toInt = (value: unknown, fallback: number) => {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
};

export function parsePaging(query: Record<string, unknown>) {
  const page = Math.max(1, toInt(query.page, 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, toInt(query.limit, DEFAULT_LIMIT)));
  return { page, limit, skip: (page - 1) * limit };
}

export function pageOf<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
