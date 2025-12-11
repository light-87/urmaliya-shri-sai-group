# StockBoard - Production & Stock Management System

## 📋 Overview

StockBoard is a comprehensive production and stock management module that tracks raw materials (Urea), production batches, and finished goods (Free DEF and Buckets). It provides real-time visibility into inventory levels and production history.

---

## 🔐 Access Control

### Who Can Access StockBoard?

**All 3 PIN types can access StockBoard:**
- ✅ PIN 1 (ADMIN) - Full access with production controls
- ✅ PIN 2 (EXPENSE_INVENTORY) - View-only access
- ✅ PIN 3 (INVENTORY_ONLY) - View-only access

### Default Landing Page

**StockBoard is now the first page you see after login** for all users. This ensures everyone has immediate visibility into production status and stock levels.

---

## 📊 What Information Does StockBoard Display?

### 1. Stock Overview Dashboard

Shows real-time stock levels for all materials:

**Urea (Raw Material)**
- Stock in Kilograms (kg)
- Stock in Bags (45 kg per bag)
- Production capacity (how many liters can be produced with current stock)

**Free DEF (Loose Product)**
- Available liters that can be:
  - Filled into buckets, OR
  - Sold directly to customers (loose/bulk)

**Buckets (Empty Containers)**
- Empty buckets in inventory across warehouses
- Shown in liters capacity (not filled)
- Buckets are filled with Free DEF when sold

**Finished Goods (Total)**
- Total finished product = Free DEF Available
- Represents complete production output ready for sale

**Color-Coded Status:**
- 🟢 Green: Good stock levels
- 🟡 Yellow: Low stock warning
- 🔴 Red: Critical/out of stock

### 2. Quick Actions Section

**For Admin Users (PIN 1):**
- **Add Urea** button - Record new Urea purchases
- **Produce Batch** button - Convert Urea into Free DEF
- **Refresh** button - Update all data

**For Non-Admin Users (PIN 2 & 3):**
- **Refresh** button only
- View-only message: "View stock levels and production history. Contact admin for production actions."

### 3. Stock Transaction Log

Complete history of all stock activities:
- Urea additions
- Production batches (grouped display)
- Free DEF sales
- Bucket fills
- Bucket sales

**Each transaction shows:**
- Date
- Type of transaction
- Quantity added/removed
- Running balance after transaction
- Description/notes

---

## 🔄 Material Flow & Stock Tracking

### Complete Material Journey

```
Step 1: Purchase Urea
         ↓
Step 2: Production (360kg Urea → 1000L Free DEF)
         ↓
Step 3: Free DEF can be:
         - Sold directly as loose DEF (via Inventory page)
         - Used to fill buckets when selling them (automatic)
         ↓
Step 4: Empty buckets are:
         - Added to inventory (via Inventory page)
         - Filled with Free DEF and sold (via Inventory page)
```

### Stock Categories Explained

**1. UREA (Raw Material)**
- Purchased in 45kg bags
- Used for production only
- Decreases when producing batches

**2. FREE_DEF (Finished Product)**
- Created during production
- This is your total finished goods available
- Decreases when:
  - Selling loose DEF to customers
  - Selling buckets (filled before sale)
- Increases when: Producing batches

**3. BUCKETS (Empty Containers)**
- Empty containers stored in inventory
- Do NOT contain Free DEF until sold
- When sold, they are automatically filled from Free DEF stock
- Tracked in inventory but have zero product value until filled

---

## ⚙️ Production Operations (Admin Only)

### 1. Adding Urea Stock

**When to use:** After purchasing new Urea from supplier

**Steps:**
1. Click "Add Urea" button
2. Enter date of purchase
3. Enter quantity in kilograms
4. (Optional) Add description (e.g., "Purchased from supplier XYZ")
5. Click "Add Urea"

**System shows:**
- Equivalent bags (auto-calculated at 45kg per bag)
- Example: 360kg = 8 bags

**Result:**
- Urea stock increases
- Transaction recorded in log

---

### 2. Producing Batches

**When to use:** When converting Urea into Free DEF (production runs)

**Production Formula:**
- **Input:** 360 kg Urea (8 bags)
- **Output:** 1000 liters Free DEF

**Steps:**
1. Click "Produce Batch" button
2. Enter number of batches (1-100)
3. Select production date
4. Review stock check:
   - ✅ Green = Enough Urea available
   - ❌ Red = Insufficient Urea
5. Review production output summary
6. Click "Produce Batch"

**Example - Multiple Batches:**
- 3 batches requires:
  - Input: 1,080 kg Urea (24 bags)
  - Output: 3,000 liters Free DEF

**System Validation:**
- Checks if enough Urea is available
- Shows remaining Urea after production
- Prevents production if insufficient stock

**Result:**
- Urea stock decreases
- Free DEF stock increases (this is your finished goods)
- Single grouped transaction in log

**Transaction Display:**
- Production transactions appear as **one combined card** showing:
  - Urea Used: -360 kg
  - Free DEF Produced: +1000 L

---

## 📦 Inventory Operations (Done in Inventory Page)

### 3. Selling Free DEF (Loose/Bulk)

**Where:** Inventory page → "Sell Free DEF" button (Admin only)

**When to use:** Selling DEF directly to customers without buckets

**Steps:**
1. Go to Inventory page
2. Click "Sell Free DEF" button
3. Enter customer name
4. Enter quantity in liters
5. Select date
6. Click "Sell Free DEF"

**Result:**
- Free DEF stock decreases
- Transaction recorded in StockBoard log

---

### 4. Adding Empty Buckets to Inventory

**Where:** Inventory page → "Add Entry" → Stock

**When to use:** Receiving new empty buckets/containers into inventory

**Steps:**
1. Go to Inventory page
2. Click "Add Entry"
3. Select warehouse (Pallavi or Tularam)
4. Select bucket type (TATA_G, AL, AP_BLUE, etc.)
5. Select "Stock" action
6. Enter quantity of buckets
7. Enter supplier/source name
8. Select date
9. Click "Add Entry"

**Important Notes:**
- These are EMPTY containers (not filled with DEF)
- Free DEF stock does NOT change
- Only the bucket inventory count increases

**Result:**
- Bucket inventory increases (count only)
- No change to Free DEF
- Transaction recorded in Inventory page

---

### 5. Selling Buckets

**Where:** Inventory page → "Add Entry" → Sell

**When to use:** Selling filled buckets to customers

**Steps:**
1. Go to Inventory page
2. Click "Add Entry"
3. Select warehouse
4. Select bucket type
5. Select "Sell" action
6. Enter quantity of buckets (negative number)
7. Enter customer name
8. Select date
9. Click "Add Entry"

**What Happens Behind the Scenes:**
- System fills the buckets with Free DEF before sale
- Example: Selling 10 × 20L buckets uses 200L of Free DEF

**Result:**
- Bucket inventory decreases
- Free DEF decreases (used to fill buckets)
- Transaction recorded in both Inventory and StockBoard

---

## 🔄 Auto-Refresh Features

### When Does StockBoard Auto-Refresh?

1. **Window Focus:** Data refreshes automatically when you return to the browser tab
2. **After Actions:** Refreshes after adding Urea or producing batches
3. **Manual Refresh:** Click the "Refresh" button anytime

**Why Auto-Refresh?**
- Ensures data is always current
- Accounts for changes made in Inventory page
- Multiple users see updated information

---

## 📊 Understanding the Dashboard

### Stock Overview Calculations

**Urea Section:**
- **Urea (kg):** Current stock in kilograms
- **Urea (bags):** Current stock ÷ 45 kg per bag
- **Can Produce:** (Current stock ÷ 360 kg) × 1000 L

**Example:**
- If you have 720 kg Urea:
  - Bags: 720 ÷ 45 = 16 bags
  - Can Produce: (720 ÷ 360) × 1000 = 2,000 liters

**Free DEF Section:**
- Shows available Free DEF
- This is your total finished goods
- Can be sold directly or used to fill buckets when selling

**Buckets Section:**
- Shows empty buckets in inventory
- Calculated from Inventory transactions (all bucket types across warehouses)
- Displayed in liters capacity (not filled)
- Formula: Sum of (bucket count × bucket size) for each type

**Finished Goods Section:**
- Total output: Free DEF Available
- Buckets are NOT counted (they're empty until sold)
- Represents complete inventory ready for sale

---

## 📝 Transaction Log Details

### Transaction Types

**1. ADD_UREA**
- Icon: Package (📦)
- Color: Blue
- Shows: Urea added, new balance

**2. PRODUCE_BATCH**
- Icon: Factory (🏭)
- Color: Purple
- Shows: Combined view of Urea used, Free DEF produced, Finished Goods
- Grouped display for better clarity

**3. SELL_FREE_DEF**
- Icon: Trending Down (📉)
- Color: Red
- Shows: Free DEF sold, customer info

**4. SELL_BUCKETS**
- Icon: Trending Down (📉)
- Color: Red
- Auto-created from Inventory "Sell" action
- Shows: Free DEF used to fill and sell buckets
- Note: Stocking empty buckets does NOT create a transaction

### Reading Transaction Cards

**Each card displays:**
- **Left side:**
  - Icon indicating transaction type
  - Transaction name
  - Category (Urea, Free DEF, Finished Goods)
  - Description
  - Date
- **Right side:**
  - Quantity (+ for additions, - for consumption/sales)
  - Running balance after transaction

**Production Batch Cards (Special):**
- Purple background
- Shows both impacts in one card:
  - Urea Used (red)
  - Free DEF Produced (green)

---

## 💾 Backup Integration

### StockBoard Data in Backups

**What's Backed Up:**
All StockBoard transactions are automatically included in system backups:
- Google Drive Excel file now has 3 sheets:
  1. Inventory
  2. Expenses
  3. **Stock** (NEW)

**Stock Sheet Contains:**
- Transaction ID
- Date
- Type (ADD_UREA, PRODUCE_BATCH, etc.)
- Category (UREA, FREE_DEF, FINISHED_GOODS)
- Quantity
- Unit (KG, LITERS)
- Description
- Running Total
- Created timestamp

**Backup Schedule:**
- Automatic backup every 24 hours
- Manual backup available in Admin settings

---

## 🎯 Common Workflows

### Daily Production Workflow

**Morning:**
1. Admin logs in → Lands on StockBoard
2. Check Urea stock levels
3. If Urea is low → Add Urea stock

**Production Time:**
1. Click "Produce Batch"
2. Enter number of batches based on demand
3. System validates Urea availability
4. Confirm production
5. Free DEF stock increases

**Inventory Management:**
1. Go to Inventory page
2. Add empty buckets to inventory (Stock action)
3. Bucket inventory increases (no change to Free DEF)

**Sales:**
1. Sell buckets via Inventory page (auto-fills from Free DEF), OR
2. Sell Free DEF (loose) via Inventory page "Sell Free DEF" button
3. Free DEF decreases in both cases

### Weekly Review Workflow

**As Admin:**
1. Open StockBoard
2. Review transaction log for the week
3. Check Finished Goods levels
4. Plan next week's Urea purchases

**As Staff (Non-Admin):**
1. Open StockBoard
2. Check current stock levels
3. Report to admin if stock is low
4. View production history

---

## 🚨 Important Notes

### Stock Level Warnings

**When Urea is Low:**
- Dashboard shows red color
- Cannot produce batches if insufficient

**When Free DEF is Low:**
- Cannot sell buckets if insufficient Free DEF to fill them
- Warning appears when trying to sell buckets or loose DEF
- Time to produce more batches

### Permissions Summary

| Action | PIN 1 (Admin) | PIN 2 | PIN 3 |
|--------|---------------|-------|-------|
| View StockBoard | ✅ | ✅ | ✅ |
| Refresh Data | ✅ | ✅ | ✅ |
| Add Urea | ✅ | ❌ | ❌ |
| Produce Batch | ✅ | ❌ | ❌ |
| Sell Free DEF | ✅ | ❌ | ❌ |
| View Transactions | ✅ | ✅ | ✅ |

### Data Integrity

**Running Totals:**
- System maintains accurate running balances
- Each transaction records the balance after that transaction
- Cannot be manually edited (prevents errors)

**Auto-Tracking:**
- Inventory actions automatically update StockBoard
- Ensures consistency across modules
- No manual duplication needed

---

## 🔧 Database Migration (Production Deployment)

### For Initial Setup

After deploying to production, run this command once:

```bash
npx prisma migrate deploy
```

This creates the StockTransaction table in the production database.

**Migration Files Created:**
1. `20251121155631_add_stock_tracking` - Adds StockTransaction table
2. `20251121170000_add_stock_count_to_backup_log` - Adds stock count to backups

**If Migration Already Run:**
- System will show graceful messages
- App will work normally

---

## 📱 User Experience

### Navigation

**After Login:**
- All users land on StockBoard (default page)
- Top navigation bar shows:
  - StockBoard (current)
  - Inventory
  - Expenses (if permitted)
  - Dashboard (Admin only)
  - Statements (Admin only)

### Mobile Responsive

- All StockBoard features work on mobile
- Cards stack vertically on small screens
- Easy to read stock levels
- Touch-friendly buttons

---

## ❓ FAQ

**Q: What happens if I produce a batch without enough Urea?**
A: The system prevents it. You'll see a red warning with the exact amount needed vs. available.

**Q: Why doesn't Free DEF decrease when adding buckets to inventory?**
A: Because buckets are empty containers. They're only filled with Free DEF when you sell them to customers.

**Q: Can non-admin users see transaction history?**
A: Yes! All users can view the complete transaction log and stock levels.

**Q: How do I know when to order more Urea?**
A: Check "Can Produce" in the dashboard. If it's less than your typical weekly production, order more Urea.

**Q: Can I produce multiple batches at once?**
A: Yes! You can produce 1-100 batches in a single transaction. The system calculates total Urea needed.

**Q: Where do I see bucket stock?**
A: Bucket stock is shown in "Buckets" section (calculated from Inventory). For detailed bucket breakdown, go to Inventory page.

**Q: How often should I refresh?**
A: Auto-refresh handles it, but you can manually refresh anytime for instant updates.

---

## 📞 Support

For questions or issues with StockBoard:
1. Check this documentation first
2. Review transaction log for recent changes
3. Contact system administrator (PIN 1 holder)

---

## 🎉 Benefits of StockBoard

✅ **Real-time visibility** - Always know current stock levels
✅ **Automated tracking** - No manual calculations needed
✅ **Complete history** - Every transaction recorded
✅ **Multi-user access** - All staff can view status
✅ **Production validation** - Prevents errors
✅ **Integrated with Inventory** - Single source of truth
✅ **Backup included** - Data protection guaranteed
✅ **Mobile friendly** - Access from anywhere

---

**Document Version:** 1.0
**Last Updated:** November 21, 2025
**System:** PMR Industries - Production Management
