#!/bin/bash

# Define an array of cities
cities=("sunnyvaleca" "mountainview" 'hesperia' 'santabarbara' 'alameda' 'oakland' 'sanbernardino',
       'octa' 'hayward' 'napa' 'cityoforange' 'sanbernardino'
       'wauwatosacitywi' 'contra-costa' 'sanbernardino'
       'sanbernardino' 'humboldt' 'ci-ssf-ca' 'redondo' 'tol'
       'sonoma-county' 'manteca-ca' 'cityofmerced' 'monterey'
       'carson' 'oakland' 'sbcera' 'solano' 'riversideca'
       'sunnyvaleca' 'sanbernardino' 'temeculaca' 'monterey'
       'longbeach' 'cityofmerced' 'longbeach' 'sfgov' 'solano'
       'actransit' 'metro' 'sanbernardino' 'sanbernardino'
       'cook-county' 'humboldt' 'fresno' 'longbeach' 'fresno'
       'cityoforange' 'contra-costa' 'sanmateocounty' 'santabarbara'
       'octa' 'sjrs' 'burlingameca' 'culver-city' nan 'santaclara'
       nan nan 'santa-rosa' 'sanmateocounty' 'monterey'
       'riversideca' 'scvwd' 'sdcounty' 'monterey' 'santabarbara'
       'carson' 'culver-city' 'manteca-ca' 'metro' 'cityofmerced'
       'chino' 'chino' 'cityofmerced' 'chulavista' 'fontana'
       'claremontca' 'hayward' 'countyoflake' 'mendocino' 'fresno'
       'monterey' 'fresnocounty' 'nevco' 'ci-ssf-ca' 'sanbernardino'
       'sonoma-county' 'cityofcommerce' 'huntingtonbeach'
       'contra-costa' 'visalia' 'tehamacounty' 'corona'
       'portofsandiego' 'sfgov' 'costamesa' 'sonoma-county'
       'longbeach' 'oakland' 'metro' 'culver-city' 'cupertino'
       'actransit' 'sanmateocounty' 'sjrs' 'contra-costa')

# Loop through each city and execute the TypeScript file
for city in "${cities[@]}"; do
  echo "Downloading data for city: $city"
  npx tsx /Users/Salim/Desktop/civdex/nextjs-boilerplate/scripts/DownloadLegistarToRaw.ts -c "$city" -t "raw_event"
done
