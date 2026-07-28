alter table organizations add column default_margin_percent numeric not null default 35 check (default_margin_percent >= 0 and default_margin_percent <= 100);
