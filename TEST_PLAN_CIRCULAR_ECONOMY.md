# 🧪 Comprehensive Test Plan: Tree Waste Processing & Circular Economy System

This test plan provides step-by-step verification procedures for the **Tree Waste Processing, Citizen Green Marketplace, Commercial Timber Salvage Auction, and Processing Yard Console** subsystems.

---

## 📋 System Architecture & Role Matrix

| Subsystem / Feature | Primary Persona / Role | Portal / URL | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **1. Multi-Stream Waste Intake** | Tree Cutter (`cutter`) | `/cutter/tasks/:id` (Step 3) | Log segregated biomass weights (Foliage, Branches, Logs), species, vehicle info, and disposal photo. |
| **2. Citizen Green Marketplace** | Citizen (`citizen`) | `/citizen-dashboard?tab=store` & `/eco-store` | Purchase organic compost, mulch, biochar & saplings; pay via Razorpay or Eco-Points; choose Home Delivery or Yard Pickup with QR Gate Pass. |
| **3. Commercial Timber Salvage** | Merchant / Sawmill (`merchant`) | `/timber-auction` & `/timber-auctions` | Commercial entity registration (GSTIN/Trade License), live timber lot bidding, countdown timers, outbid tracking, gate-pass retrieval. |
| **4. Processing Yard Console** | Yard / Processing Manager (`official`) | `/processing` & `/processing/dashboard` | Weighbridge verification, 5-stage composting maturation tracker, retail product inventory manager, timber lot auction publisher. |
| **5. Official Timber Management** | Forestry Officer / Admin (`admin`/`official`) | `/timber-management` | Central oversight of all timber lots, live bids monitoring, allotment certificate generation, buyer directory, direct intake-to-auction conversion. |

---

## 🛠️ Prerequisites & Test Environment

1. **Backend Server**: Ensure Express API is running on `http://localhost:5000`
   ```bash
   cd backend && npm run dev
   ```
2. **Frontend App**: Ensure Vite client is running on `http://localhost:5173` or `http://localhost:5174`
   ```bash
   cd frontend && npm run dev
   ```
3. **Database**: MongoDB connection active.

---

## 🧪 Test Suites & Step-by-Step Test Cases

---

### Test Suite 1: Tree Cutter Multi-Stream Biomass Segregation

#### TC-1.1: Segregated Biomass Logging in Task Completion
- **Goal**: Verify that a tree cutter can accurately log segregated biomass weights in Step 3 of task execution.
- **Steps**:
  1. Log in as a Tree Cutter or navigate to `/cutter/tasks/demo-task-1` (or any assigned task).
  2. Complete **Step 1** (Pre-work Hazard Checklist) and **Step 2** (Service Execution Proofs).
  3. Advance to **Step 3: Waste Disposal & Segregation Logging**.
  4. Fill in the biomass fields:
     - **Foliage & Leaves**: `120 kg`
     - **Branches & Twigs**: `85 kg`
     - **Heavy Wood Logs**: `240 kg`
     - **Tree Species**: `Rain Tree / Gulmohar`
     - **Number of Logs**: `4`
     - **Average Log Diameter**: `45 cm`
     - **Vehicle Registration No**: `KA-20-EA-4412`
     - **Vehicle Type**: Select `Mini Tipper`
     - **Destination Yard**: Select `Central Municipal Yard (Depot A)`
  5. Upload or take a photo of the segregated waste disposal load.
  6. Click **"Complete Task & Submit Segregation Log"**.
- **Expected Outcome**:
  - Task status changes to `Completed`.
  - A new document is saved in `WasteIntake` collection (accessible via `GET /api/waste-intakes`).
  - Biomass is segregated with `streamBreakdown` accurately reflecting entered weights in kg.

---

### Test Suite 2: Processing Manager & Yard Console (`/processing`)

#### TC-2.1: Biomass Intake Verification
- **Goal**: Verify yard supervisor can inspect and verify incoming cutter biomass loads.
- **Steps**:
  1. Navigate to `http://localhost:5173/processing`.
  2. Select the **"📥 Biomass Intakes"** tab.
  3. Find the newly submitted cutter intake.
  4. Click **"Verify Weighbridge"** or **"Publish to Composting / Timber Salvage"**.
- **Expected Outcome**:
  - The intake status updates to `Verified`.
  - Foliage/Branches are queued for composting batches, and Heavy Logs are made available for Timber Auction conversion.

#### TC-2.2: Composting Lifecycle & Batch Stage Advancement
- **Goal**: Advance a compost batch through all 5 maturation phases.
- **Steps**:
  1. In `/processing`, click the **"🌱 Composting Lifecycle"** tab.
  2. Click **"+ Create New Compost Batch"**:
     - Batch Code: `BATCH-CMP-2026-X`
     - Initial Weight: `500 kg`
     - Windrow ID: `W-04`
  3. Click **"Advance Stage"** on the active batch:
     - Stage 1: `Collection & Segregation` $\rightarrow$ Stage 2: `Shredding & Inoculation`
     - Stage 2 $\rightarrow$ Stage 3: `Aerobic Decomposition` (enter temperature e.g., `58°C` and moisture `55%`)
     - Stage 3 $\rightarrow$ Stage 4: `Screening & Curing`
     - Stage 4 $\rightarrow$ Stage 5: `Packaged & Quality Tested` (Enter finished compost yield e.g., `320 kg`, 5kg/10kg bags).
- **Expected Outcome**:
  - Maturation progress bar updates dynamically ($0\% \rightarrow 25\% \rightarrow 50\% \rightarrow 75\% \rightarrow 100\%$).
  - Finished yield is added to retail packaging inventory.

#### TC-2.3: Citizen Green Store Inventory Management
- **Goal**: Add and edit products available in the Citizen Green Store.
- **Steps**:
  1. In `/processing`, click the **"📦 Store Inventory"** tab.
  2. Click **"+ Add Green Product"** (or edit existing):
     - Name: `Municipal Enriched Vermicompost (10kg)`
     - Category: `Compost & Organic Manure`
     - Price: `₹240`
     - Eco-Points Price: `120 pts`
     - Stock Quantity: `50 units`
  3. Click **"Save Product"**.
- **Expected Outcome**:
  - Product immediately appears in `GET /api/eco-products` and on the Citizen Green Store frontend.

---

### Test Suite 3: Citizen Green Marketplace & Compost Store (`/citizen-dashboard?tab=store` & `/eco-store`)

#### TC-3.1: Catalog Browsing & Category Filtering
- **Goal**: Verify citizens can filter and view eco-products.
- **Steps**:
  1. Open Citizen Dashboard and click the **"🌿 Green Store"** tab (or browse directly to `/eco-store`).
  2. Click category filter pills:
     - `All Products`
     - `Compost & Organic Manure`
     - `Mulch & Soil Enhancer`
     - `Native Tree Saplings`
     - `Biochar & Fertilizers`
  3. Click on a product card to open the **Quick View Modal** (verify specs, N-P-K ratios, eco-points pricing).
- **Expected Outcome**:
  - Product grid filters instantaneously.
  - Quick view modal displays rich product metadata and stock availability.

#### TC-3.2: Cart & Checkout with Dual Payment (Eco-Points + Razorpay)
- **Goal**: Test purchasing compost with partial or full Eco-Points redemption.
- **Steps**:
  1. Add 2 bags of `City Organic Compost (10kg)` to the Cart.
  2. Click the Floating Cart button to open the **Slide-out Cart Drawer**.
  3. Toggle **"Redeem Eco-Points"** checkbox.
     - Verify discount is applied (1 point = ₹2 off).
  4. Select **Fulfillment Type**:
     - Case A: `🚚 Home Delivery` (Enter address, landmark, PIN code).
     - Case B: `🏬 Municipal Yard Self-Pickup` (Select depot from dropdown).
  5. Click **"Proceed to Pay & Place Order"**.
- **Expected Outcome**:
  - Order is placed via `POST /api/eco-orders`.
  - Eco-Points balance is deducted from citizen's account.
  - Citizen is redirected to **Order Confirmation** with Order ID and Live Status.

#### TC-3.3: Order Tracking & Digital Pickup Pass (QR Code)
- **Goal**: Verify citizen can track order status and download pickup QR pass.
- **Steps**:
  1. In Citizen Green Store, click **"📦 My Orders"** tab.
  2. Click on the placed order.
  3. If Yard Pickup was selected, click **"View Digital Pickup Gate-Pass"**.
- **Expected Outcome**:
  - QR Code is rendered with order ID and verification token.
  - Progress tracker shows active status (`Order Placed` $\rightarrow$ `Processing` $\rightarrow$ `Ready for Pickup / Out for Delivery`).

---

### Test Suite 4: Dedicated Commercial Timber Auction Portal (`/timber-auction`)

#### TC-4.1: Commercial Merchant / Sawmill Registration
- **Goal**: Verify B2B commercial entities can register for timber bidding.
- **Steps**:
  1. Navigate to `http://localhost:5173/timber-auction`.
  2. In the header / modal, click **"Register as Commercial Bidder"**.
  3. Fill in registration form:
     - Company Name: `Karnataka Sawmills & Timber Industries`
     - Authorized Representative: `Ramesh Nayak`
     - GSTIN: `29AAACK1234F1Z8`
     - Trade License: `MNC-BLR-W8892`
     - Business Type: Select `Registered Commercial Sawmill`
     - Contact Phone: `9876543210`
     - Email: `bids@karnatakasawmills.com`
  4. Click **"Register & Authorize"**.
- **Expected Outcome**:
  - Buyer profile is registered in `localStorage` & backend.
  - Header displays commercial company name with a **"✓ Commercial Verified"** badge.

#### TC-4.2: Live Auction Browsing & Bid Placement
- **Goal**: Test real-time bid increments and outbid validation.
- **Steps**:
  1. In `/timber-auction`, browse the active Salvage Lots (e.g., `LOT-TMB-2026-001 - Teakwood Logs`).
  2. Inspect lot specs: Volume ($m^3$), Total Weight ($kg$), Species, Grade, Moisture content.
  3. On an active lot, click quick bid button `+₹1,000` (or enter custom bid higher than current highest bid).
  4. Click **"Submit Official Bid"**.
- **Expected Outcome**:
  - Current Highest Bid updates immediately on the lot card.
  - Bidder badge updates to **"🏆 You are the Highest Bidder!"**.
  - Bid is logged in `POST /api/timber-auctions/:id/bids`.

#### TC-4.3: Outbid Simulation & Outbid Status
- **Goal**: Verify bidder gets notified when another buyer places a higher bid.
- **Steps**:
  1. In another browser tab or incognito window, register a second company (e.g., `Deco Woods Exports`).
  2. Place a bid higher than the previous bid on the same lot.
  3. Return to first browser tab and refresh or view lot.
- **Expected Outcome**:
  - Status badge on first tab updates to **"⚠️ Outbid"**.
  - New highest bid and company name are displayed.

---

### Test Suite 5: Official Timber Salvage & Auction Administration (`/timber-management`)

#### TC-5.1: Central Lots Oversight & Status Filters
- **Goal**: Verify Forestry Officers can monitor and filter all timber lots.
- **Steps**:
  1. Log in as Admin/Official and navigate to `/timber-management` (or click `🪵 Timber Salvage & Auctions` in Admin sidebar).
  2. Click tabs:
     - `🪵 All Timber Lots`
     - `🔴 Live Auctions`
     - `⚖️ Completed & Allotments`
     - `📥 Weighbridge Intakes`
     - `🏢 Registered Buyers`
- **Expected Outcome**:
  - All lots are listed with real-time stats (Total volume, revenue potential, active lots).

#### TC-5.2: Weighbridge Intake to Timber Auction Conversion
- **Goal**: Create a new auction lot directly from cutter log weighbridge data.
- **Steps**:
  1. In `/timber-management`, open the **"📥 Weighbridge Intakes"** tab.
  2. Click **"Verify Weighbridge & Launch Auction"** on an unassigned intake.
  3. Enter Lot Details:
     - Reserve Price (₹)
     - Timber Grade (Grade A / B / C)
     - Estimated Volume ($m^3$)
     - Auction Duration (e.g., 3 days)
  4. Click **"Publish Auction Lot"**.
- **Expected Outcome**:
  - Lot is published to `/api/timber-auctions` and immediately appears live in the commercial bidding portal `/timber-auction`.

#### TC-5.3: Awarding Lot & Allotment Certificate Generation
- **Goal**: Finalize an auction and generate an official municipal allotment certificate.
- **Steps**:
  1. In `/timber-management`, go to **"⚖️ Completed & Allotments"**.
  2. On a closed lot with winning bids, click **"Award Lot & Issue Certificate"**.
  3. Click **"Download Allotment Certificate & Gate-Pass"**.
- **Expected Outcome**:
  - Lot status transitions to `Allotted`.
  - Printable official Municipal Allotment Certificate is generated with QR verification and authorized vehicle pass.

#### TC-5.4: Commercial Buyer Directory Oversight
- **Goal**: View all registered commercial timber merchants and sawmills.
- **Steps**:
  1. Open the **"🏢 Registered Buyers"** tab.
  2. Verify all registered commercial entities are listed with their GSTIN, Trade License, phone number, and count of awarded auctions.
  3. Click **"📞 Call Buyer"** or **"✉️ Email Notice"**.
- **Expected Outcome**:
  - Directory renders all registered buyers.
  - Action buttons open dialer (`tel:`) or email client (`mailto:`) with pre-filled context.

---

## 📊 Summary Test Execution Checklist

- [ ] **Tree Cutter Task Page**: Foliage, Branches & Logs segregation logged to `/api/waste-intakes`.
- [ ] **Processing Console**: Intake verified, compost batch advanced through 5 stages, product added to store.
- [ ] **Citizen Green Store**: Products browsed, filtered, added to cart, and paid via Eco-Points + Razorpay.
- [ ] **Citizen Order QR Pass**: Digital QR gate-pass generated for municipal yard pickup.
- [ ] **Commercial Timber Auction Portal**: Merchant registered, live bid submitted, countdown verified.
- [ ] **Official Timber Management**: Direct intake-to-auction conversion, lot allotment certificate issued, buyer directory verified.
- [ ] **Zero Compilation/Lint Errors**: `npm run build` succeeds cleanly.
