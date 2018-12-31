export function base64Decode(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString('ascii');
}

export function base64Encode(input: string): string {
  return Buffer.from(input).toString('base64');
}

export function throwError(msg?: string) {
  throw new Error(msg);
}
