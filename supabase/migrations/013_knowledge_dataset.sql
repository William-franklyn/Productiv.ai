-- A source that parses as tabular (CSV, or a JSON array of objects) also
-- gets a flat {columns, rows} representation stored alongside its chunks.
-- The chunk/embedding pipeline is semantic search over prose — it can't
-- answer "what's the average of column X across every row," so analyze_data
-- reads this column directly instead of going through retrieval.
alter table knowledge_sources add column dataset jsonb;
