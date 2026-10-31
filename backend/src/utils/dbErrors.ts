// 11000 is MongoDB's "duplicate key" error: a unique index refused the insert
export const isDuplicateKeyError = (error: unknown): boolean => {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000;
};
