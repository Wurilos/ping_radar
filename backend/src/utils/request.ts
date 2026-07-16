export function getRouteParam(value: string | string[] | undefined, name = 'parameter'): string {
  const resolved = Array.isArray(value) ? value[0] : value;

  if (!resolved) {
    throw new Error(`Missing route ${name}`);
  }

  return resolved;
}
