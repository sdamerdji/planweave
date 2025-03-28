{{
    config(
        materialized='table',
        indexes=[
            {'columns': ['event_date', "to_tsvector('english', truncated_text)"], 'type': 'gin'}
        ],
    )
}}

-- aboslute GIGAhack to set statement timeout; I couldn't find another way to do this...
{% set throwaway = run_query("set statement_timeout = '10min'") %}

select
  stg_doc.source,
  stg_doc.client,
  stg_doc.source_event_id,
  stg_doc.source_document_id,
  stg_doc.unified_event_id,
  stg_doc.truncated_text,
  stg_doc.document_url,
  stg_event.event_date
from {{ ref('stg_unified_document_text') }} as stg_doc
join {{ ref('stg_unified_event') }} as stg_event 
    on stg_event.unified_event_id = stg_doc.unified_event_id