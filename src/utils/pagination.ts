import { AppError } from './AppError';

function parsePositiveInteger(
  value: unknown,
  fallback: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new AppError('Parâmetro de paginação inválido.', 400);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new AppError('Parâmetro de paginação inválido.', 400);
  }
  return parsed;
}

export function parsePagination(query: {
  page?: unknown;
  pageSize?: unknown;
}): { page: number; pageSize: number } {
  return {
    page: parsePositiveInteger(query.page, 1),
    pageSize: parsePositiveInteger(query.pageSize, 20, 100),
  };
}
