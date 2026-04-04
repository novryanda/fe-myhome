type ExcelCellValue = string | number | boolean | null | undefined;

export async function exportRowsToExcel(
  rows: Array<Record<string, ExcelCellValue>>,
  options: {
    fileName: string;
    sheetName: string;
  },
) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(rows);

  const headers = rows.length ? Object.keys(rows[0]) : [];
  worksheet["!cols"] = headers.map((header) => {
    const maxLength = rows.reduce((current, row) => {
      const value = row[header];
      const next = value == null ? 0 : String(value).length;
      return Math.max(current, next);
    }, header.length);

    return { wch: Math.min(Math.max(maxLength + 2, 12), 40) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName);
  XLSX.writeFileXLSX(workbook, options.fileName);
}
