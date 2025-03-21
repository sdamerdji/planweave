#!/bin/bash

# Define an array of cities
cities=("sunnyvaleca" "mountainview" "hesperia" "santabarbara" "alameda" "oakland" "sanbernardino" 
	"hayward" "napa" "cityoforange" "contra-costa" "ci-ssf-ca" "redondo" "manteca-ca" "cityofmerced" 
	"monterey" "carson" "sfgov" "solano" "riversideca" "temeculaca" "longbeach" "fresno" 
	"sanmateocounty" "burlingameca" "culver-city" "santaclara" "santa-rosa" "sdcounty" "chulavista" 
	"fontana" "claremontca" "cityofcommerce" "huntingtonbeach" "visalia" "costamesa" "cupertino")

# Loop through each city and execute the TypeScript file
for city in "${cities[@]}"; do
  echo "Parse event pdf for city: $city"
  npx tsx /Users/Salim/Desktop/civdex/nextjs-boilerplate/scripts/DownloadAndParseEventPdfs.ts -c "$city" &
done
wait
