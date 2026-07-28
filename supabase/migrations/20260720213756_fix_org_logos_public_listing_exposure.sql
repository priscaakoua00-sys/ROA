-- Public buckets serve objects via their public URL without needing a SELECT
-- policy; this one only enabled listing all files in the bucket, which the
-- advisor correctly flags as unnecessary exposure.
drop policy org_logos_select on storage.objects;
