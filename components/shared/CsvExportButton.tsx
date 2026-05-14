"use client";

export function CsvExportButton({ fileName, csv }: { fileName: string; csv: string }) {
  function downloadCsv() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={downloadCsv}
      className="primary-button px-3 py-2 text-sm"
    >
      Export CSV
    </button>
  );
}
