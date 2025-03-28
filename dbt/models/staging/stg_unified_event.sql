{{
    config(
        materialized='view'
    )
}}

select
  'legistar' as source,
  legistar_client as client,
  cast(legistar_event_id as text) as source_event_id,
  'legistar' || ':' || legistar_client || ':' ||legistar_event_id as unified_event_id,
  cast(json->>'EventDate' as date) as event_date,
  json->>'EventBodyName' as event_body_name
from {{ source('raw', 'raw_event') }}

union all

select
  'prime_gov' as source,
  prime_gov_client as client,
  cast(prime_gov_meeting_id as text) as source_event_id,
  'prime_gov' || ':' || prime_gov_client || ':' || prime_gov_meeting_id as unified_event_id,
  cast(json->>'dateTime' as date) as event_date,
  json->>'title' as event_body_name
from {{ source('raw', 'raw_prime_gov_meeting') }}

union all

select
  'civic_plus' as source,
  city_name as client,
  civicplus_meeting_id as source_event_id,
  'civic_plus' || ':' || city_name || ':' || civicplus_meeting_id as unified_event_id,
  cast(json->>'meeting_date' as date) as event_date,
  json->>'committee_name' as event_body_name
from {{ source('raw', 'raw_civicplus_asset') }}
where asset_type = 'meeting'  -- Only include meeting records, not other asset types