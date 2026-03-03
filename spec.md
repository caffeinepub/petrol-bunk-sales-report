# Petrol Bunk Sales Report

## Current State
App has:
- HSD & MS fuel cards with meter readings and auto-calculated gross sales
- Deductions section with 4 fixed rows (Cash Received, Daily Pump Test, QR Payments, Card Payments), each with a `+` button that currently adds a sub-row indented below that row
- Summary showing HSD + MS gross sales, deductions breakdown, and Net Cash Sales
- Denomination calculator, Report History, Save/Download/Print actions

## Requested Changes (Diff)

### Add
- **Engine Oil section** placed below the HSD & MS fuel cards grid (before Deductions)
  - Section header "ENGINE OIL" with a global `+` button
  - Clicking `+` adds a new main row with: Product Name (text input), Quantity (number), Price per unit (number), Total (auto-calculated = Quantity × Price, read-only)
  - Rows can be removed individually with an `×` button
  - Engine Oil total (sum of all row totals) included in the Summary alongside MS & HSD sales and added to Total Gross Sales

### Modify
- **Deductions `+` button behaviour**: change from adding a sub-row (indented, with "└" prefix) to adding a new independent main row directly below the fixed row it belongs to. The new main row should look the same as the existing fixed rows (same grid layout: label input | description input | amount input | remove button), NOT indented/sub-styled. The label field should be editable (placeholder "Row name").
- **Summary**: add an "Engine Oil Sales" line item in the Fuel Sales Breakdown grid alongside HSD Sales and MS Sales. Engine Oil total is included in Total Gross Sales calculation.

### Remove
- Sub-row indented styling (the `└` prefix and `border-l-2 border-primary/20 ml-2` indent) for deduction extra rows — they should now be standalone main rows

## Implementation Plan

1. Add `EngineOilRow` interface: `{ id: string; productName: string; quantity: string; price: string }`
2. Add `engineOilRows` state (array of EngineOilRow), initially empty
3. Add handlers: `addEngineOilRow`, `removeEngineOilRow`, `updateEngineOilRow`
4. Compute `engineOilTotal = sum of (qty * price)` for each row; add to `totalGross` calculation
5. Render "Engine Oil" section card between the fuel cards grid and Deductions section, with `+` button in header to add rows; each row: product name input, qty input, price input, auto-total display, remove button
6. In Summary, add Engine Oil Sales box in the fuel sales breakdown grid (alongside HSD & MS)
7. Update `totalGross` to include `engineOilTotal`
8. Change deduction extra rows: remove the sub-row indentation styling; render them as full main rows with the same grid as fixed rows, with an editable label input instead of a static label. Remove the `└` tree character and `border-l-2` indent styling.
9. Update Word doc export to include Engine Oil section and updated totals
10. Apply deterministic `data-ocid` markers to all new interactive elements
