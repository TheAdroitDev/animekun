export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type WithId = {
  id: string;
};

export type PaginationParams = {
  page: number;
  limit: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};