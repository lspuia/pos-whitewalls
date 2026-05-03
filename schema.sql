-- ============================================================
-- POS WEBAPP — SUPABASE SCHEMA  (v6 — fourth audit pass fixes)
-- ============================================================
-- Fourth-pass fixes applied:
--   FIX 18: enforce_memo_items_lock — TG_OP guard prevents
--            illegal OLD reference in INSERT context
--   FIX 19: enforce_return_quantity — cross-memo validation:
--            memo_item must belong to the return's memo
--   FIX 20: search_path = public on all security definer
--            functions (Supabase hardening recommendation)
--   FIX 21: added indexes on payments.reference_memo_id
--            and memos.created_by
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";


-- ────────────────────────────────────────────────────────────
-- HELPER: auto-updated updated_at
-- ────────────────────────────────────────────────────────────
create or replace function handle_updated_at()
returns trigger language plpgsql
set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ────────────────────────────────────────────────────────────
-- PROFILES  (extends auth.users 1-to-1)
-- Roles: super_admin > admin > manager > sales_staff
-- No INSERT policy: profiles are created only via handle_new_user trigger.
-- No standalone DELETE policy: covered by super_admin FOR ALL policy.
-- ────────────────────────────────────────────────────────────
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null,
  role        text not null default 'sales_staff'
                check (role in ('super_admin', 'admin', 'manager', 'sales_staff')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function handle_updated_at();

-- Auto-create profile on new auth user
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger trg_new_user
  after insert on auth.users
  for each row execute function handle_new_user();


-- ────────────────────────────────────────────────────────────
-- ROLE HELPER FUNCTIONS
-- ────────────────────────────────────────────────────────────
create or replace function get_my_role()
returns text language sql security definer stable
set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_super_admin()
returns boolean language sql security definer stable
set search_path = public as $$
  select get_my_role() = 'super_admin';
$$;

create or replace function is_admin_or_above()
returns boolean language sql security definer stable
set search_path = public as $$
  select get_my_role() in ('super_admin', 'admin');
$$;

create or replace function is_manager_or_above()
returns boolean language sql security definer stable
set search_path = public as $$
  select get_my_role() in ('super_admin', 'admin', 'manager');
$$;


-- ────────────────────────────────────────────────────────────
-- PRODUCTS
-- ────────────────────────────────────────────────────────────
create table products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  sku          text unique,
  barcode      text unique,
  category     text,
  price        numeric(12,2) not null check (price >= 0),
  stock_qty    integer not null default 0 check (stock_qty >= 0),
  unit         text not null default 'pcs',
  description  text,
  is_active    boolean not null default true,
  created_by   uuid references profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_products_barcode on products(barcode);
create index idx_products_sku     on products(sku);
create index idx_products_active  on products(is_active);

create trigger trg_products_updated_at
  before update on products
  for each row execute function handle_updated_at();


-- ────────────────────────────────────────────────────────────
-- TRADE PARTNERS
-- ────────────────────────────────────────────────────────────
create table trade_partners (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null unique,
  address     text,
  gstin       text,
  notes       text,
  is_active   boolean not null default true,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_trade_partners_phone  on trade_partners(phone);
create index idx_trade_partners_active on trade_partners(is_active);

create trigger trg_trade_partners_updated_at
  before update on trade_partners
  for each row execute function handle_updated_at();


-- ────────────────────────────────────────────────────────────
-- DIRECT CUSTOMERS
-- ────────────────────────────────────────────────────────────
create table direct_customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text not null unique,
  address     text,
  notes       text,
  is_active   boolean not null default true,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_direct_customers_phone  on direct_customers(phone);
create index idx_direct_customers_active on direct_customers(is_active);

create trigger trg_direct_customers_updated_at
  before update on direct_customers
  for each row execute function handle_updated_at();


-- ────────────────────────────────────────────────────────────
-- TRADE PARTNER CUSTOMERS
-- Phone unique per trade partner only — same person can exist
-- in direct_customers and/or under multiple trade partners.
-- ────────────────────────────────────────────────────────────
create table tp_customers (
  id               uuid primary key default gen_random_uuid(),
  trade_partner_id uuid not null references trade_partners(id) on delete restrict,
  name             text not null,
  phone            text not null,
  address          text,
  notes            text,
  is_active        boolean not null default true,
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (trade_partner_id, phone)
);

create index idx_tp_customers_trade_partner on tp_customers(trade_partner_id);
create index idx_tp_customers_phone         on tp_customers(phone);
create index idx_tp_customers_active        on tp_customers(is_active);

create trigger trg_tp_customers_updated_at
  before update on tp_customers
  for each row execute function handle_updated_at();


-- ────────────────────────────────────────────────────────────
-- SEQUENCE HELPERS
-- ────────────────────────────────────────────────────────────
create sequence memo_number_seq    start 1000;
create sequence payment_number_seq start 1000;
create sequence return_number_seq  start 1000;
create sequence refund_number_seq  start 1000;

create or replace function next_memo_number()
returns text language sql as $$
  select 'MEMO-' || to_char(nextval('memo_number_seq'), 'FM000000');
$$;

create or replace function next_payment_number()
returns text language sql as $$
  select 'PAY-' || to_char(nextval('payment_number_seq'), 'FM000000');
$$;

create or replace function next_return_number()
returns text language sql as $$
  select 'RET-' || to_char(nextval('return_number_seq'), 'FM000000');
$$;

create or replace function next_refund_number()
returns text language sql as $$
  select 'REF-' || to_char(nextval('refund_number_seq'), 'FM000000');
$$;


-- ────────────────────────────────────────────────────────────
-- MEMOS
--
-- Sales memo lifecycle:    draft → confirmed → paid | cancelled
-- Delivery memo lifecycle: draft → confirmed → delivered | cancelled
--
-- Immutability rules (enforced by trigger):
--   draft      → editable by all roles; cannot skip to paid/delivered
--   confirmed  → editable by admin_or_above only
--   paid       → FULLY IMMUTABLE — no edits, no cancellation
--   delivered  → editable by admin_or_above only
--   cancelled  → FULLY IMMUTABLE for everyone
-- ────────────────────────────────────────────────────────────
create table memos (
  id                   uuid primary key default gen_random_uuid(),
  memo_number          text not null unique default next_memo_number(),

  memo_type            text not null
                         check (memo_type in ('sales', 'delivery')),

  customer_type        text not null
                         check (customer_type in ('direct', 'tp_customer')),
  direct_customer_id   uuid references direct_customers(id) on delete restrict,
  tp_customer_id       uuid references tp_customers(id) on delete restrict,

  delivery_address     text,

  status               text not null default 'draft'
                         check (status in ('draft', 'confirmed', 'paid', 'delivered', 'cancelled')),

  -- financials
  subtotal             numeric(12,2) not null default 0 check (subtotal >= 0),
  line_discount_total  numeric(12,2) not null default 0 check (line_discount_total >= 0),
  memo_discount_value  numeric(12,2) not null default 0 check (memo_discount_value >= 0),
  memo_discount_type   text not null default 'flat'
                         check (memo_discount_type in ('flat', 'percent')),
  tax_amount           numeric(12,2) not null default 0 check (tax_amount >= 0),
  total_amount         numeric(12,2) not null default 0 check (total_amount >= 0),

  -- stamped by trigger when marked paid (app only sends payment_method)
  paid_at              timestamptz,
  paid_by              uuid references profiles(id),
  payment_method       text
                         check (payment_method in ('cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other')),

  -- stamped by trigger when marked delivered
  delivered_at         timestamptz,
  delivered_by         uuid references profiles(id),

  notes                text,
  created_by           uuid references profiles(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- exactly one customer reference must be set
  constraint chk_memo_customer check (
    (customer_type = 'direct'      and direct_customer_id is not null and tp_customer_id is null) or
    (customer_type = 'tp_customer' and tp_customer_id is not null     and direct_customer_id is null)
  ),
  -- delivery address required on delivery memos
  constraint chk_delivery_address check (
    memo_type = 'sales' or (memo_type = 'delivery' and delivery_address is not null)
  ),
  -- paid status only valid on sales memos
  constraint chk_paid_status check (
    status != 'paid' or memo_type = 'sales'
  ),
  -- delivered status only valid on delivery memos
  constraint chk_delivered_status check (
    status != 'delivered' or memo_type = 'delivery'
  ),
  -- payment_method required when paid (paid_at/paid_by stamped by trigger)
  constraint chk_payment_fields check (
    status != 'paid' or payment_method is not null
  ),
  -- percent memo discount cannot exceed 100%
  constraint chk_memo_discount_percent check (
    memo_discount_type != 'percent' or memo_discount_value <= 100
  )
);

create index idx_memos_direct_customer on memos(direct_customer_id);
create index idx_memos_tp_customer     on memos(tp_customer_id);
create index idx_memos_status          on memos(status);
create index idx_memos_memo_type       on memos(memo_type);
create index idx_memos_created_at      on memos(created_at desc);
create index idx_memos_created_by      on memos(created_by);

create trigger trg_memos_updated_at
  before update on memos
  for each row execute function handle_updated_at();


-- ── Enforce edit-lock, immutability, and status transition rules ──
create or replace function enforce_memo_edit_rules()
returns trigger language plpgsql security definer
set search_path = public as $$
begin

  -- Paid memos are fully immutable for everyone, including super_admin
  if old.status = 'paid' then
    raise exception 'Paid memos are immutable. Use a return and refund to correct errors.';
  end if;

  -- Cancelled memos are fully immutable for everyone
  if old.status = 'cancelled' then
    raise exception 'Cancelled memos cannot be edited.';
  end if;

  -- Confirmed / delivered memos: admin_or_above only
  if old.status in ('confirmed', 'delivered') then
    if not is_admin_or_above() then
      raise exception 'Only admins can edit a confirmed or delivered memo.';
    end if;
  end if;

  -- Cannot reopen a delivered memo to draft
  if new.status = 'draft' and old.status = 'delivered' then
    raise exception 'A delivered memo cannot be moved back to draft.';
  end if;

  -- draft memo cannot skip directly to paid — must confirm first
  if new.status = 'paid' and old.status = 'draft' then
    raise exception 'A draft memo must be confirmed before it can be marked as paid.';
  end if;

  -- draft memo cannot skip directly to delivered — must confirm first
  if new.status = 'delivered' and old.status = 'draft' then
    raise exception 'A draft memo must be confirmed before it can be marked as delivered.';
  end if;

  -- Cross-type status guards
  if new.status = 'paid' and new.memo_type = 'delivery' then
    raise exception 'Delivery memos cannot be marked as paid. Use the payment ledger.';
  end if;

  if new.status = 'delivered' and new.memo_type = 'sales' then
    raise exception 'Sales memos cannot be marked as delivered.';
  end if;

  -- Cancel: manager_or_above only; paid memo cannot be cancelled
  if new.status = 'cancelled' and old.status != 'cancelled' then
    if old.status = 'paid' then
      raise exception 'Paid memos cannot be cancelled. Use a return and refund instead.';
    end if;
    if not is_manager_or_above() then
      raise exception 'Only managers and above can cancel a memo.';
    end if;
  end if;

  -- Mark as delivered: manager_or_above only — auto-stamp
  if new.status = 'delivered' and old.status != 'delivered' then
    if not is_manager_or_above() then
      raise exception 'Only managers and above can mark a memo as delivered.';
    end if;
    new.delivered_at = now();
    new.delivered_by = auth.uid();
  end if;

  -- Mark as paid — auto-stamp paid_at/paid_by
  -- App only needs to supply payment_method; trigger handles the rest
  if new.status = 'paid' and old.status != 'paid' then
    new.paid_at = now();
    new.paid_by = auth.uid();
  end if;

  return new;
end;
$$;

create trigger trg_memo_edit_rules
  before update on memos
  for each row execute function enforce_memo_edit_rules();


-- ── Auto-create payment entry when sales memo marked paid ────────
-- FIX 16: skip auto-payment if total_amount = 0 (fully discounted memo)
create or replace function auto_payment_on_paid()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.status = 'paid' and old.status != 'paid' then
    -- FIX 16: only insert payment if amount > 0; avoid violating payments.amount check
    if new.total_amount > 0 then
      insert into payments (
        customer_type,
        direct_customer_id,
        tp_customer_id,
        amount,
        payment_method,
        reference_memo_id,
        is_auto,
        notes,
        created_by
      ) values (
        new.customer_type,
        new.direct_customer_id,
        new.tp_customer_id,
        new.total_amount,
        new.payment_method,
        new.id,
        true,
        'Auto-created from ' || new.memo_number,
        new.paid_by
      );
    end if;
  end if;
  return new;
end;
$$;
-- Trigger attached after payments table is created below


-- ────────────────────────────────────────────────────────────
-- MEMO ITEMS
-- FIX 14: INSERT/UPDATE trigger enforces parent memo edit-lock
--          so staff cannot bypass the lock by going to memo_items directly
-- ────────────────────────────────────────────────────────────
create table memo_items (
  id              uuid primary key default gen_random_uuid(),
  memo_id         uuid not null references memos(id) on delete cascade,
  product_id      uuid not null references products(id) on delete restrict,
  quantity        integer not null check (quantity > 0),
  unit_price      numeric(12,2) not null check (unit_price >= 0),
  discount_value  numeric(12,2) not null default 0 check (discount_value >= 0),
  discount_type   text not null default 'flat'
                    check (discount_type in ('flat', 'percent')),
  line_total      numeric(12,2) not null default 0 check (line_total >= 0),
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),

  -- percent line discount cannot exceed 100%
  constraint chk_line_discount_percent check (
    discount_type != 'percent' or discount_value <= 100
  )
);

create index idx_memo_items_memo    on memo_items(memo_id);
create index idx_memo_items_product on memo_items(product_id);

-- FIX 14: prevent editing line items on locked memos
-- Mirrors the same rules as enforce_memo_edit_rules on the parent memo.
create or replace function enforce_memo_items_lock()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_memo_status text;
  v_memo_id     uuid;
begin
  -- Safely determine the memo_id depending on operation.
  -- OLD is undefined on INSERT — must use TG_OP guard, not coalesce.
  if TG_OP = 'INSERT' then
    v_memo_id := new.memo_id;
  elsif TG_OP = 'UPDATE' then
    v_memo_id := old.memo_id;  -- use OLD so moving item to another memo is also gated
  else  -- DELETE
    v_memo_id := old.memo_id;
  end if;

  select status into v_memo_status
    from memos
   where id = v_memo_id;

  -- Fully immutable statuses — no one can touch line items
  if v_memo_status in ('paid', 'cancelled') then
    raise exception
      'Cannot modify line items on a % memo.', v_memo_status;
  end if;

  -- Confirmed / delivered: admin_or_above only
  if v_memo_status in ('confirmed', 'delivered') then
    if not is_admin_or_above() then
      raise exception 'Only admins can modify line items on a confirmed or delivered memo.';
    end if;
  end if;

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_memo_items_lock
  before insert or update or delete on memo_items
  for each row execute function enforce_memo_items_lock();


-- ────────────────────────────────────────────────────────────
-- PAYMENTS  (account-based ledger — not tied to a single memo)
-- ────────────────────────────────────────────────────────────
create table payments (
  id                   uuid primary key default gen_random_uuid(),
  payment_number       text not null unique default next_payment_number(),

  customer_type        text not null
                         check (customer_type in ('direct', 'tp_customer')),
  direct_customer_id   uuid references direct_customers(id) on delete restrict,
  tp_customer_id       uuid references tp_customers(id) on delete restrict,

  amount               numeric(12,2) not null check (amount > 0),
  payment_method       text not null default 'cash'
                         check (payment_method in ('cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other')),
  reference_number     text,
  reference_memo_id    uuid references memos(id) on delete set null,
  is_auto              boolean not null default false,
  notes                text,

  created_by           uuid references profiles(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint chk_payment_customer check (
    (customer_type = 'direct'      and direct_customer_id is not null and tp_customer_id is null) or
    (customer_type = 'tp_customer' and tp_customer_id is not null     and direct_customer_id is null)
  )
);

create index idx_payments_direct_customer  on payments(direct_customer_id);
create index idx_payments_tp_customer      on payments(tp_customer_id);
create index idx_payments_created_at       on payments(created_at desc);
create index idx_payments_reference_memo   on payments(reference_memo_id);

create trigger trg_payments_updated_at
  before update on payments
  for each row execute function handle_updated_at();

-- Attach memo → payment auto-entry trigger now that payments table exists
create trigger trg_auto_payment_on_paid
  after update on memos
  for each row execute function auto_payment_on_paid();


-- ────────────────────────────────────────────────────────────
-- RETURNS  (partial, line-item level)
-- Raising:         all roles; only against confirmed/paid/delivered memos
-- Approve/reject:  admin_or_above only (enforced by trigger)
-- ────────────────────────────────────────────────────────────
create table returns (
  id             uuid primary key default gen_random_uuid(),
  return_number  text not null unique default next_return_number(),
  memo_id        uuid not null references memos(id) on delete restrict,
  reason         text,
  status         text not null default 'pending'
                   check (status in ('pending', 'approved', 'rejected')),
  approved_by    uuid references profiles(id),
  approved_at    timestamptz,
  notes          text,
  created_by     uuid references profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_returns_memo       on returns(memo_id);
create index idx_returns_status     on returns(status);
create index idx_returns_created_at on returns(created_at desc);

create trigger trg_returns_updated_at
  before update on returns
  for each row execute function handle_updated_at();

-- Returns: memo status guard on INSERT + approve/reject guard on UPDATE
create or replace function enforce_return_rules()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_memo_status text;
begin
  -- On INSERT: validate the linked memo is in a returnable state
  if TG_OP = 'INSERT' then
    select status into v_memo_status
      from memos where id = new.memo_id;

    if v_memo_status not in ('confirmed', 'paid', 'delivered') then
      raise exception
        'Returns can only be raised against confirmed, paid, or delivered memos. Memo status is: %.',
        v_memo_status;
    end if;
  end if;

  -- On UPDATE: approve/reject is admin_or_above only
  if TG_OP = 'UPDATE' then
    if new.status in ('approved', 'rejected') and old.status = 'pending' then
      if not is_admin_or_above() then
        raise exception 'Only admins can approve or reject returns.';
      end if;
      new.approved_by = auth.uid();
      new.approved_at = now();
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_return_rules
  before insert or update on returns
  for each row execute function enforce_return_rules();


-- ────────────────────────────────────────────────────────────
-- RETURN ITEMS
-- FIX 15: trigger checks parent return status on INSERT/UPDATE —
--          items cannot be added to rejected or pending-then-rejected returns
-- ────────────────────────────────────────────────────────────
create table return_items (
  id                uuid primary key default gen_random_uuid(),
  return_id         uuid not null references returns(id) on delete cascade,
  memo_item_id      uuid not null references memo_items(id) on delete restrict,
  product_id        uuid not null references products(id) on delete restrict,
  quantity_returned integer not null check (quantity_returned > 0),
  refund_amount     numeric(12,2) not null default 0 check (refund_amount >= 0),
  created_at        timestamptz not null default now()
);

create index idx_return_items_return    on return_items(return_id);
create index idx_return_items_memo_item on return_items(memo_item_id);

-- FIX 15 + over-return prevention + FIX 18: cross-memo validation
create or replace function enforce_return_quantity()
returns trigger language plpgsql as $$
declare
  v_original_qty     integer;
  v_already_returned integer;
  v_return_status    text;
  v_return_memo_id   uuid;
  v_item_memo_id     uuid;
begin
  -- Block adding items to a rejected return
  select status, memo_id into v_return_status, v_return_memo_id
    from returns where id = new.return_id;

  if v_return_status = 'rejected' then
    raise exception 'Cannot add items to a rejected return.';
  end if;

  -- FIX 18: ensure the memo_item belongs to the same memo as the return
  select memo_id into v_item_memo_id
    from memo_items where id = new.memo_item_id;

  if v_item_memo_id != v_return_memo_id then
    raise exception
      'Return item memo_item_id does not belong to the memo referenced by this return.';
  end if;

  -- Get original quantity from the memo line item
  select quantity
    into v_original_qty
    from memo_items
   where id = new.memo_item_id;

  -- Sum all non-rejected return quantities for this memo_item,
  -- excluding the current row (new.id populated by DEFAULT before BEFORE trigger)
  select coalesce(sum(ri.quantity_returned), 0)
    into v_already_returned
    from return_items ri
    join returns r on r.id = ri.return_id
   where ri.memo_item_id = new.memo_item_id
     and r.status != 'rejected'
     and ri.id != new.id;

  if (v_already_returned + new.quantity_returned) > v_original_qty then
    raise exception
      'Cannot return % unit(s) — only % of % originally ordered remain returnable.',
      new.quantity_returned,
      (v_original_qty - v_already_returned),
      v_original_qty;
  end if;

  return new;
end;
$$;

create trigger trg_return_quantity_check
  before insert or update on return_items
  for each row execute function enforce_return_quantity();


-- ────────────────────────────────────────────────────────────
-- REFUNDS
-- FIX 17: return_id is UNIQUE — one refund per return
-- FIX 11: refund only allowed against an approved return
-- Create + process: admin_or_above only
-- ────────────────────────────────────────────────────────────
create table refunds (
  id                   uuid primary key default gen_random_uuid(),
  refund_number        text not null unique default next_refund_number(),
  -- FIX 17: one refund per return
  return_id            uuid not null unique references returns(id) on delete restrict,

  customer_type        text not null
                         check (customer_type in ('direct', 'tp_customer')),
  direct_customer_id   uuid references direct_customers(id) on delete restrict,
  tp_customer_id       uuid references tp_customers(id) on delete restrict,

  amount               numeric(12,2) not null check (amount > 0),
  refund_method        text not null default 'cash'
                         check (refund_method in ('cash', 'upi', 'card', 'bank_transfer', 'cheque', 'other')),
  status               text not null default 'pending'
                         check (status in ('pending', 'processed', 'cancelled')),
  processed_by         uuid references profiles(id),
  processed_at         timestamptz,
  notes                text,

  created_by           uuid references profiles(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint chk_refund_customer check (
    (customer_type = 'direct'      and direct_customer_id is not null and tp_customer_id is null) or
    (customer_type = 'tp_customer' and tp_customer_id is not null     and direct_customer_id is null)
  )
);

create index idx_refunds_return_id  on refunds(return_id);
create index idx_refunds_created_at on refunds(created_at desc);

create trigger trg_refunds_updated_at
  before update on refunds
  for each row execute function handle_updated_at();

create or replace function enforce_refund_rules()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_return_status text;
begin
  if TG_OP = 'INSERT' then
    -- Role check
    if not is_admin_or_above() then
      raise exception 'Only admins can create refunds.';
    end if;

    -- Refund only allowed against an approved return
    select status into v_return_status
      from returns where id = new.return_id;

    if v_return_status != 'approved' then
      raise exception
        'A refund can only be created against an approved return. Return status is: %.',
        v_return_status;
    end if;
  end if;

  if TG_OP = 'UPDATE' then
    if new.status = 'processed' and old.status != 'processed' then
      if not is_admin_or_above() then
        raise exception 'Only admins can process refunds.';
      end if;
      new.processed_by = auth.uid();
      new.processed_at = now();
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_refund_rules
  before insert or update on refunds
  for each row execute function enforce_refund_rules();


-- ────────────────────────────────────────────────────────────
-- ACCOUNT BALANCE VIEWS
-- Both views use ('confirmed','paid','delivered') — no status missed
-- outstanding_balance > 0  →  customer owes money
-- ────────────────────────────────────────────────────────────
create or replace view direct_customer_balances as
select
  c.id,
  c.name,
  c.phone,
  coalesce(sum(m.total_amount) filter (
    where m.status in ('confirmed', 'paid', 'delivered')
  ), 0)                                                          as total_billed,
  coalesce(sum(p.amount), 0)                                     as total_paid,
  coalesce(sum(rf.amount) filter (
    where rf.status = 'processed'
  ), 0)                                                          as total_refunded,
  coalesce(sum(m.total_amount) filter (
    where m.status in ('confirmed', 'paid', 'delivered')
  ), 0)
    - coalesce(sum(p.amount), 0)
    + coalesce(sum(rf.amount) filter (
        where rf.status = 'processed'
      ), 0)                                                      as outstanding_balance
from direct_customers c
left join memos    m  on m.direct_customer_id = c.id
left join payments p  on p.direct_customer_id = c.id
left join refunds  rf on rf.direct_customer_id = c.id
group by c.id, c.name, c.phone;


create or replace view tp_customer_balances as
select
  tc.id,
  tc.name,
  tc.phone,
  tp.name                                                        as trade_partner_name,
  coalesce(sum(m.total_amount) filter (
    where m.status in ('confirmed', 'paid', 'delivered')
  ), 0)                                                          as total_billed,
  coalesce(sum(p.amount), 0)                                     as total_paid,
  coalesce(sum(rf.amount) filter (
    where rf.status = 'processed'
  ), 0)                                                          as total_refunded,
  coalesce(sum(m.total_amount) filter (
    where m.status in ('confirmed', 'paid', 'delivered')
  ), 0)
    - coalesce(sum(p.amount), 0)
    + coalesce(sum(rf.amount) filter (
        where rf.status = 'processed'
      ), 0)                                                      as outstanding_balance
from tp_customers tc
join trade_partners tp on tp.id = tc.trade_partner_id
left join memos    m   on m.tp_customer_id = tc.id
left join payments p   on p.tp_customer_id = tc.id
left join refunds  rf  on rf.tp_customer_id = tc.id
group by tc.id, tc.name, tc.phone, tp.name;


-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Fine-grained business logic enforced in triggers above.
-- RLS handles broad CRUD access by role.
-- ────────────────────────────────────────────────────────────
alter table profiles          enable row level security;
alter table products          enable row level security;
alter table trade_partners    enable row level security;
alter table direct_customers  enable row level security;
alter table tp_customers      enable row level security;
alter table memos             enable row level security;
alter table memo_items        enable row level security;
alter table payments          enable row level security;
alter table returns           enable row level security;
alter table return_items      enable row level security;
alter table refunds           enable row level security;


-- ── profiles ─────────────────────────────────────────────────
-- SELECT: all authenticated staff
-- INSERT: intentionally absent — profiles created only via handle_new_user trigger
-- UPDATE: own row (role field protected); super_admin overrides via FOR ALL
-- DELETE: covered by super_admin FOR ALL policy below
create policy "profiles: all staff can read"
  on profiles for select to authenticated using (true);

create policy "profiles: user can update own non-role fields"
  on profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from profiles where id = auth.uid())
  );

create policy "profiles: super_admin full access"
  on profiles for all to authenticated
  using (is_super_admin()) with check (is_super_admin());


-- ── products ─────────────────────────────────────────────────
create policy "products: all staff can read"
  on products for select to authenticated using (true);

create policy "products: manager_or_above can insert"
  on products for insert to authenticated
  with check (is_manager_or_above());

create policy "products: manager_or_above can update"
  on products for update to authenticated
  using (is_manager_or_above()) with check (is_manager_or_above());

create policy "products: admin_or_above can delete"
  on products for delete to authenticated
  using (is_admin_or_above());


-- ── trade_partners ───────────────────────────────────────────
create policy "trade_partners: all staff can read"
  on trade_partners for select to authenticated using (true);

create policy "trade_partners: manager_or_above can insert"
  on trade_partners for insert to authenticated
  with check (is_manager_or_above());

create policy "trade_partners: manager_or_above can update"
  on trade_partners for update to authenticated
  using (is_manager_or_above()) with check (is_manager_or_above());

create policy "trade_partners: admin_or_above can delete"
  on trade_partners for delete to authenticated
  using (is_admin_or_above());


-- ── direct_customers ─────────────────────────────────────────
create policy "direct_customers: all staff can read"
  on direct_customers for select to authenticated using (true);

create policy "direct_customers: manager_or_above can insert"
  on direct_customers for insert to authenticated
  with check (is_manager_or_above());

create policy "direct_customers: manager_or_above can update"
  on direct_customers for update to authenticated
  using (is_manager_or_above()) with check (is_manager_or_above());

create policy "direct_customers: admin_or_above can delete"
  on direct_customers for delete to authenticated
  using (is_admin_or_above());


-- ── tp_customers ─────────────────────────────────────────────
create policy "tp_customers: all staff can read"
  on tp_customers for select to authenticated using (true);

create policy "tp_customers: manager_or_above can insert"
  on tp_customers for insert to authenticated
  with check (is_manager_or_above());

create policy "tp_customers: manager_or_above can update"
  on tp_customers for update to authenticated
  using (is_manager_or_above()) with check (is_manager_or_above());

create policy "tp_customers: admin_or_above can delete"
  on tp_customers for delete to authenticated
  using (is_admin_or_above());


-- ── memos ────────────────────────────────────────────────────
-- Edit-lock and immutability enforced by trigger.
create policy "memos: all staff can read"
  on memos for select to authenticated using (true);

create policy "memos: all staff can insert"
  on memos for insert to authenticated with check (true);

create policy "memos: all staff can update"
  on memos for update to authenticated using (true) with check (true);

create policy "memos: super_admin can delete"
  on memos for delete to authenticated using (is_super_admin());


-- ── memo_items ───────────────────────────────────────────────
-- Edit-lock enforced by trg_memo_items_lock trigger.
create policy "memo_items: all staff can read"
  on memo_items for select to authenticated using (true);

create policy "memo_items: all staff can insert"
  on memo_items for insert to authenticated with check (true);

create policy "memo_items: all staff can update"
  on memo_items for update to authenticated using (true) with check (true);

create policy "memo_items: all staff can delete"
  on memo_items for delete to authenticated using (true);


-- ── payments ─────────────────────────────────────────────────
create policy "payments: all staff can read"
  on payments for select to authenticated using (true);

create policy "payments: all staff can insert"
  on payments for insert to authenticated with check (true);

create policy "payments: admin_or_above can update"
  on payments for update to authenticated
  using (is_admin_or_above()) with check (is_admin_or_above());

create policy "payments: admin_or_above can delete"
  on payments for delete to authenticated using (is_admin_or_above());


-- ── returns ──────────────────────────────────────────────────
create policy "returns: all staff can read"
  on returns for select to authenticated using (true);

create policy "returns: all staff can insert"
  on returns for insert to authenticated with check (true);

-- approve/reject and memo-status guard enforced by trigger
create policy "returns: all staff can update"
  on returns for update to authenticated using (true) with check (true);

create policy "returns: admin_or_above can delete"
  on returns for delete to authenticated using (is_admin_or_above());


-- ── return_items ─────────────────────────────────────────────
create policy "return_items: all staff can read"
  on return_items for select to authenticated using (true);

create policy "return_items: all staff can insert"
  on return_items for insert to authenticated with check (true);

create policy "return_items: all staff can update"
  on return_items for update to authenticated using (true) with check (true);

create policy "return_items: admin_or_above can delete"
  on return_items for delete to authenticated using (is_admin_or_above());


-- ── refunds ──────────────────────────────────────────────────
-- Insert + process restricted by trigger (role + return status checks)
create policy "refunds: all staff can read"
  on refunds for select to authenticated using (true);

create policy "refunds: authenticated can insert"
  on refunds for insert to authenticated with check (true);

create policy "refunds: authenticated can update"
  on refunds for update to authenticated using (true) with check (true);

create policy "refunds: admin_or_above can delete"
  on refunds for delete to authenticated using (is_admin_or_above());


-- ────────────────────────────────────────────────────────────
-- GRANTS  (required for RLS policies to be reachable)
-- ────────────────────────────────────────────────────────────
grant select, insert, update, delete on all tables   in schema public to authenticated;
grant select, insert, update, delete on all tables   in schema public to anon;
grant usage,  select                 on all sequences in schema public to authenticated;
grant usage,  select                 on all sequences in schema public to anon;


-- ────────────────────────────────────────────────────────────
-- DONE
-- ────────────────────────────────────────────────────────────
-- Tables:   profiles, products, trade_partners, direct_customers,
--           tp_customers, memos, memo_items, payments,
--           returns, return_items, refunds
-- Views:    direct_customer_balances, tp_customer_balances
-- Roles:    super_admin › admin › manager › sales_staff
-- Total fixes across all passes: 17 + GRANTS added post-audit
-- ────────────────────────────────────────────────────────────
