import { asterisksToBold } from "@/src/utils";

interface AnswerProps {
  text: string;
}

const parseMarkdownTable = (text: string): string => {
  // Match markdown tables
  const tableRegex = /\|(.+)\|\n\|([-|]+)\|\n((?:\|.+\|\n?)+)/g;

  return text.replace(tableRegex, (match, header, separator, rows) => {
    // Split header and rows into cells
    const headerCells = header
      .split("|")
      .map((cell: string) => cell.trim())
      .filter(Boolean);
    const rowLines = rows.split("\n").filter((line: string) => line.trim());
    const rowCells = rowLines.map((line: string) =>
      line
        .split("|")
        .map((cell: string) => cell.trim())
        .filter(Boolean)
    );

    // Create HTML table
    let html = '<table class="border-collapse border border-slate-300 my-4">';

    // Add header
    html += "<thead><tr>";
    headerCells.forEach((cell: string) => {
      html += `<th class="border border-slate-300 px-4 py-2 bg-slate-100">${cell}</th>`;
    });
    html += "</tr></thead>";

    // Add rows
    html += "<tbody>";
    rowCells.forEach((row: string[]) => {
      html += "<tr>";
      row.forEach((cell: string) => {
        html += `<td class="border border-slate-300 px-4 py-2">${cell}</td>`;
      });
      html += "</tr>";
    });
    html += "</tbody></table>";

    return html;
  });
};

export function Answer({ text }: AnswerProps) {
  // First parse markdown tables
  const textWithTables = parseMarkdownTable(text);
  // Then convert asterisks to bold
  const processedText = asterisksToBold(textWithTables);

  return (
    <p
      className="whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: processedText }}
    />
  );
}
