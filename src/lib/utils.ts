// Shared utility functions

export const formatCurrency = (val: number) => `₹${(val / 10000000).toFixed(2)} Cr`;

/**
 * Export an array of flat objects to a CSV file download.
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row =>
    Object.values(row)
      .map(val => (typeof val === 'string' && val.includes(',') ? `"${val}"` : val))
      .join(',')
  );
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

