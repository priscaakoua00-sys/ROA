-- Replace the flat "causes" text[] with structured, ranked hypotheses
-- (cause + probability + reasoning) so the diagnosis panel can show WHY the
-- AI reached each conclusion, not just a list. Existing rows are converted
-- losslessly (probability estimated from list order, reasoning flagged as
-- pre-migration) rather than dropped.

alter table photo_diagnoses add column hypotheses jsonb not null default '[]';

update photo_diagnoses pd
set hypotheses = coalesce(sub.agg, '[]'::jsonb)
from (
  select pd2.id,
    jsonb_agg(
      jsonb_build_object(
        'cause', c.cause,
        'probabilityPercent', greatest(10, 70 - (c.idx - 1) * 20),
        'reasoning', 'Migrated from a photo diagnosis recorded before confidence scoring and reasoning were tracked.'
      ) order by c.idx
    ) as agg
  from photo_diagnoses pd2
  cross join lateral unnest(pd2.causes) with ordinality as c(cause, idx)
  group by pd2.id
) sub
where pd.id = sub.id;

alter table photo_diagnoses drop column causes;
