create or replace function deduct_credits(
    p_user_id uuid,
    p_amount int
)
returns boolean
language plpgsql
security invoker
as $$
begin

    update profiles
    set credits = credits - p_amount
    where id = p_user_id
    and credits >= p_amount;

    return found;

end;
$$;
