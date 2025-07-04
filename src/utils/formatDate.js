function formatDate(input) {
  const date = new Date(input);
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  return date.toISOString(); // or your desired format
}

module.exports = formatDate; 