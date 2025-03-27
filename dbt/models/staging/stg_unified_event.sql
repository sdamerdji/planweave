{{
    config(
        materialized='view'
    )
}}

select
  'legistar' as source,
  legistar_client as client,
  legistar_event_id as source_event_id,
  'legistar' || ':' || legistar_client || ':' || legistar_event_id as unified_event_id,
  cast(json->>'EventDate' as date) as event_date,
  json->>'EventBodyName' as event_body_name
from {{ source('raw', 'raw_event') }}

union all

select
  'prime_gov' as source,
  prime_gov_client as client,
  prime_gov_meeting_id as source_event_id,
  'prime_gov' || ':' || prime_gov_client || ':' || prime_gov_meeting_id as unified_event_id,
  cast(json->>'dateTime' as date) as event_date,
  json->>'title' as event_body_name
from {{ source('raw', 'raw_prime_gov_meeting') }}