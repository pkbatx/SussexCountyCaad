# Data Model

## Call
- call_id (stable content hash)
- incident_id (nullable)
- agency_id
- service_type (EMS|Fire|Special)
- incident_type (nullable)
- address_normalized (nullable)
- town (nullable)
- cross_street (nullable)
- poi (nullable)
- occurred_at
- received_at
- re_alert_flag (boolean)

## Incident
- incident_id
- last_update_at
- call_count
- re_alert_count
- attention_flags (array)

## Agency
- agency_id
- canonical_name
- service_type

## Location
- normalized_address
- town
- poi
- latitude
- longitude
- source

## InsightMetric
- metric_id
- window_start
- window_end
- metric_type
- group_key
- value

## FeedbackEvent
- feedback_id
- target_type (call|incident)
- target_id
- feedback_type (wrong_grouping|wrong_location|wrong_type)
- created_at
- applied_at
