import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { db } from "@/src/db";
import { rawCivicplusAsset } from "@/src/db/schema";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
// CSV file pattern
const CSV_FILE_PATTERN = /civic_scraper_assets_meta_\d{8}T\d{4}z\.csv$/;
const BASE_DIRECTORY = path.resolve(process.cwd(), '../notebooks/civic-scraper');

// Main function
async function main() {
  try {
    console.log(`Starting import from ${BASE_DIRECTORY}`);
    
    // Get all city directories
    const cityDirs = fs.readdirSync(BASE_DIRECTORY)
      .filter(item => fs.statSync(path.join(BASE_DIRECTORY, item)).isDirectory());
    
    console.log(`Found ${cityDirs.length} city directories`);
    
    for (const cityName of cityDirs) {
      const cityPath = path.join(BASE_DIRECTORY, cityName);
      
      // Get all CSV files in this city directory
      const csvFiles = fs.readdirSync(cityPath)
        .filter(file => CSV_FILE_PATTERN.test(file));
      
      console.log(`Processing ${csvFiles.length} CSV files for ${cityName}`);
      
      for (const csvFile of csvFiles) {
        const csvFilePath = path.join(cityPath, csvFile);
        await processCSVFile(csvFilePath, cityName);
      }
    }
    
    console.log('Import completed successfully');
  } catch (error) {
    console.error('Error during import process:', error);
  } finally {
    await pool.end();
  }
}

// Process a single CSV file
async function processCSVFile(filePath: string, cityName: string) {
  try {
    console.log(`Processing file: ${filePath}`);
    
    // Read and parse CSV file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      
    });
    
    console.log(`Found ${records.length} records in CSV file`);
    
    // Process each record
    for (const record of records) {
      try {
        const meetingId = record.meeting_id;
        
        // Insert into database
        await db.insert(rawCivicplusAsset).values({
          cityName,
          civicplusMeetingId: meetingId,
          assetType: record.asset_type,
          json: record
        });
      } catch (recordError) {
        console.error(`Error processing record: ${cityName}`, recordError);
      }
    }
    console.log(`Successfully processed file: ${filePath}`);
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

// Run the main function
main().catch(console.error); 