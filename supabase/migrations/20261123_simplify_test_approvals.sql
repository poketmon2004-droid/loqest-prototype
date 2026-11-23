-- Admin recognition testing only needs a current publish-approval flag.
-- Existing approvals survive this change. Visitor attempts remain in capture_records.
alter table public.recognition_test_records
  drop column if exists total_tests,
  drop column if exists successful_tests,
  drop column if exists failed_tests,
  drop column if exists recent_results,
  drop column if exists last_result,
  drop column if exists last_tested_at,
  drop column if exists quality;
