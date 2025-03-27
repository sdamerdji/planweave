{{
    config(
        materialized='table',
        indexes=[
            {'columns': ['unified_event_id']}
        ]
    )
}}

select * from {{ ref('stg_unified_event') }}