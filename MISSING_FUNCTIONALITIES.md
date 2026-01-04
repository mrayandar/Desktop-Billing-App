# Missing Functionalities Report

## Critical Issues Found

### 1. ❌ Stock Validation on Checkout (CRITICAL)
**Issue:** Backend doesn't validate stock availability before processing sale
**Risk:** Can sell more items than available, causing negative inventory
**Location:** `backend/src/routes/sales.js` - Create sale endpoint
**Impact:** Data integrity issue

### 2. ❌ Cashier Sales History Filtering (HIGH PRIORITY)
**Issue:** Cashiers can see all sales, not just their own
**SRS Requirement:** "View own sales history (optional)" - should be filtered
**Location:** `backend/src/routes/sales.js` - Get sales list endpoint
**Impact:** Privacy/security issue

### 3. ⚠️ Discount Permission System (MEDIUM PRIORITY)
**Issue:** No permission check for applying discounts
**SRS Requirement:** "Apply discount if permitted"
**Location:** `frontend/src/pages/Billing.js` and `backend/src/routes/sales.js`
**Impact:** Business rule violation

### 4. ❌ Automatic Logout (LOW PRIORITY)
**Issue:** No inactivity timeout
**SRS Requirement:** "Automatic logout after inactivity (optional)"
**Location:** `frontend/src/context/AuthContext.js`
**Impact:** Security best practice

### 5. ⚠️ Inventory Report (LOW PRIORITY)
**Issue:** No dedicated inventory movement report
**SRS Requirement:** "Inventory report generation"
**Location:** Missing entirely
**Impact:** Reporting gap

### 6. ⚠️ Stock Validation in Cart Updates (MEDIUM PRIORITY)
**Issue:** Frontend allows updating cart quantity beyond available stock
**Location:** `frontend/src/pages/Billing.js` - updateCartItem function
**Impact:** User experience issue

---

## Summary

**Critical:** 1 issue
**High Priority:** 1 issue  
**Medium Priority:** 2 issues
**Low Priority:** 2 issues

**Total Missing:** 6 functionalities

