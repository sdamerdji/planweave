import { sql } from "drizzle-orm";
import axios from "axios";
import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { jurisdictions } from "@/src/db/schema";

dotenv.config();

// Connect to the database
const connectToDB = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const client = postgres(connectionString);
  const db = drizzle(client);
  return { client, db };
};

// Function to fetch all incorporated places from Census API
const fetchIncorporatedPlaces = async () => {
  console.log("Fetching incorporated places from Census API...");

  try {
    // Use the Census API to get incorporated places
    // This returns data in JSON format
    const placesResponse = await axios.get(
      "https://api.census.gov/data/2022/acs/acs5?get=NAME&for=place:*&in=state:*"
    );

    const places = placesResponse.data.slice(1).map((place: string[]) => {
      // The NAME field includes both the place name and state abbreviation
      // Format is: "City name, State abbreviation"
      const fullName = place[0];
      const nameParts = fullName.split(",");

      let placeName = nameParts[0].trim();
      let stateAbbr = nameParts[1].trim();

      return {
        jurisdiction: placeName,
        state: stateAbbr,
        is_city: true,
        is_county: false,
      };
    });

    return places;
  } catch (error) {
    console.error("Error fetching incorporated places:", error);
    throw error;
  }
};

// Function to fetch all counties
const fetchCounties = async () => {
  console.log("Fetching counties...");

  try {
    const response = await axios.get(
      "https://api.census.gov/data/2022/acs/acs5?get=NAME&for=county:*&in=state:*"
    );

    const counties = response.data.slice(1).map((county: string[]) => {
      // Format is: "County name, State abbreviation"
      const fullName = county[0];
      const nameParts = fullName.split(",");

      let countyName = nameParts[0].trim();
      let stateAbbr = nameParts[1].trim();

      return {
        jurisdiction: countyName,
        state: stateAbbr,
        is_city: false,
        is_county: true,
      };
    });

    return counties;
  } catch (error) {
    console.error("Error fetching counties:", error);
    throw error;
  }
};

// Function to create the jurisdictions table and populate it with data
export const createAndPopulateJurisdictionsTable = async () => {
  const { client, db } = connectToDB();

  try {
    console.log("Creating jurisdictions table...");

    // Fetch data
    const places = await fetchIncorporatedPlaces();
    const counties = await fetchCounties();

    // Combine all jurisdictions
    let allJurisdictions = [...places, ...counties];

    console.log(
      `Found ${places.length} incorporated places and ${counties.length} counties (raw data)`
    );

    // Deduplicate the data by jurisdiction+state
    const dedupMap = new Map();
    allJurisdictions.forEach((record) => {
      const key = `${record.jurisdiction}|${record.state}`;

      // If this jurisdiction+state already exists, merge the data
      // preferring "true" values for boolean flags
      if (dedupMap.has(key)) {
        const existing = dedupMap.get(key);
        dedupMap.set(key, {
          ...existing,
          is_city: existing.is_city || record.is_city,
          is_county: existing.is_county || record.is_county,
        });
      } else {
        dedupMap.set(key, record);
      }
    });

    // Convert back to array
    allJurisdictions = Array.from(dedupMap.values());

    console.log(
      `Deduplication complete. Processing ${allJurisdictions.length} unique jurisdictions`
    );

    // Insert data into the database
    console.log("Inserting jurisdictions into the database...");

    // Use larger chunks for faster processing
    const chunkSize = 10000;
    let insertedCount = 0;

    for (let i = 0; i < allJurisdictions.length; i += chunkSize) {
      const chunk = allJurisdictions.slice(i, i + chunkSize);

      // Build a single SQL statement with multiple VALUES entries
      const sqlValues = chunk.map((record) => {
        return sql`(${record.jurisdiction}, ${record.state}, ${record.is_city}, ${record.is_county})`;
      });

      // Execute a true bulk insert with multiple value sets
      await db.execute(sql`
        INSERT INTO jurisdictions (jurisdiction, state, is_city, is_county)
        VALUES ${sql.join(sqlValues, sql`, `)}
        ON CONFLICT (jurisdiction, state)
        DO UPDATE SET
          is_city = EXCLUDED.is_city,
          is_county = EXCLUDED.is_county
      `);

      insertedCount += chunk.length;
      console.log(`Inserted ${insertedCount} records so far...`);
    }

    console.log(`Successfully inserted ${insertedCount} jurisdictions`);
  } catch (error) {
    console.error("Error creating and populating jurisdictions table:", error);
    throw error;
  } finally {
    console.log("Closing database connection...");
    await client.end();
  }
};

// Add a dedicated function for command-line execution
const main = async () => {
  try {
    await createAndPopulateJurisdictionsTable();
    console.log("Jurisdictions table created and populated successfully");
  } catch (error) {
    console.error("Failed to create and populate jurisdictions table:", error);
    process.exit(1);
  }
};

// Run the script if executed directly
if (require.main === module) {
  main();
}
