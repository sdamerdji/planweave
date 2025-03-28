{{
    config(
        materialized='view'
    )
}}

select
  'legistar' as source,
  legistar_client as client,
  cast(legistar_event_id as text) as source_event_id,
  null as source_document_id,
  'legistar' || ':' || legistar_client || ':' || legistar_event_id as unified_event_id,
  substring(text, 1, 5000) as truncated_text,
  agenda_url as document_url
from {{ source('raw', 'event_agenda_text') }}

union all

select
  'prime_gov' as source,
  prime_gov_client as client,
  cast(prime_gov_meeting_id as text) as source_event_id,
  cast(prime_gov_document_id as text) as source_document_id,
  'prime_gov' || ':' || prime_gov_client || ':' || prime_gov_meeting_id as unified_event_id,
  substring(text, 1, 5000) as truncated_text,
  document_url as document_url
from {{ source('raw', 'prime_gov_document_text') }}

union all

select
  'civic_plus' as source,
  city_name as client,
  civicplus_meeting_id as source_event_id,
  document_id as source_document_id,
  'civic_plus' || ':' || city_name || ':' || civicplus_meeting_id as unified_event_id,
  substring(text, 1, 5000) as truncated_text,
  document_url as document_url
from {{ source('raw', 'civic_plus_document_text') }}