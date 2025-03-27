-- that index is a bitch to build
SET statement_timeout = '5min';


create or replace view stg_unified_event_view as
select
  'legistar' as source,
  legistar_client as client,
  legistar_event_id as source_event_id,
  'legistar' || ':' || legistar_client || ':' || legistar_event_id as unified_event_id,
  cast(json->>'EventDate' as date) as event_date,
  json->>'EventBodyName' as event_body_name
from raw_event

union all

select
  'prime_gov' as source,
  prime_gov_client as client,
  prime_gov_meeting_id as source_event_id,
  'prime_gov' || ':' || prime_gov_client || ':' || prime_gov_meeting_id as unified_event_id,
  cast(json->>'dateTime' as date) as event_date,
  json->>'title' as event_body_name
from raw_prime_gov_meeting;

create materialized view if not exists unified_event_view as
select * from stg_unified_event_view;

create index concurrently if not exists unified_event_view_unified_event_id_index
on unified_event_view using btree (unified_event_id);


create or replace view stg_unified_document_text_view as

select
  'legistar' as source,
  legistar_client as client,
  legistar_event_id as source_event_id,
  null as source_document_id,
  'legistar' || ':' || legistar_client || ':' || legistar_event_id as unified_event_id,
  substring(text, 1, 5000) as truncated_text
from event_agenda_text

union all

select
  'prime_gov' as source,
  prime_gov_client as client,
  prime_gov_meeting_id as source_event_id,
  prime_gov_document_id as source_document_id,
  'prime_gov' || ':' || prime_gov_client || ':' || prime_gov_meeting_id as unified_event_id,
  substring(text, 1, 5000) as truncated_text
from prime_gov_document_text;

create materialized view if not exists unified_document_text_view as
select
  stg_doc.source,
  stg_doc.client,
  stg_doc.source_event_id,
  stg_doc.source_document_id,
  stg_doc.unified_event_id,
  stg_doc.truncated_text,
  stg_event.event_date
from stg_unified_document_text_view as stg_doc
join stg_unified_event_view as stg_event on stg_event.unified_event_id = stg_doc.unified_event_id;

create index concurrently if not exists unified_document_text_view_text_index
on unified_document_text_view
using gin(event_date, to_tsvector('english', truncated_text));
