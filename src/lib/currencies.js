const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', JPY: '¥',
  INR: '₹', BRL: 'R$', MXN: 'MX$', ZAR: 'R', ILS: '₪', AED: 'د.إ',
  CHF: 'Fr', SEK: 'kr', NOK: 'kr', NZD: 'NZ$',
};

export function getCurrencySymbol(code) {
  return CURRENCY_SYMBOLS[code] || code || '$';
}

export function formatPrice(price, currency) {
  return `${getCurrencySymbol(currency)}${price?.toLocaleString()}`;
}