import type { AppContext } from '../types';

export const success = (c: AppContext, data: T, message?: string, status: 200 | 201 = 200) => {
  return c.json(
    {
      success: true,
      data,
      ...(message ? { message } : {}),
    },
    status
  );
};

export const error = (
  c: AppContext,
  status: 400 | 401 | 403 | 404 | 422 | 500,
  errorMsg: string,
  details?: any
) => {
  return c.json(
    {
      success: false,
      error: errorMsg,
      ...(details ? { details } : {}),
    },
    status
  );
};