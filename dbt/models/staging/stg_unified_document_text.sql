{{
    config(
        materialized='view'
    )
}}

select
  'legistar' as source,
  legistar_client as client,
  legistar_event_id as source_event_id,
  null as source_document_id,
  'legistar' || ':' || legistar_client || ':' || legistar_event_id as unified_event_id,
  substring(text, 1, 5000) as truncated_text
from {{ source('raw', 'event_agenda_text') }}

union all

select
  'prime_gov' as source,
  prime_gov_client as client,
  prime_gov_meeting_id as source_event_id,
  prime_gov_document_id as source_document_id,
  'prime_gov' || ':' || prime_gov_client || ':' || prime_gov_meeting_id as unified_event_id,
  substring(text, 1, 5000) as truncated_text
from {{ source('raw', 'prime_gov_document_text') }}