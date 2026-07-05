/** Valid ISO 4217 currency codes accepted by the API. */
export const VALID_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD',
  'CNY', 'INR', 'BRL', 'KRW', 'MXN', 'SGD', 'HKD', 'NOK',
  'SEK', 'DKK', 'PLN', 'CZK', 'HUF', 'TRY', 'ZAR', 'THB',
  'TWD', 'UAH', 'ILS', 'AED', 'SAR', 'PHP', 'MYR', 'IDR',
] as const;

/** Valid transaction types. */
export const VALID_TYPES = ['deposit', 'withdrawal', 'transfer'] as const;

/** Account number regex pattern (ACC-XXXXX where X is alphanumeric). */
export const ACCOUNT_PATTERN = '^ACC-[A-Za-z0-9]{5}$';
