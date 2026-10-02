// Masks payment card numbers before a message is stored or shown. Pure and
// dependency-free so the browser preview and the server rules agree.

const CARD_NUMBER = /\b(\d{4})[ -]?\d{4}[ -]?\d{4}[ -]?(\d{1,4})\b/g;

export function maskSensitive(text: string) {
  let masked = false;
  const result = text.replace(
    CARD_NUMBER,
    (_match, first: string, last: string) => {
      masked = true;
      return `${first} •••• •••• ${last.padStart(4, "•")}`;
    },
  );
  return { text: result, masked };
}
