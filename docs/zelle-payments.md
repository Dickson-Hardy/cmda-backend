# Zelle and Global Network installments

Zelle is a manually verified USD transfer option for Global Network subscriptions and donations. It starts disabled. After deploying, a SuperAdmin or FinanceManager opens **Payments → Zelle Transfers**, enters the receiving account name, Zelle email or phone, and instructions, then enables the option. Existing intents retain a snapshot of the receiving details shown when they were created.

Members choose an amount and create an intent before sending money. The intent memo, recipient, and amount are shown in web/mobile. Members upload a JPEG/PNG receipt (5 MB maximum) and transaction reference. They can return to Zelle Transfers later to upload proof. Rejected receipts can be corrected on the same intent.

Only finance approval credits a subscription or donation. Admin must check the transfer against the actual receiving account. A receipt alone is not verification. Approval and rejection require a review note. Duplicate transaction references and concurrent reviews are blocked. Interrupted approvals can be retried after five minutes; payment records are idempotent, and an already credited record cannot subsequently be rejected.

Receipts use the existing Cloudinary configuration with authenticated image delivery. Proof download links expire after five minutes. Confirm the deployed Cloudinary account supports authenticated uploads/downloads before enabling Zelle. No Zelle API credentials are needed.

USD subscription targets continue to use the existing income brackets ($10/$100/$200/$300/$400). The first confirmed regular payment fixes the income bracket for that calendar year. Partial payments through PayPal or approved Zelle transfers contribute to the same target. Pending/rejected transfers and donations do not contribute. For example, $10 confirmed against $100 leaves $90. UK/Europe retains its GBP 240 target and GBP payment methods; Zelle is not used to pay a GBP subscription. Lifetime membership remains a separate purchase.

Deploy the backend before publishing the clients. Mongoose creates unique partial indexes for Zelle transaction references and Zelle subscription references; if production disables automatic index creation, create the schema-declared indexes through the normal database deployment process before enabling Zelle. No existing payment records are migrated or rewritten.

Validation: scoped service tests cover partial balances, over-balance rejection, fixed yearly targets, review duplication, rejection, ownership, and interrupted approval recovery. Web/admin flows are tested with mock transfer data; real Cloudinary upload/download and Android/iOS device validation still require the configured environment.
