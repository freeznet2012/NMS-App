# NMS verification checklist

The complete implementation tasks and mandatory screen loop are in [Plan.md](../Plan.md). Approved references are in [designs](../designs). The detailed observed results are in [16 November checkpoint](2026-11-16.md); captures and build logs are local verification artifacts.

Checked means observed passing, not merely implemented. All screen tasks remain open until every required loop step passes.

## Completed evidence

- [x] Native Android build installs and starts, including SQLite on x86-64.
- [x] Standalone release-mode emulator app starts with Metro stopped; register and payments survive force-stop/relaunch.
- [x] Warm and cold Android Files image shares reach customer selection, preserve the image, default multi-month payment to zero, save a ₹300 payment and retain its image after restart. Evidence: `screens/13/`.
- [x] Standalone delivery-boy filtering preserves walking-order numbers (Manu starts at stop 22). Evidence: `screens/04/standalone-boy-walking-order.png`.
- [x] 21 automated checks and TypeScript pass (19 November), including a 600-household / 1,000-copy regression, nightly-backup boundaries and Excel/print formatting.
- [x] Expo Doctor: 21/21 checks passed at the last checkpoint.
- [x] Workbook fixture imports 42 households and 56 copies with opening dues.
- [x] Multi-month payment starts at zero; ₹300 allocates May ₹200 and June ₹100.
- [x] Updated route layout shows 11 complete households at default text size and keeps search and delivery-boy controls on one row. Evidence: `screens/04/compact-controls-english.png`.
- [x] Route search switches to All when searching from Paid and restores Paid when closed. Evidence: `screens/04/compact-search-all-statuses.png`.
- [x] Route layout checked at 150% text in English (previous layout) and Malayalam. At enlarged Malayalam text, the status control expands to a full row. Evidence: `screens/04/compact-controls-malayalam-150.png`.
- [x] Manual restore into a separate native installation restores payment and image.
- [x] English and Malayalam master lists open in Android print preview across two pages, with headers repeated on page two. Evidence: `screens/10/malayalam-print-preview.png`.
- [x] The native Android worker ran in a forced 22:05 emulator test while the app was backgrounded. It produced a checksummed archive with 42 households, two payments, two images, and the Malayalam setting. The emulator clock was restored after the test. Natural overnight scheduling remains part of the physical-phone pilot.
- [x] ARM64 pilot APK built. The signature, embedded app bundle, SQLite library and 16 KB alignment checks pass for all 23 native libraries. Physical-phone installation and use remain open.

## Remaining work in sequence

- [ ] Finish native image-sharing edge cases: cancel without saving, repeated shares without duplicate entries and multiple images. Warm/cold routing, save and restart persistence now pass.
- [ ] Verify direct file saves and Android Excel export, including the route and delivery-boy scopes. Malayalam print pagination passes.
- [ ] Complete screen 01 Welcome comparison and both onboarding paths.
- [ ] Complete screen 02 Import comparison and invalid/incremental import paths.
- [ ] Complete screen 03 Routes comparison and month totals.
- [ ] Complete screen 04 Collection comparison, delivery-boy filter and remaining cases.
- [ ] Complete screen 05 Find customer comparison and shared-image selection.
- [ ] Complete screen 06 Household comparison, edits, route moves and prices.
- [ ] Complete screen 07 Bill comparison, corrections and deductions.
- [ ] Complete screen 08 Payment comparison, dates, allocation and attachments.
- [ ] Complete screen 09 Balance comparison, credits, deletion and write-offs.
- [ ] Complete screen 10 Reports comparison and export checks.
- [ ] Complete screen 11 Manage comparison and catalog/activity destinations.
- [ ] Complete screen 12 Backups comparison, interruption and scheduled execution checks.
- [ ] Run the complete workflow with approximately 600 households / 1,000 copies.
- [ ] Install the ARM64 pilot APK on the physical phone and verify operation without Metro. The x86-64 emulator build already passed this check.
- [ ] Test on the father's physical phone, including overnight backups and recovery onto another installation.
- [ ] Reconcile one real route against the paper register for a billing cycle.

For each screen: reference → implement → run → capture → compare → fix/repeat → English/Malayalam and enlarged text → persistence/navigation → evidence/sign-off. See Plan.md for exact acceptance requirements.

Google Drive OAuth and automatic upload are explicitly deferred. They do not block local-only development.

## Release preparation in progress

- Fixed nightly backup eligibility: a manual morning backup no longer suppresses that night's changed register. Added local-time boundary tests for evening execution, overdue foreground recovery and duplicate avoidance. All 20 tests and TypeScript pass after this change.
- Standalone local Android release-mode build: first attempt failed at APK packaging (`standalone-build.log`). The retry with two Gradle workers succeeded (`standalone-retry.log`). The follow-up build included the background-task entry-point fix (`standalone-final-build.log`) and ran without Metro.
- The Excel round-trip verifies Malayalam headers and totals, numeric amounts and delivery-boy scope. HTML checks verify escaped customer names.
- Addressed `No task registered for key expo-task-manager` observed during development startup. `index.js` imports the backup task before Expo Router's entry. Forced Android worker execution now passes.
- Follow-up build succeeded (5m40s), installed and cold-shared successfully. Force-stop/relaunch retained the new ₹300 payment, June allocation and image. Synthetic Anu balance changed ₹2,900 → ₹2,600; Temple Road total changed ₹86,100 → ₹85,800. The earlier payment remains separate. Screen styling is still under review; passing this flow does not sign off the whole design loop.
- Replaced the SDK 57 folder picker call after it failed with an unregistered ActivityResultLauncher. PDF, backup, and payment-image saves now share a folder picker and await the file write. Verified the system folder picker opens. Final export verification requires the operator to grant access to the selected emulator test folder.
- Nightly and manual backups stage each archive before validating it and giving it a restorable `.nms` filename. The forced worker test produced and independently verified the final archive.
- Set Android automatic cloud backup off and removed the unused microphone permission from the native manifest. The app's local backup remains available.

## ARM64 pilot artifact

`NMS-0.1.0-pilot-share-fix.apk` is the current pilot APK in the Drive delivery folder. It supports ARM64 phones and x86-64 emulators. A shared image now opens its own customer picker. Tapping a customer dismisses the keyboard and opens the payment form with the image attached.

Verified a warm share in the development build and a cold share in the standalone APK with Metro stopped. In the standalone test, tapping the route and stop line with the keyboard open selected Anu Canal on the first tap. The ₹7 test payment and its image appeared in the customer's history. Saved payment evidence. The original phone stall did not reproduce in the warm emulator test. Confirm the updated flow on the phone.

SHA-256 `05B53011094A944820E2148FBF5A566ED81AE058F02052079C6685F776894E57`. Build log: `share-picker-build.log`. TypeScript, all 21 automated tests, signing and APK alignment passed.

`NMS-0.1.0-arm64-pilot-navigation.apk` is the archived pilot build with native sideways transitions when opening a detail screen and going back. Reduced motion selects a fade. Routes, Customers, and Manage switch without a slide. TypeScript, the APK signature, and 16 KB ZIP alignment passed. Verified Routes → Temple Road → Anu → Record payment and both Back controls in the Android emulator. Also tested switching bottom tabs from Routes, Customers, and Reports. Back transition capture. Check the feel on the physical phone.

Updated APK SHA-256 `30D28D3D2BA400887149D42907199EB37638929193F136F0B0FA3AF0B0141B57`. Build log: `navigation-pilot-build.log`.

`NMS-0.1.0-arm64-pilot.apk` is the local test build for an ARM64 Android phone (Android 7.0 or later). It uses the Android debug signing key. The build log is `arm64-pilot-retry.log`.

SHA-256 `2E8C3F8FC570EAECB75B1D2E12C1FA0DB2A39317B1130F80D61489F62CC73C74`.

For a repeat build, use the Android SDK and Java configuration in the main README, then run:

```powershell
$env:NODE_ENV = 'production'
$nmsInit = (Resolve-Path 'verification/windows-cmake.init.gradle').Path
./android/gradlew.bat -p android app:assembleRelease '-PreactNativeArchitectures=arm64-v8a' --init-script $nmsInit --max-workers=2
```

The first ARM64 build hit the Windows native object path limit. The init script sets a shorter local CMake staging directory and a stricter object path length. Run Expo prebuild before the Gradle command if native configuration has changed.

## Publication gate

- [ ] Complete all remaining verification above; do not infer completion from passing domain tests.
- [ ] Produce and test an ARM-compatible installable build for the father's phone; an x86-64 emulator APK is not that deliverable.
- [ ] For Google Play publication, configure retained production signing/upload credentials and release versioning, prepare the store listing and privacy/data declarations, then verify the signed release. The current local release-mode test uses development signing and is not a store submission.
- [ ] Record the physical phone/Android version and pilot results before approving use as the sole master register.

Google Drive remains a separately deferred feature. A local-only release still requires the above gates.

The scale regression in `tests/scale.test.cjs` covers 600 households and 1,000 copies across two billing months, deductions, write-offs, 600 payments, reversal, historical carry caps, report reconciliation, and backup round-trip. The physical-phone performance check remains open.

## Routes, month picker, and launcher icon

- [x] Compare the redesigned overview with the refreshed Routes reference. Check the selected month, outstanding total, unpaid count, route card, and inherited month in the Unpaid route list. Captured English and Malayalam at 150%.
- [x] Open the grid through Routes, customer bill, reports, import, household edit, periodical pricing, and payment allocation. Check prior and current year navigation, Android Back dismissal, current selection, disabled future billing months, and selectable future scheduling months. Check payment selection and returning to oldest-first. Captured English billing, Malayalam billing at 150%, effective month, and payment allocation.
- [x] See the newspaper icon in the app drawer and launch NMS from it. Verified the installed APK checksum against the local build and confirmed ARM64 and x86-64 packaging, alignment, and signing.
- [x] Pass TypeScript and all 22 automated tests, including the regression for partial dues and excluding later charges from route totals.
- [ ] Repeat the visual and accessibility checks on the pilot phone.

APK `NMS-0.1.0-pilot-routes-and-months.apk`, SHA-256 `5A3904A866A6FBDAF264FB1BF912875B6FDB40D937E164911AF4F65E57DD4D8C`. Build logs are local verification artifacts.

## Customers directory refresh

- [x] Compare the installed screen with the [approved reference](../designs/05-Customers-refresh.png), including the title, search, filter controls, count, cards, and selected tab. Captured English and Malayalam.
- [x] Apply Temple Road and Manu to the 42-household sample register. The combined filters show 21 results beginning at the original Stop 22. Reset the filters individually and recover all 42 households.
- [x] Search while filters are active and check the zero-result state. Clear search while retaining both filters. Search without filters and distinguish the two Anu matches by Stop 1 and Stop 2.
- [x] Open a customer while the keyboard is visible and return with Back. Both selected filters persist.
- [x] Rebuild after fixing the clipped search hint and separated stop number. Confirm the shorter hint, stacked filters, and whole stop labels at 150% Malayalam text.
- [x] Pass TypeScript, 22 automated tests, APK signature and alignment checks, and standalone installation on the Android emulator.
- [ ] Repeat with the pilot phone, several routes, identical display names, and Malayalam search input.

APK `NMS-0.1.0-pilot-customers-refresh.apk`, SHA-256 `0E09B6B3BF4405D0D278080B717E066567801FF18857EA496869AD0357909AA7`. See build log.

## Bottom navigation and Manage refresh

- [x] Compare the [bottom bar reference](../designs/00-Bottom-navigation.jpg) on Routes, Customers, Manage, and Reports. The active indicator, icon, and label follow the current tab. Captured Customers active.
- [x] Compare the [Manage reference](../designs/11-Manage-refresh.jpg). Verify the three groups and all eight rows in English.
- [x] Open Reports, Recent activity, Periodicals, Delivery boys, the Routes catalog, household import, and Backups. Return to Manage from each destination.
- [x] Open the language choice, choose Malayalam, and verify the setting after a cold launch. At 150% text, check Operations and Manage data, scroll to Settings and maintenance, and switch back to English.
- [x] Pass TypeScript, all 22 automated tests, APK signature and alignment checks, and installation on the Android emulator.
- [ ] Repeat the visual and accessibility checks on the pilot phone.

APK `NMS-0.1.0-pilot-manage-and-navigation.apk`, SHA-256 `6DFA7BAC7A90D350962A596BEFF9B1B0F9126297314B6FE302AE3E5916B76625`. See build log.

## Route collection list refresh

- [x] Compare Unpaid, Paid, and All with the two approved references. The synthetic Psra route has 2 unpaid with ₹600 outstanding, 18 paid with ₹8,100 collected, and 20 billed households totaling ₹8,700. Ten rows fit in All at default text size on the emulator.
- [x] Expand the four-row Paid preview and keep the original stop numbers. Verify pale green Paid badges and amber Unpaid badges in All.
- [x] Select Alex and confirm the tabs and totals recalculate. Search for Thomas from Unpaid, find the paid match at Stop 01, and exclude the same name on Canal Lane. Clear search to restore Unpaid and keep Alex and the original Stop 03. Opening the Stop 03 bill preserves the October billing month.
- [x] Open Add customer and verify the route is preselected.
- [x] Check the final APK at 150% Malayalam text. Verify the add icon, search hint, wrapped tab labels, and stacked rows. Check the empty Unpaid state and singular All count on the second route.
- [x] Pass TypeScript and 23 automated tests. The new billing regression checks that partial payments remain unpaid, carried debt is capped, later charges stay outside the selected bill, and write-offs do not increase collections.
- [ ] Repeat on the physical pilot phone.

APK `NMS-0.1.0-pilot-route-collection.apk`, SHA-256 `CEE313E9B9E9C1E618B3880147B688DDA4FD1C36B450870F399F4DBF69F5D840`. See build log.

## Customer billing details

- [x] Compare the installed screen with the [approved reference](../designs/07-Customer-Bill-refresh.jpg). Check the shared initial avatar, current route and stop number, compact month field, and one prominent live balance above the saved bill breakdown.
- [x] Switch between the October bill and December bill. The emulator uses 2025 dates so both months are selectable. October shows ₹130 still to collect from ₹300. December shows ₹730 from ₹750 alongside the original ₹150 and ₹300 carry amounts.
- [x] Open Balance and payments, return to the bill, then record ₹100 allocated to November. The updated December bill shows ₹630 still to collect and ₹120 paid or adjusted. The original total and carried amounts keep their saved values.
- [x] At 150% Malayalam text, verify the full customer name, long periodical names and copy counts, and last carried month and history row above the fixed payment button. The long example contains six periodicals and 21 previous months.
- [x] Pass TypeScript and all 25 automated tests, including the new October and December summaries and the multi-periodical correction and write-off. Verify standalone installation, signing, alignment, and the installed APK checksum.
- [ ] Repeat on the physical pilot phone.

APK `NMS-0.1.0-pilot-customer-billing.apk`, SHA-256 `2A620C5181A8549F332B59C326C782AE6B06FB62E3E19F96508018AFC1AF19F6`. See build log.

## Flat bottom navigation

- [x] Compare the installed bar with the [flat navigation reference](../designs/00-Flat-bottom-navigation.png). Verify square corners, a subtle top divider, the existing icon and label sizes, and blue selection on Routes, Customers, and Manage.
- [x] In gesture mode, verify that the Routes bar and system inset share the same white background across the full width. Check the dark gesture indicator and the Manage state.
- [x] Open Reports and verify Manage stays selected. Restore the emulator’s original three-button setting and confirm the labels stay above the system controls.
- [x] Pass TypeScript, all 25 automated tests, APK signing and alignment checks, and standalone installation on the emulator.
- [ ] Repeat on the physical pilot phone.

APK `NMS-0.1.0-pilot-flat-navigation.apk`, SHA-256 `DDBD5ED37A57E0A0F5260594F26A772CE0A45FDB9DF61EC32B711A8F6D408456`. See build log.

## Customer balance and payments

- [x] Compare the installed screen with the [approved reference](../designs/09-Customer-Balance-refresh.jpg). The emulator fixture uses August through October 2026. The ₹130, ₹300, and ₹300 monthly balances total ₹730. Recent payments appear newest first, with dates and times. Tap a payment row directly to open it.
- [x] Open the ₹130 monthly bill and both payment details. Confirm Back returns to the balance screen. Open the settled July bill from Other billed months.
- [x] Delete the ₹20 fixture payment. The updated balance shows ₹750 to collect, ₹150 for August, and one remaining payment.
- [x] Check a long household name at 150% Malayalam text. Scroll to see the empty outstanding section, ₹50 credit, and payment history.
- [x] Pass TypeScript, all 26 automated tests, APK signature and alignment checks, and standalone Android installation. Match the installed and copied APK to the local build by SHA-256.
- [ ] Repeat the visual and accessibility checks on the physical pilot phone.

APK `NMS-0.1.0-pilot-balance-payments.apk`, SHA-256 `D8C32ACBFEB9B6DA7384FF64E42937F8411734C409FEA6E18355BF74117EE13D`. See build log.

## Bill item corrections

- [x] Open the periodical editor from its pencil. Change a partially paid bill from ₹300 to ₹180 and review the effect. Cancel and leave the original ₹130 due. Save and confirm ₹10 remains with ₹170 already paid.
- [x] Add Mathrubhumi at its August catalog price and a ₹30 Festival edition item. Verify a ₹390 corrected total, ₹300 originally due, and ₹220 still to collect. Remove the custom item and confirm the recalculation to ₹190.
- [x] Restore the existing format 1 fixture on Android. Create a format 2 backup, remove the custom item, then restore the saved file and confirm the item and ₹220 balance and the correction history. The history row opens August directly.
- [x] Confirm the custom item and ₹220 balance in the monthly dues preview and Android print output. Automated export checks cover Excel and the master list’s effective subscriptions.
- [x] Verify the bill rows and item editor at 150% Malayalam text size.
- [x] Pass TypeScript and all 30 automated tests. Verify standalone Android installation, APK signing and 16 KB alignment, and the installed and copied SHA-256.
- [ ] Repeat the bill edit and backup restore on the physical pilot phone.

APK `NMS-0.1.0-pilot-bill-item-editor.apk`, SHA-256 `B86C6466165B63EB6B0076C17CF89437B758A14CBD2EF362071E7EBDA46FF7F5`. See build log.

## Household form and periodical picker

- [x] Compare the Add household form and Delivery & billing section with the [form reference](../designs/06-Household-refresh.jpg). Add customer preselects its route. Verify the delivery checkbox, named stop position, visible effective month, and fixed bottom action.
- [x] Compare the periodical sheet with the [picker reference](../designs/06-Periodical-picker.jpg). Scroll the catalog, search by full name and short code, and tap Done while the keyboard is open. Close or use Android Back to discard temporary selections. Remove an applied selection using its chip.
- [x] Add Anu test after Benny in Psra, set Alex as the delivery person, and record phone, two copies, and a ₹245 special price. The Edit household form reopens with the saved route, position, and quantity.
- [x] Prepare the test household's November bill. Move it to Canal Lane, change the delivery person, and remove a subscription. The household appears at its new stop and the prepared bill retains ₹820 and all three original lines.
- [x] Check the form and picker in Malayalam at 150% system text.
- [x] Pass TypeScript and all 30 automated tests. Verify APK signing, 16 KB alignment, and matching installed and delivered checksums.
- [ ] Repeat on the physical pilot phone.

APK `NMS-0.1.0-pilot-household-refresh.apk`, SHA-256 `71FE02161CF261D84431AB22DD3D697CB42968466B4B4732B2C715510B586468`. See build log.

## Monthly custom items and copy counts

- [x] Check the empty selection action. Check the picker, bill breakdown, and bill correction list with two copies of MM and one of MB. The quantity suffix appears beside MM.
- [x] Add a ₹45 monthly custom item on a household with no catalog papers. Override October to ₹30. The November bill has a fresh ₹45 charge and carries October’s ₹30.
- [x] Edit the household charge to ₹60. Verify the prepared November charge stays at ₹45. Back up and restore the register. Reopen the corrected October bill and the restored ₹60 household default.
- [x] Pass TypeScript and all 33 tests. Coverage includes effective-month changes and removals, pausing new charges when delivery is stopped, snapshot independence, dues and delivery-list exports, and backward-compatible backup restore.
- [x] Verify the standalone Android install, signing and 16 KB alignment, and matching local, installed and delivered checksums.
- [ ] Repeat on the physical pilot phone.

APK `NMS-0.1.0-pilot-monthly-items.apk`, SHA-256 `8052160778CB0883BB18D42BA848E55E2F21DB795247DB8F88D77514D7ADFC3D`. See build log.

## Record Payment redesign

- [x] Compare the screen with the [approved design](../designs/08-Record-Payment-refresh.jpg). With September ₹450 and October ₹300 outstanding, a fresh payment starts at ₹0. Enter ₹500 and confirm it allocates ₹450 to September and ₹50 to October.
- [x] Open the allocation sheet. Choose October for the ₹500 and verify ₹300 goes to October and ₹200 becomes customer credit.
- [x] Open optional details. Use the calendar and Android Files, and confirm both return to the payment draft. In Both, enter ₹200 Cash and confirm the ₹300 UPI remainder. Save one payment with Today's date and a test receipt. Open the saved payment and its restored copy.
- [x] Share an image through Android Files. Find the household and confirm the ₹300 single-month amount and compact allocation. Optional details are collapsed and the saved payment retains the shared image.
- [x] Check the screen with a long customer name, optional details, and allocation sheet in Malayalam at 150% system text. Apply a month above the Android navigation bar and save a Cash payment collected Yesterday. Recheck Cash/UPI entry at default text size on the final build.
- [ ] Repeat on the physical pilot phone.

## Recent activity and Periodicals

- [x] Compare the activity screen with the [approved design](../designs/11-Recent-activity-refresh.jpg). In a synthetic register, check newest-first Today and Yesterday sections, icon tiles, amounts, and correction details. Open a recorded payment and the corrected September bill directly.
- [x] Check the Yesterday filter, the imported household count and timestamp, and search within Imports.
- [x] Compare the periodical list and add form with the [list](../designs/11-Periodicals-refresh.jpg) and [form](../designs/11-Periodical-editor-refresh.jpg) references. Add Evening Paper at ₹380 per month and check the populated editor. Sort by code, search for EP, set the paper inactive, and confirm it appears under Inactive.
- [x] Give Malayala Manorama a ₹350 rate beginning in December. Reopen the already prepared October bill and verify that the saved line remains ₹300.
- [x] Check Recent activity, the periodical list, and the editor in Malayalam at 150% system text.
- [x] Pass TypeScript and all 39 automated tests, including the price snapshot, activity date grouping, split-payment reversal, and format 5 backup restore cases.
- [x] Verify Android pilot signing and 16 KB alignment. Match the local APK, installed APK, and Drive copy by SHA-256. Move the previous pilot APK to Archive and verify its original checksum.
- [ ] Repeat on the physical pilot phone.

APK `NMS-0.1.0-pilot-payment-and-manage.apk`, SHA-256 `D8F2640BA6070D503D004CC7A8C30F7EA353E13FF3417C2039524F1C48385AE2`. See build log.

## Delivery boys and Routes under Manage

- [x] Compare the Delivery boys list and Routes list with the [delivery boys reference](../designs/11-Delivery-boys-refresh.jpg) and [routes reference](../designs/11-Routes-catalog-refresh.jpg).
- [x] Search for Devu with the keyboard open, open the editor, and save the rename. Verify that the search remains on return. Add Manu after confirming the blank-name error.
- [x] Reject a duplicate route name even when its case differs. Save Canal Lane, search for PSRA, rename Psra Main, and confirm it keeps both stops. Rename the assigned delivery boy and verify both household assignments and stop numbers.
- [x] Check Delivery boys, Routes, and the route editor with the keyboard open in Malayalam at 150% system text. Back discards an unsaved rename.
- [x] Pass TypeScript and all 39 tests. Verify Android signing, 16 KB alignment, and matching local, installed, and delivered APK checksums.
- [ ] Repeat on the physical pilot phone.

APK `NMS-0.1.0-pilot-manage-lists.apk`, SHA-256 `4E68A0146D621D022850CC862C41589B790A29607D7E1E420632CCCD980D1B1D`. See build log.

## Import households refresh

- [x] Compare the opening form with the [reference](../designs/02-Import-households-refresh.jpg). Verify the required month, file chooser, column guidance, 10 MB limit, and disabled action before file selection.
- [x] Save the Excel template with Android Files. Read the actual exported workbook and verify the Customers headings, Periodicals examples, and Instructions sheet.
- [x] Verify that cancelling the replacement file chooser keeps the previous preview. Check a periodical price conflict, change to the matching billing month, then choose the workbook again.
- [x] Review an .xlsx batch with 42 households, 56 copies, and ₹2,400 opening dues. Confirm it and verify the ₹19,200 route total. Choose the same workbook again and verify the repeated-file warning and disabled action.
- [x] Open an incremental .xls batch. Confirm the possible duplicate and unknown-code row are excluded by default. Import the valid row and verify it appears as stop 43 with two copies billed at ₹600.
- [x] Check the top of the form and scroll to the file chooser, guidance, and action in Malayalam at 150% text.
- [x] Pass TypeScript and all 39 automated tests. Verify APK signing, 16 KB alignment, and matching local, installed, and delivered checksums.
- [ ] Repeat on the physical pilot phone.

APK `NMS-0.1.0-pilot-import-households.apk`, SHA-256 `2A546846CCE29DAB49483B7B8F3AB1186E041ED5BE4CECAFCD5A313B212D887F`. See build log.

## Backups refresh

- [x] Compare the redesigned screen with the [reference](../designs/12-Backups-refresh.jpg). Verify that the banner and local status use the verified archive's creation time and that the included change time is independent of the current register change.
- [x] Turn nightly backup off and confirm the Android job disappears. Relaunch and confirm the preference persists. Turn nightly backup back on and confirm Android registers the job again.
- [x] Create and export a manual backup with nightly backup off. Verify checksum and contents for the 45-household archive written to the chosen folder.
- [x] Reject an invalid archive. Select the saved archive, verify confirmation details, and confirm the restored register and matching totals. Expand local archives, inspect the recovery copy, then cancel.
- [x] Open Google Drive options and launch the Android Sharesheet. The emulator has no installed target for the backup file. Google Drive automatic upload remains deferred.
- [x] Check the summary and actions in Malayalam at 150% system text.
- [x] Pass TypeScript and all 39 automated tests. Verify APK signing, 16 KB alignment, and matching local, installed, and delivered checksums.
- [ ] Verify overnight timing and sharing to a receiving app on the physical pilot phone.

APK `NMS-0.1.0-pilot-backups-refresh.apk`, SHA-256 `1789DCC52EDF96304703FC85E2160C6260D1B926D986113CC2442AD13284F654`. See build log.
