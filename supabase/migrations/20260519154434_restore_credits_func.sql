create or replace function restore_credits(
    p_user_id uuid,
    p_amount int
)
returns void
language plpgsql
security invoker
as $$
begin

    update profiles
    set credits = credits + p_amount
    where id = p_user_id;

end;
$$;