export function base64Decode(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString('ascii');
}

export function throwError(msg?: string) {
  throw new Error(msg);
}
