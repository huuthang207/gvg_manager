export function validateIngameName(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 32 || /[\x00-\x1F\x7F]/.test(trimmed)) return null;
  return trimmed;
}
