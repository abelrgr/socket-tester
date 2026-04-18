let counter = 0;

export function v4(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  counter++;
  return `${Date.now().toString(16)}-${counter.toString(16)}-4xxx-yxxx`.replace(
    /[xy]/g,
    (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    },
  );
}
