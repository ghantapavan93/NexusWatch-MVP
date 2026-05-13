-- NexusWatch line amount compatibility guard.
-- Run in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Keeps invoice_line_items.line_amount populated from amount for app/report compatibility.

alter table invoice_line_items
add column if not exists line_amount numeric(12,2);

update invoice_line_items
set line_amount = amount
where line_amount is null
  and amount is not null;

create or replace function sync_line_amount_from_amount()
returns trigger as $$
begin
  if (new.line_amount is null or new.line_amount = 0) and new.amount is not null then
    new.line_amount := new.amount;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_line_amount_from_amount on invoice_line_items;

create trigger trg_sync_line_amount_from_amount
before insert or update on invoice_line_items
for each row
execute function sync_line_amount_from_amount();
