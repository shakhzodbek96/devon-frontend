// Client-side "Excel" export for the tabel registry — no server endpoint,
// no heavy spreadsheet library (PLAN_tabel-davomat.md §4). An HTML table
// blob served with an Excel MIME type opens directly in Excel/LibreOffice,
// same trick as the prototype's `exportExcel()`.

export function exportHtmlTableAsExcel(filename: string, headers: string[], rows: string[][]): void {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const headHtml = `<tr>${headers.map((h) => `<th>${escape(h)}</th>`).join('')}</tr>`;
  const bodyHtml = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join('')}</tr>`)
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table border="1">${headHtml}${bodyHtml}</table></body></html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
