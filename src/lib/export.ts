/**
 * Exports JSON data to CSV file download in browser
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  headers?: { key: keyof T; label: string }[]
) {
  if (!data || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  let csvContent = '';

  if (headers && headers.length > 0) {
    // Custom headers
    csvContent += headers.map((h) => `"${String(h.label).replace(/"/g, '""')}"`).join(',') + '\r\n';
    
    data.forEach((row) => {
      const line = headers
        .map((h) => {
          const val = row[h.key];
          if (val === null || val === undefined) return '""';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',');
      csvContent += line + '\r\n';
    });
  } else {
    // Auto headers
    const keys = Object.keys(data[0]);
    csvContent += keys.map((k) => `"${k}"`).join(',') + '\r\n';

    data.forEach((row) => {
      const line = keys
        .map((k) => {
          const val = row[k];
          if (val === null || val === undefined) return '""';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',');
      csvContent += line + '\r\n';
    });
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
