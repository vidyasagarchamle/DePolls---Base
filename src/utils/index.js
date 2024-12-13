// Date utilities
export const formatDate = (timestamp) => {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Validation utilities
export const isValidAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const validatePollOptions = (options) => {
  const uniqueOptions = new Set(options.map(opt => opt.toLowerCase()));
  return uniqueOptions.size === options.length;
};

// Format utilities
export const truncateAddress = (address, startLength = 6, endLength = 4) => {
  if (!address) return '';
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

// Error handling utilities
export const getErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return 'An unknown error occurred';
}; 