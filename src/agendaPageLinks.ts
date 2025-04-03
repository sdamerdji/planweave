import fs from "fs";
import path from "path";

interface AgendaPageLink {
  jurisdiction: string;
  agendaPageUrl: string;
}

// Read and parse the CSV file
const csvPath = path.join(process.cwd(), "data", "agenda_page_links.csv");
const csvContent = fs.readFileSync(csvPath, "utf-8");

// Parse CSV content into structured data
const agendaPageLinks: AgendaPageLink[] = csvContent
  .split("\n")
  .slice(1) // Skip header row
  .filter((line) => line.trim()) // Remove empty lines
  .map((line) => {
    const [jurisdiction, agendaPageUrl] = line
      .split(",")
      .map((field) => field.trim());
    return {
      jurisdiction,
      agendaPageUrl: agendaPageUrl?.replace(/^"|"$/g, "") ?? "", // Remove quotes if present
    };
  })
  .filter((link) => link.agendaPageUrl);

export default agendaPageLinks;
