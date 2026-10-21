export function parseTransactions(text) {
  const transactions = [];
  const errors = [];
  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;
    const parts = line.split(',');
    const date = parts[0].trim();
    if (index === 0 && /fecha|date/i.test(date)) return; // header row
    const amount = Number(parts[parts.length - 1].trim());
    const description = parts.slice(1, -1).join(',').trim();
    if (parts.length < 3 || !description || !Number.isFinite(amount) || amount <= 0) {
      errors.push(`Línea ${index + 1}: usa el formato fecha,descripción,monto (por ejemplo 2026-09-05,Starbucks,22)`);
      return;
    }
    transactions.push({ date, description, amount });
  });
  return { transactions, errors };
}