# Newspaper Management System (NMS) — v1 implementation plan

NMS is an offline Android register for a local newspaper agent who manages roughly 600 customer households and 1,000 newspaper copies. The agent is the sole operator in v1. Delivery boys are people he assigns to households and uses to group his lists. The first release milestone is **one real route through one billing cycle**. He should be able to recognize every stop in order and reconcile the closing dues with his paper register before importing the next route.

## Approved design references

The approved images are in the [designs folder](designs/) beside this plan. Use [00 Design system](designs/00-Design-System.png) for visual style and screens 01–12 for the main journeys. Names, routes, dates, counts, and amounts in the images are sample data. The sections below also specify the actions reached through menus, expanded details, file pickers, and secondary flows.

| Screens | Journey |
|---|---|
| [01 Welcome](designs/01-Welcome.png) · [02 Check import](designs/02-Check-Import.png) | Choose English or Malayalam, then start or restore a register. Before importing, check household and copy counts, opening dues, first billing month, and flagged rows. |
| [03 Routes](designs/03-Routes.png) · [04 Route collection list](designs/04-Temple-Road-Customer-List.png) | Choose the billing month, compare unpaid counts and amounts by route, then open a route in walking order. |
| [05 Find customer](designs/05-Find-Customer.png) · [06 Edit household](designs/06-Edit-Household.png) | Distinguish matches by route and stop. Edit the household’s name, route, delivery boy, position after a named stop, and papers. Support optional phone numbers and copy quantities. |
| [07 Customer bill](designs/07-Customer-Bill.png) · [08 Record payment](designs/08-Record-Payment.png) · [09 Customer balance](designs/09-Customer-Balance.png) | Open the household’s bill, review paper charges and carried dues, enter a payment, then see the remaining balance by month and open the saved payment. |
| [10 Reports](designs/10-Reports.png) · [11 Manage](designs/11-Manage.png) · [12 Backups](designs/12-Backups.png) | From Manage, reach reports, recent activity, periodicals, delivery boys, import, backups, and language. Preview a report by type, month, and scope. Backups shows local and Drive status with actions to back up or restore. |

Design each workflow in English and Malayalam. Follow the approved white surfaces, dark ink, blue actions, pale-blue selection, and labeled success and error states. Use Roboto for English and Noto Sans Malayalam for Malayalam, with scalable 22sp titles, 16sp body text, 14sp secondary text, and 32sp prominent amounts as the reference sizes. Use the 4/8/12/16/24dp spacing scale and 8dp component corners. Maintain high text contrast and at least 48 × 48dp touch targets, including compact icons. The Moto G31 Android reference is 1080 × 2400 pixels. Size and reflow content for the available screen and system font setting, allowing longer Malayalam labels and larger type to wrap.

## How the business works

Each month the agent rewrites his customers in route order, carries forward unpaid amounts, and prepares bills by hand. He knows most households’ papers from memory. On collection visits he records payments in a billbook and tears off the customer’s half as a receipt. Later, often days after collection, he checks the billbook against the master list. NMS becomes that master list. The physical billbook stays in daily use.

A **billing month** is the month the papers were delivered. June deliveries are usually collected in July, although collection can start in late June. A payment collected on Tuesday and entered the following Sunday belongs to the customer’s selected dues. Sunday is the entry date. The actual collection date stays blank unless the agent supplies it. He can look up a payment by household without knowing a bill number.

A **customer** is a delivery stop. The agent may know it as a first name, family name, nickname, or landmark. A route can run through streets and apartment buildings, where floor order and even left-to-right order matter. Two households with the same name can be distinguished by their route and neighboring stops. A delivery boy normally brings all papers for one household. Two boys can cover different parts of the same route.

A **periodical** is a publication in the agent’s catalog, with a name, short code, and usual monthly price per copy. Examples include Malayala Manorama (`MM`) and Mathrubhumi (`MB`). A household can take several titles, and many households can take the same title. The usual price includes delivery or service charges. A minority of households have an agreed special price for a particular paper.

## 1. Build the route register and Excel import

- Keep the existing Expo **57.0.33**, React Native **0.86.3**, and TypeScript project. Use an Android development build for device testing and a signed Android app for the pilot. Store the register in SQLite and payment images in app-private storage. Keep billing, payment allocation, and reporting rules separate from screens so a future backend can take over those operations.
- Start with three destinations: **Routes**, **Customers**, and **Manage**. On a new installation, offer **Start a register** and **Restore backup**. Provide English and Malayalam labels from the first working screen. Preserve household names exactly as entered.
- Model households, routes, delivery boys, periodicals, and subscriptions with stable internal IDs. A household has one current route, one delivery boy, a position within the route, a display name, and an optional phone number. Allow duplicate names. Support moving a household, placing it after a named stop, and stopping deliveries while retaining its history.
- Provide an `.xlsx` template with **Periodicals** and **Customers** sheets. Accept repeated codes such as `MM, MM, MB`, preserve row order within each route, and accept optional outstanding amounts under explicit month/year columns. Choose the first NMS billing month during setup so imported opening dues cannot also become newly generated charges for the same month.
- Preview each import with route counts, copy counts, opening dues, unknown codes, and possible duplicate households. Flag a repeated file. Let the user review or skip suspect rows before committing the accepted batch in one transaction. Later imports add households and reuse known periodicals by code. A conflicting price requires an explicit price change.

For example, an initial import for June could include the row below. The names and amounts are illustrative. Each pending column holds only what is still unpaid for that month. A blank means nothing is owed for that month. The row’s position among other rows for Temple Road sets the household’s initial walking order.

| Household | Route | Delivery boy | Phone (optional) | Periodicals | May 2026 pending (₹) | Apr 2026 pending (₹) |
|---|---|---|---|---|---:|---:|
| Anu | Temple Road | Binu | | MM, MB | 200 | |

**First review:** Import one familiar route and hand the phone to the agent. Ask him to find two households, insert a stop between them, and switch to a delivery boy’s list. This is the earliest point to adjust names, text size, and navigation.

## 2. Prepare monthly bills and record collections

- Open on the last completed billing month by default, with a visible month selector for early collections or historical lookup. Opening a month prepares missing household bills exactly once. Preserve monthly snapshots of paper codes, quantities, rates, household name, route, delivery boy, and walking order. Effective-dated changes allow a month opened late to use the correct historical details.
- Use integer paise for money. Calculate each paper line from quantity and monthly rate, less an optional deduction set by the agent. Missed-day count is optional. A household’s special rate carries forward until that paper’s usual price changes. Keep previously billed months intact and support explicit corrections to a bill already written or partially paid.
- Keep **this month’s charge**, **earlier dues shown when the bill was prepared**, and **remaining balance today** distinct. A June bill can show ₹600 for June plus ₹200 pending from May, for ₹800 to collect. The ₹200 remains owed against May and is counted only once. Current collection lists follow the household’s **new route** if it moves.
- Put **Record payment** on the customer screen. For one outstanding month, suggest its remaining balance. For several months, start at ₹0 and require a positive amount before saving. Apply money oldest first unless the agent chooses a month. Show the allocation before saving a month-specific payment with excess money; apply the excess as customer credit. Apply available credit to future charges and show it on the customer record.
- Make cash/UPI, collection date, and photos optional. Offer **Today**, **Yesterday**, and a calendar. Always show entry and update times. Support write-offs separately from collections. Deleting a payment from a household reverses its allocations and any credit it provided, including credit already applied to a later bill. Update the balances and recent activity together.
- Register NMS as an Android share target for images. Sharing a screenshot opens customer search with the route beside each match, followed by the payment form with the image attached. Allow saving an image before deleting its payment. Test sharing on the actual phone with NMS both closed and open early in development because Expo marks incoming sharing experimental. [Expo SDK 57 sharing documentation](https://docs.expo.dev/versions/v57.0.0/sdk/sharing/)

### Route collection list and search

- Carry the selected billing month from Routes into the collection list and display it beside the route name. Default to **Unpaid**, including partially paid bills. Use the remaining balance of the selected bill’s original total to collect for each household. Include its carried dues once and exclude all later charges. **Unpaid** means a positive remainder, **Paid** means zero remaining, and **All** includes both. Use the same balance for route totals and list rows.
- Keep search and the delivery-boy filter compact. Put **Add customer** in the route overflow menu. Aim for ten visible household rows at default text size on the reference device. Allow fewer at larger text sizes to preserve readability and touch targets. Each row keeps its route walking-order number through status changes, search, and delivery-boy filtering.
- While the route search has a nonempty query, match across **all payment statuses** within the selected route, month, and delivery-boy filter. A paid household can therefore appear while searching from Unpaid. Clearing the query restores the previously selected status, including Paid or All. In customer search, including the payment share flow, show route and stop number beneath each matching name.
- In the bill header, show the household name with the billing month directly beneath it. On payment entry, show the oldest-first allocation in plain text as the amount changes (for example, **May ₹200 · June ₹100**) and offer **Change allocation**. The ₹300 shown in screen 08 represents an amount the operator has already typed. A fresh entry for several unpaid months starts at ₹0.

### A household through one billing cycle

Anu takes MM and MB. Suppose each costs ₹300 for June and she still owes ₹200 for May. When the agent reaches her name on Temple Road, he has the information he needs to handwrite her bill: **Anu · MM, MB · ₹800 total, including ₹200 pending from May**. There are two unpaid months, so he types the amount she actually hands him. A ₹300 payment clears May and pays ₹100 toward June. When he next looks her up, only June remains unpaid and a new payment defaults to ₹500. If she moves in July, he finds her on her new route to collect that ₹500. The June register still places her on Temple Road.

Several exceptions have different consequences:

- **Missed delivery or partial month.** The agent chooses a final rupee deduction against the affected paper. He may record days missed, round the amount, or use his own daily-price calculation. The adjustment applies to that month only.
- **Disputed balance.** If he agrees to forgive ₹100, he can write it off against the outstanding month, optionally giving a reason. The balance falls by ₹100 and the amount collected stays the same.
- **Payment entered under the wrong nickname.** He finds the household through recent activity if needed, saves the attached image if he wants to reuse it, deletes the payment there, then records it under the correct household. Manage is available to the trusted operator without a separate admin login.
- **Customer stops delivery.** The agent chooses the final service month and can adjust that month’s charge. Future charges stop. The customer stays in walking order for collection while a balance remains.

## 3. Deliver lists, reports, and collection analytics

- Provide **Master list** and **Monthly dues** as separate report choices. Both support all households, one route, or one delivery boy. A delivery boy’s report groups stops by route and preserves walking order within each group. The master list includes paid households.
- Historical master lists use the selected month’s saved assignments and paper details. Monthly dues reports show the original total to collect and the amount still unpaid **from that total** on the report date. Later months’ charges stay outside that figure. Current collection views use today’s route and include stopped households with outstanding dues.
- Generate Excel, A4 PDF, and Android print output from the same report data so their totals agree. Include the billing month, report date, route or delivery-boy name, and totals. Review an actual Malayalam print sample for legibility and page breaks before settling the layout.
- Make the first analytics screen answer **“Where should I collect?”** Show each route’s unpaid household count and amount for the selected month. Tapping a route opens those households in walking order. In **Manage → Recent activity**, show dated actions with recognizable customer names and routes so the agent can find a mistaken entry.

## 4. Make backup and replacement-phone restore reliable

- **Back up now** creates one portable, versioned archive containing a consistent database snapshot, attachments, app preferences, and activity history. Include backup time, last register change, record counts, and file checksums. Let the user save a copy to a chosen location. Keep Google account credentials outside the archive.
- Schedule a nightly local backup after changes. Android controls the exact background execution time, so also check for an overdue backup when the app next opens. Queue uploads while offline, retry without creating duplicate Drive copies, and show **last local backup** and **last successful Drive upload** separately.
- Connect Google Drive with permission limited to files NMS creates. Upload dated backups and let a replacement phone select a copy after connecting the same account. Keep the previous verified backup until its successor has been verified. [Google Drive permission guidance](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- Restore into temporary storage first. Verify archive compatibility, database integrity, and attachment checksums, then show the backup date, last register change, and counts before confirmation. Preserve a recovery copy of the current register and switch only after validation succeeds. A corrupt archive, interrupted restore, or unavailable Drive account must leave the existing register usable.

## 5. Verify and roll out one route at a time

| Acceptance check | Expected result |
|---|---|
| Selected month and collection status | Select June in Routes and open a route. June appears beside its name and Unpaid opens first. A partly settled June bill stays in Unpaid. Settle the rest, then add a July charge: the household is Paid for June and appears in All. June’s balance and route total exclude July and count each carried due once. |
| Scoped search on the pilot phone | With Unpaid and one delivery boy selected, search for a paid household he serves. It appears with its original stop number. Matches from another route or boy stay excluded. Clear the query and confirm Unpaid returns with the month and boy preserved. Repeat from Paid and All to verify restoration. In Customers, distinguish duplicate names by the route and stop beneath each name. |
| Density, accessibility, and language on the pilot phone | With the agent, open a route with at least ten qualifying households. Check the ten-row target at default text size, compact search and boy controls, and Add customer in overflow. Compare stop numbers before and after filtering. Exercise the route list, search, bill, and payment in English and Malayalam at default and enlarged system text sizes. Verify readable high-contrast labels, intact Malayalam glyphs and amounts, wrapping without clipping, and touch targets of at least 48 × 48dp. |
| Bill identity and payment entry | Confirm the household name sits above the billing month. With May and June unpaid, open a fresh payment at ₹0. Type ₹300 and verify the plain-text May ₹200 and June ₹100 allocation. Use Change allocation to choose another month and check the saved balances. With only one month outstanding, verify its remainder is suggested. |
| Billing and collections | ₹200 owed for May plus ₹600 for June produces ₹800 to collect. A ₹300 oldest-first payment clears May and leaves ₹500 for June. Reopening June creates no duplicate charges. |
| Exceptions and corrections | Multiple copies, special-rate expiry, deductions, write-offs, early collections, credits, and deleted payments reconcile to the household balance. A write-off never increases collections. |
| Historical accuracy | Moving a customer or changing their papers preserves the old bill and historical route order. The customer appears on the new route for collection. |
| Import and reporting | Incremental imports preserve existing households. Duplicate nicknames remain usable. Route and delivery-boy views, Excel exports, PDFs, and analytics agree for the same selection. |
| Android and offline use | On the pilot phone, search and route scrolling remain responsive with about 600 households and 1,000 copies. Billing, payments, photo attachment, reports, and local backups work in airplane mode. |
| Recovery | Restore a real pilot backup onto a second Android installation. Compare route order, balances, images, history, language, and timestamps. Test an interrupted upload and a damaged backup before relying on nightly protection. |

Pilot with one route alongside the paper register. Expand after the agent can write the bills, enter collections on a later day, find the remaining households, and match the closing total. Shared staff access, spreadsheet bulk updates, portable receipt printing, and a centralized backend remain future stages.

## 6. Implementation tasks and completion checks

Work through the prerequisites, then screens 01–12 in order, then native integration and the pilot. Each screen task includes the verification loop below. Record status, dependencies, completed checks, verification results, and comparison screenshot paths beneath its task. Mark a task complete only after its required checks pass. Record a specific blocker and leave the task open when verification cannot be completed.

### Required loop for every screen

1. **Inspect the reference.** Read the linked screen PNG, [00 Design system](designs/00-Design-System.png), and the screen’s business rules.
2. **Implement the screen and behavior.** Include menus, expanded sections, validation, navigation, and applicable empty, loading, success, and error states.
3. **Run it on Android.** Open it through normal navigation in the local `NMS_Phone` emulator. Use controlled sample data to reproduce the reference state.
4. **Capture and compare.** Save an Android screenshot and compare it beside the reference. Check layout, spacing, typography, colors, alignment, controls, row density, and content hierarchy. Account for device density, system bars, and font rendering.
5. **Correct discrepancies and repeat.** Continue implementing, running, capturing, and comparing until the screen follows the approved design and the functional checks pass.
6. **Check accessibility and language.** Exercise English and Malayalam, default and enlarged text, 48dp touch targets, scrolling, and keyboard visibility. Allow layouts to expand for accessibility.
7. **Check integration and persistence.** Exercise entry and exit paths, Android Back, offline operation, and reopening saved data where applicable. Recheck previously completed screens affected by shared changes.
8. **Record evidence and complete the task.** Store comparison captures under `verification/screens/<screen-number>/` with concise results beneath the task. Proceed to the next screen after this loop passes.

Visual completion requires the approved layout and styling with no unexplained discrepancies. Sample names, dates, and amounts remain test fixtures. The written billing and payment rules govern the behavior represented by those fixtures.

### Prerequisites

**Implementation checkpoint — 15 November 2026 (in progress).** Expo Router, SQLite persistence, the domain model, monthly bill preparation, allocation/reversal, workbook import, and checksummed local backup/restore services are implemented. Eight automated domain checks pass. Android export and Expo Doctor (21/21) passed before the latest household/catalog additions; rerun after those additions. No prerequisite or screen is marked complete yet: the full verification loop remains required.

**Observed Android checks:** English/Malayalam welcome switching; native month selection; importing `verification/fixtures/temple-road.xlsx` through the Android file picker (42 households, 56 copies, ₹2,400 opening dues, June total ₹19,200); opening Anu's ₹800 bill; fresh multi-month payment defaults to ₹0; typing ₹300 shows May ₹200 + June ₹100; saving leaves May ₹0 and June ₹500. Evidence is under `verification/screens/01`, `02`, and `08`. The initial file-permission failure was corrected by using the SDK 57 File picker with its granted access. The emulator display needed a cold restart with software graphics.

**Still open:** detailed visual alignment, enlarged-font checks, onboarding restore/restart verification, complete household/catalog validation, reports, payment dates/images/write-offs/corrections, native image sharing, scheduled backups and Drive integration, scale regression and the physical-phone pilot. Existing route/customer/payment destinations support the onboarding integration check; their numbered design loops have not been completed. The emulator contains synthetic test data, not the father's register.

**Subsequent progress:** Household creation/editing and effective-dated walking-order changes, catalog management, recent activity, report preview/Excel/PDF/print, optional payment dates/images, separate balance/payment-detail screens, corrections/write-offs, Android share-intent handling, and local backup scheduling are now implemented and awaiting their complete device/design checks. Sixteen automated checks pass, including import and backup corruption/image round-trips. A clean Expo Go restart retained the sample register and ₹300 payment. Manual backup and restore were exercised on Android: restoring an earlier English snapshot reversed a later Malayalam preference change and retained 42 households and the same October collection total. Captures: `verification/screens/12/manual-backup.png` and `restored-register.png`. A development build is being compiled locally for native-only checks.

**Scope decision — Google Drive deferred:** The user explicitly chose to leave Google Cloud/OAuth setup for later. Implement and verify local automatic backups and manual export/share now. Automatic Drive connection, upload/retry and remote backup selection remain a documented later integration and do not block the local-only milestone. See README for the required future setup. Task 12 must distinguish completion of local recovery from the deferred Drive portion.

**16 November checkpoint:** Native development APK now builds and launches on the x86-64 emulator after opting SQLite into source compilation (the supplied precompiled SQLite artifact had ARM64 only). TypeScript, 17 domain checks, and Expo Doctor 21/21 pass. Verified route density, temporary search across payment statuses and restoration when cleared, inline billing month, and readable English/Malayalam route layouts at 150% text; default font size restored afterward. Native onboarding restore from a verified synthetic archive recovered 42 households, the ₹300 payment with May ₹200 / June ₹100 allocation, and its image attachment. Background task registration succeeded; actual scheduled execution is still unverified. The 42-household English master list rendered in Android print preview across two pages. Report previews now use virtualized rows; Save PDF writes to a chosen folder and still needs device recheck. Full evidence and remaining checks: [verification/2026-11-16.md](verification/2026-11-16.md). Native cold/warm sharing, overnight execution, the remaining design loops, and physical-phone checks stay open; these observations do not sign off whole screen tasks.

- [ ] **P1 — Android foundation and design system.** Confirm installed SDK versions, configure navigation, SQLite migrations, managed attachment storage, language support, fonts, and reusable controls from [00 Design system](designs/00-Design-System.png). Verify these controls in Android before building screens.
- [ ] **P2 — Register and billing services.** Implement households, routes, delivery boys, walking order, periodicals, quantities, effective prices, subscriptions, monthly bill snapshots, deductions, and opening dues. Test repeated month preparation, historical changes, and carried dues counted once. Depends on P1.
- [ ] **P3 — Payment and history services.** Implement oldest-first and selected-month allocation, credits, write-offs, payment deletion and reversal, optional collection dates, and creation/update timestamps. Verify balance consistency and activity records. Depends on P2.
- [ ] **P4 — Import, report, and recovery services.** Implement workbook parsing and preview, insert-only batch import, duplicate checks, report datasets, versioned backup archives, and validated restore. Test with fixtures before connecting screens. Depends on P1–P3.

### Approved screens

Each task depends on P1–P4 and completion of the previous screen’s verification loop. Implement supporting workflows needed to make each screen functional within that task.

- [ ] **01 — Welcome.** Match [01 Welcome](designs/01-Welcome.png). Implement English/Malayalam selection, Start a register, and Restore backup. Verify first installation, returning users, language persistence, and both onboarding paths. Complete the required screen loop.
- [ ] **02 — Check import.** Match [02 Check import](designs/02-Check-Import.png). Implement template access, file selection, counts, opening dues, first billing month, flagged-row review, and import confirmation. Test multiple route batches, repeated files, duplicate names, unknown codes, and failed imports. Complete the required screen loop.
- [ ] **03 — Routes.** Match [03 Routes](designs/03-Routes.png). Implement the default last-completed month, month selection, route totals, unpaid household counts, and navigation carrying the selected month. Verify totals against billing services and saved data. Complete the required screen loop.
- [ ] **04 — Route collection list.** Match [04 Route collection list](designs/04-Temple-Road-Customer-List.png). Implement month beside route name, Unpaid/Paid/All, compact search and delivery-boy filtering, and Add customer in overflow. Verify partial payments, later-charge exclusion, search across statuses within the selected scope, restoration of the previous filter, original stop numbers, and the ten-row target at default text size. Complete the required screen loop.
- [ ] **05 — Find customer.** Match [05 Find customer](designs/05-Find-Customer.png). Implement incremental search with route and stop beneath each result. Test duplicate names, Malayalam names, no results, household selection, and selection while recording a shared payment image. Verify the image-selection context with fixtures here and repeat through Android sharing in task 13. Complete the required screen loop.
- [ ] **06 — Edit household.** Match [06 Edit household](designs/06-Edit-Household.png). Implement creation and editing, optional phone number, route, delivery boy, position after a household, papers and quantities, special prices, and delivery stopping. Verify validation, cancellation, saved changes, route moves, ordering, and preserved history. Complete the required screen loop.
- [ ] **07 — Customer bill.** Match [07 Customer bill](designs/07-Customer-Bill.png). Show household name above billing month, paper charges, deductions, carried dues, and total to collect. Implement month changes, bill corrections, and Record payment. Test partial-month adjustments, multiple copies, historical prices, and corrections after collection. Complete the required screen loop.
- [ ] **08 — Record payment.** Match [08 Record payment](designs/08-Record-Payment.png). Implement amount defaults, plain-text allocation, Change allocation, optional method/date/images, and saving. Verify ₹0 with several unpaid months, the remainder with one unpaid month, explicit allocation, advances, validation, and prevention of duplicate saves. Reproduce the pictured ₹300 state by typing it. Complete the required screen loop.
- [ ] **09 — Customer balance.** Match [09 Customer balance](designs/09-Customer-Balance.png). Implement outstanding amounts by month, paid states, credits, recent payment, timestamps, payment details, image saving, deletion, and write-offs. Verify that corrections update bills, route lists, analytics, and history consistently. Complete the required screen loop.
- [ ] **10 — Reports.** Match [10 Reports](designs/10-Reports.png). Implement master-list and monthly-dues selection, month, all/route/delivery-boy scope, preview, Excel, PDF, and printing. Verify historical order, original versus remaining amounts, totals, pagination, and Malayalam output. Complete the required screen loop.
- [ ] **11 — Manage.** Match [11 Manage](designs/11-Manage.png). Connect Reports, Recent activity, Periodicals, Delivery boys, Import, Backups, and Language. Complete route management and secondary catalog/history workflows using the approved design system. Verify menu destinations, persistence, price changes, and links from activity to affected customers. Complete the required screen loop.
- [ ] **12 — Backups.** Match [12 Backups](designs/12-Backups.png), with Google Drive explicitly deferred by the user. Implement local backup status, last register change, Back up now, manual save/share, backup selection, and restore confirmation. Complete local nightly scheduling and overdue checks. Test corruption, interruption, and restoration with images. Show Drive as not configured; do not imply uploads are occurring. Later Drive integration must add connection, last verified upload, offline retry, remote selection, and account-disconnection checks. Complete the required screen loop for the local-only milestone.

### Native integration and final pilot

- [ ] **13 — Receive shared images.** Configure the Android development build and share target. Test sharing from Gallery and a screenshot into customer selection and payment entry, with NMS closed and open. Verify attachment persistence, cancellation, and repeated shares. Repeat the visual loop for affected screens, especially 05 and 08. Depends on screens 01–12.
- [ ] **14 — End-to-end regression.** Run the acceptance matrix in section 5 with approximately 600 households and 1,000 copies. Exercise import → bill → payment → correction → report → backup → restore. Verify behavior offline and after restarting the app. Depends on task 13.
- [ ] **15 — Actual-phone pilot.** On the agent’s phone, verify route density, search and filter restoration, walking order, keyboard behavior, Malayalam text, enlarged fonts, and touch targets. Check overnight backup behavior and restore onto a second installation. Correct issues and repeat affected screen loops. Depends on task 14.
- [ ] **16 — One-route acceptance.** Run one familiar route alongside the paper register for a billing cycle. Reconcile remaining dues and confirm the agent can prepare bills, record collections later, and find unpaid households before expanding to another route. Depends on task 15.

### Completion rules and dependencies

- Controlled fixtures support visual comparison. Task completion also requires implemented data operations and relevant integration checks.
- When an earlier screen links to a later screen, implement enough of that destination’s real behavior to verify the earlier journey. Complete the destination’s full design loop when its numbered task is reached, then recheck the earlier journey. Record that dependency explicitly.
- The full shared-image journey depends on task 13. Reverify screens 05 and 08 when that native entry point is connected.
- Secondary workflows without PNGs follow the design system and receive the same functional, language, and accessibility checks. Record their captures under a descriptive subfolder of `verification/screens/`.
- Actual-phone verification is a separate completion gate after emulator verification. Record its results when performed.
- Keep external account or device blockers explicit. Complete independent work while leaving the affected task open. Do not mark a screen complete based solely on a successful build or an uninspected screenshot.

