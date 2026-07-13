# CSV Schema — Enriched MASTER CSV (37 columns)

## Column Specification

| # | Column | Type | Description |
|---|---|---|---|
| 1 | `schema_version` | string | Schema version identifier (e.g., `claude_recipe_keyword_master_v1`) |
| 2 | `global_row_id` | integer | Global row ID across all source batches |
| 3 | `source_batch` | string | Batch identifier (e.g., `batch_1`) |
| 4 | `source_file` | string | Original source file name |
| 5 | `source_row` | integer | Row number in the source file |
| 6 | `keyword` | string | Raw keyword from Semrush |
| 7 | `normalized_keyword` | string | Normalized/lowercased keyword |
| 8 | `search_intent` | string | Search intent classification (e.g., `Informational`) |
| 9 | `previous_position_raw` | integer | Previous Google position |
| 10 | `current_position_raw` | integer | Current Google position (target: low = easier) |
| 11 | `position_change_raw` | string | Position change (number or `new`) |
| 12 | `estimated_google_traffic` | integer | Estimated traffic from Google |
| 13 | `traffic_change_raw` | integer | Traffic change |
| 14 | `search_volume` | integer | Monthly search volume |
| 15 | `keyword_difficulty` | integer | Semrush KD score (0-100) |
| 16 | `cpc_usd` | float | Cost per click in USD |
| 17 | `pinterest_url` | string | Full Pinterest URL ranking on Google |
| 18 | `pinterest_result_type` | string | `pinterest_pin`, `pinterest_board`, or `pinterest_profile` |
| 19 | `last_update_raw` | string | Last data update timestamp |
| 20 | `serp_feature_changes` | string | Summary of SERP feature changes |
| 21 | `serp_features_new` | string | New SERP features detected |
| 22 | `serp_features_lost` | string | Lost SERP features |
| 23 | `top10_presence_signal` | string | Whether Pinterest is in Google top 10 (usually `pinterest_in_top_10`) |
| 24 | `topic_cluster` | string | Pre-assigned topic cluster (may contain commas — **quoted**) |
| 25 | `content_role` | string | Editorial role: `recipe_article_candidate`, `pillar_or_cluster_taxonomy`, `supporting_recipe_cluster`, `long_tail_recipe`, `research_only`, etc. |
| 26 | `priority_tier` | string | `P1`, `P2`, `P3`, `PILLAR`, `EXCLUDE` |
| 27 | `ptra_fit_signal` | string | PTRA fit: `strong`, `high`, `medium`, `low`, `weak` |
| 28 | `ptra_fit_level_normalized` | string | Normalized PTRA fit |
| 29 | `recommended_action` | string | Auto-generated recommendation |
| 30 | `final_editorial_action` | string | Curated editorial action: `create_first_batch`, `create_after_p1_validation`, `backlog_or_supporting_cluster`, `use_for_cluster_mapping`, `exclude_from_generation` |
| 31 | `risk_flag` | string | `yes` or `no` |
| 32 | `risk_flag_normalized` | string | Normalized risk level |
| 33 | `risk_reason` | string | Explanation of risk (may contain commas — **quoted**) |
| 34 | `duplicate_keyword_count` | integer | Number of duplicates detected |
| 35 | `duplicate_keyword_rank` | integer | Rank among duplicates |
| 36 | `is_duplicate_keyword` | string | `yes` or `no` |
| 37 | `claude_code_instruction` | string | Human-readable guidance per keyword |

## Data Quality Notes

- **Quoted fields**: `topic_cluster`, `serp_feature_changes`, `serp_features_new`, `serp_features_lost`, and `claude_code_instruction` may contain commas within double quotes. Use a proper CSV parser — `split(",")` will NOT work.
- **BOM**: The file may start with a UTF-8 BOM (`﻿`). Strip it before parsing the header.
- **Line endings**: Mixed CRLF. Use `\r?\n` when splitting lines.
- **Empty fields**: Some fields (especially `serp_feature_changes`, `serp_features_new`, `serp_features_lost`, `risk_reason`) may be empty. Treat as empty string.
- **Position values**: `current_position_raw` can be a number, `new`, or empty. Parse as `number | null`.
- **Numerics**: `search_volume`, `keyword_difficulty`, `estimated_google_traffic` should parse as integers. `cpc_usd` as float. Invalid values → 0.
