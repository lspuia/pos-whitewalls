# POS Webapp — Project Handoff

## How to use this document
Upload this file **and** `schema.sql` into a new Claude chat, then say:
> "I'm continuing a POS webapp project. Read the handoff document and schema, then help me with Step 2: Next.js project scaffold."

---

## Project overview
An in-store Point of Sale webapp for an interior design and products business. Used by store staff on a desktop/tablet. Not customer-facing.

**Tech stack:** Next.js · Supabase · Vercel · Brevo (email) · GitHub

---

## Current status
- ✅ Supabase schema complete — ran clean in Supabase (no errors)
- ✅ Schema file: `schema.sql` (attach alongside this document)
- ⏳ Next step: Next.js project scaffold (Step 2)

---

## Business context

### Customer types (separate entities)
- **Direct customers** — buy directly from the store; unique phone per table
- **Trade partners** — businesses with a trade relationship; unique phone per table
- **Trade partner customers (tp_customers)** — end customers of a trade partner; phone unique per trade partner only. A single person can exist simultaneously as a direct customer AND a tp_customer — these are separate records, not merged.

### Memo types (both are invoices/bills)
- **Sales memo** — customer picks up in store
- **Delivery memo** — store arranges delivery; requires a delivery address

### Memo lifecycles
- Sales: `draft → confirmed → paid | cancelled`
- Delivery: `draft → confirmed → delivered | cancelled`

### Key memo rules
- App only needs to send `payment_method` when marking a sales memo paid — the DB trigger auto-stamps `paid_at` and `paid_by`
- Paid memos are **fully immutable** — no edits, no cancellation for anyone including super_admin. Errors are corrected via return + refund only
- Draft memos cannot skip directly to paid or delivered — must go through confirmed first
- Once confirmed, only admin_or_above can edit
- Delivery memos settle payment through the account ledger only (no "mark as paid" button)

### Discounts
- Per line item: flat (₹) or percent (%) — capped at 100%
- Net memo level: flat (₹) or percent (%) — capped at 100%
- Both can be applied on the same memo

### Payments
- Account-based ledger — not tied to a single memo
- A customer can carry an outstanding balance across multiple memos
- When a sales memo is marked paid, a payment entry is auto-created in the ledger by a DB trigger
- If memo total_amount = 0 (fully discounted), no payment entry is created

### Returns & refunds
- Returns are partial — line-item level
- Any role can raise a return, but only admin_or_above can approve or reject
- Refunds can only be created against an approved return
- Only one refund per return (enforced by UNIQUE constraint on refunds.return_id)
- Only admin_or_above can create and process refunds

### Receipts / memos output
- Print-ready PDF
- Share via WhatsApp / email (Brevo)

### Barcode scanning
- USB HID scanner (keyboard wedge input) — primary
- Phone camera — fallback

---

## Roles & permissions summary

| Action | super_admin | admin | manager | sales_staff |
|---|---|---|---|---|
| Create/delete users | ✅ | ❌ | ❌ | ❌ |
| Assign roles | ✅ | ❌ | ❌ | ❌ |
| Add/edit products | ✅ | ✅ | ✅ | ❌ |
| Add/edit customers & trade partners | ✅ | ✅ | ✅ | ❌ |
| Create draft memos | ✅ | ✅ | ✅ | ✅ |
| Confirm memos | ✅ | ✅ | ✅ | ✅ |
| Edit confirmed/delivered memos | ✅ | ✅ | ❌ | ❌ |
| Mark sales memo as paid | ✅ | ✅ | ✅ | ✅ |
| Mark delivery memo as delivered | ✅ | ✅ | ✅ | ❌ |
| Cancel memos | ✅ | ✅ | ✅ | ❌ |
| Delete memos | ✅ | ❌ | ❌ | ❌ |
| Record payments (ledger) | ✅ | ✅ | ✅ | ✅ |
| Edit/delete payments | ✅ | ✅ | ❌ | ❌ |
| Raise returns | ✅ | ✅ | ✅ | ✅ |
| Approve/reject returns | ✅ | ✅ | ❌ | ❌ |
| Create/process refunds | ✅ | ✅ | ❌ | ❌ |
| View sales reports | ✅ | ✅ | ✅ | ❌ |
| Export data | ✅ | ✅ | ❌ | ❌ |

---

## Schema summary

### Tables
| Table | Purpose |
|---|---|
| `profiles` | Extends `auth.users` 1-to-1; stores role |
| `products` | SKU, barcode, price, stock |
| `trade_partners` | Trade partner businesses |
| `direct_customers` | Direct store customers |
| `tp_customers` | Customers of trade partners |
| `memos` | Sales and delivery invoices |
| `memo_items` | Line items on memos |
| `payments` | Account-based payment ledger |
| `returns` | Return requests (partial, line-item level) |
| `return_items` | Individual line items being returned |
| `refunds` | Refund records linked to approved returns |

### Views
- `direct_customer_balances` — live outstanding balance per direct customer
- `tp_customer_balances` — live outstanding balance per tp_customer

### Key DB-enforced business logic (triggers)
- `enforce_memo_edit_rules` — memo immutability + status transition rules
- `enforce_memo_items_lock` — prevents line item edits on locked memos
- `auto_payment_on_paid` — creates ledger entry when sales memo marked paid
- `enforce_return_rules` — memo status guard on INSERT; approve/reject role check on UPDATE
- `enforce_return_quantity` — prevents over-returning; validates cross-memo integrity
- `enforce_refund_rules` — role check + approved-return check on INSERT
- `handle_new_user` — auto-creates profile row when auth user signs up

---

## Build order for new chat

### ✅ Done
1. Supabase schema

### ⏳ To do — in this order
2. **Next.js project scaffold** ← start here
   - `npx create-next-app@latest` with App Router, TypeScript, Tailwind
   - Folder structure
   - Supabase client setup (server + client + middleware)
   - Role-based route protection middleware
   - Base layout (sidebar nav, auth guard)

3. **Feature modules**
   - Products (add/edit, barcode scan)
   - Customers (Direct + Trade Partners + TP Customers)
   - Memos (Sales + Delivery, line items, discounts)
   - Payments (ledger, account balance)
   - Returns + Refunds

4. **PDF generation + Brevo sharing**

5. **Vercel deploy config**

---

## Notes for new chat

- The owner has a UI/UX and front-end development background — responses can be technical
- Currency is ₹ (Indian Rupees)
- Business is based in Aizawl, Mizoram, India
- Supabase project is already provisioned and schema is live
- No need to re-discuss or re-audit the schema — it is finalised
- When building UI, prefer clean functional design over decorative; the owner has strong design taste
- For the Next.js app, use the **App Router** (not Pages Router)
- Use **TypeScript** throughout
- Use **Tailwind CSS** for styling
- Supabase auth uses email/password — no social login needed
- The app is desktop/tablet first (in-store use), not mobile-first
