-- Add covering indexes for public-schema foreign keys that do not already have one.
do $$
declare r record;
declare idx_name text;
declare cols text;
begin
  for r in
    select con.oid, n.nspname, rel.relname, con.conname, con.conkey
    from pg_constraint con
    join pg_class rel on rel.oid=con.conrelid
    join pg_namespace n on n.oid=rel.relnamespace
    where con.contype='f' and n.nspname='public'
      and not exists (
        select 1 from pg_index i
        where i.indrelid=con.conrelid and i.indisvalid
          and (i.indkey::smallint[])[0:cardinality(con.conkey)-1]=con.conkey
      )
  loop
    select string_agg(quote_ident(a.attname), ', ' order by u.ord) into cols
    from unnest(r.conkey) with ordinality u(attnum,ord)
    join pg_attribute a
      on a.attrelid=(quote_ident(r.nspname)||'.'||quote_ident(r.relname))::regclass
     and a.attnum=u.attnum;
    idx_name:=left('idx_'||r.relname||'_'||replace(r.conname,r.relname||'_',''),63);
    execute format('create index if not exists %I on %I.%I (%s)',idx_name,r.nspname,r.relname,cols);
  end loop;
end $$;
