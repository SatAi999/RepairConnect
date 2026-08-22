import { test, expect } from '@playwright/test';

test.describe('RepairConnect Critical User Journey E2E Test', () => {
  const customerEmail = `cust_${Date.now()}@example.com`;
  const repairerEmail = `rep_${Date.now()}@example.com`;
  const businessName = `E2E Precision Repairs ${Date.now()}`;
  const itemName = `Automated E2E Laptop ${Date.now()}`;
  const password = 'password123';

  test('should successfully complete the entire repair lifecycle flow', async ({ page }) => {
    test.slow(); // Allow additional timeout for multiple transitions

    // Print browser console errors and network requests to help debug
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[Browser Console Error] ${msg.text()}`);
      } else {
        console.log(`[Browser Console] ${msg.text()}`);
      }
    });

    page.on('pageerror', err => {
      console.log(`[Browser Page Crash] ${err.message}\nStack:\n${err.stack}`);
    });

    page.on('request', req => {
      if (req.url().includes('/api/')) {
        console.log(`[API Request] ${req.method()} ${req.url()}`);
      }
    });

    page.on('response', async res => {
      if (res.url().includes('/api/')) {
        try {
          const body = await res.text();
          console.log(`[API Response] ${res.status()} ${res.url()} -> ${body.substring(0, 150)}`);
        } catch (e) {}
      }
    });

    // --------------------------------------------------
    // STEP 1: Register Customer
    // --------------------------------------------------
    await page.goto('/register');
    await page.fill('input[placeholder="Jane Doe"]', 'E2E Jane Customer');
    await page.fill('input[placeholder="jane@example.com"]', customerEmail);
    await page.fill('input[placeholder="9876543210"]', '9111111111');
    await page.fill('input[placeholder="Min. 6 characters"]', password);
    await page.selectOption('select', 'CUSTOMER');
    await page.click('button:has-text("Sign Up")');
    
    // Verify redirection to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('Welcome, E2E Jane Customer!');

    // Let's set the location coordinates for this customer using search map geocoder
    await page.fill('input[placeholder*="Bangalore"]', 'Bangalore');
    await page.click('button:has-text("Search")');
    await page.click('button:has-text("Save Pin Location")');

    // Logout
    await page.click('button[title="Log Out"]');
    await expect(page).toHaveURL('/');

    // --------------------------------------------------
    // STEP 2: Register Repairer Shop
    // --------------------------------------------------
    await page.goto('/register');
    await page.fill('input[placeholder="Jane Doe"]', 'E2E Devon Repairer');
    await page.fill('input[placeholder="jane@example.com"]', repairerEmail);
    await page.fill('input[placeholder="9876543210"]', '9222222222');
    await page.fill('input[placeholder="Min. 6 characters"]', password);
    await page.selectOption('select', 'REPAIRER');
    await page.click('button:has-text("Sign Up")');

    await expect(page).toHaveURL(/\/dashboard/);
    // Open workshop profile settings
    await page.click('button:has-text("Edit")');
    await page.fill('#profile-businessName', businessName);
    await page.fill('#profile-description', 'Advanced E2E automated test diagnostics facility.');
    await page.fill('#profile-serviceRadius', '15');
    await page.fill('#profile-minPrice', '600');
    await page.fill('#profile-maxPrice', '5000');
    await page.fill('#profile-availability', 'Mon-Sun 24/7');
    await page.click('button:has-text("Save Settings")');
    await expect(page.locator('text=Workshop profile updated successfully')).toBeVisible();
    
    // Logout
    await page.click('button[title="Log Out"]');

    // --------------------------------------------------
    // STEP 3: Create & Analyze Repair Case (as Customer)
    // --------------------------------------------------
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', customerEmail);
    await page.fill('input[placeholder="••••••••"]', password);
    await page.click('button:has-text("Log In")');

    await page.click('a:has-text("Analyze Damaged Item")');
    await expect(page).toHaveURL(/\/analyze/);

    // Upload phase: click Skip upload to proceed to details
    await page.click('button:has-text("Skip upload")');

    // Form inputs
    await page.selectOption('select', 'Laptop');
    await page.fill('input[placeholder="e.g. MacBook Pro"]', itemName);
    await page.fill('input[placeholder="e.g. Apple"]', 'Dell');
    await page.fill('input[placeholder="e.g. A2338 (M1 2020)"]', 'Latitude 5420');
    await page.fill('textarea', 'The laptop screen turns on but display remains completely black, keyboard backlight lights up.');
    
    // Trigger Analysis
    await page.click('button:has-text("Start AI Diagnosis")');
    
    // Verify navigation to case details
    await expect(page).toHaveURL(/\/cases\//);
    await expect(page.locator('h1')).toContainText(itemName);
    
    // Wait for worthiness engine elements to load
    await expect(page.locator('text=Worthiness Decision')).toBeVisible();

    // --------------------------------------------------
    // STEP 4: Book Service request (as Customer)
    // --------------------------------------------------
    await page.click('button:has-text("Find Nearby Repair Shops")');
    
    // Book with stable seeded repairer (always present regardless of test run)
    const repairerCard = page.locator('div.bg-white', { hasText: 'QuickFix Electronics' }).first();
    await expect(repairerCard).toBeVisible();
    await repairerCard.locator('button:has-text("Book Repair")').first().click();

    // Modal fields
    await page.fill('input[type="datetime-local"]', '2026-08-25T10:00');
    await page.fill('textarea[placeholder*="Describe timing"]', 'E2E timing request.');
    await page.click('button:has-text("Confirm Submission")');

    // Verify Toast/success
    await expect(page.locator('text=Repair request submitted successfully')).toBeVisible();
    
    // Logout
    await page.click('button[title="Log Out"]');

    // --------------------------------------------------
    // STEP 5: Accept Request & Quote Estimate (as Repairer)
    // --------------------------------------------------
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', 'quickfix@example.com');
    await page.fill('input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Log In")');

    // Find requested card in inbox
    const inboxCard = page.locator(`div:has-text("Item: ${itemName}")`).first();
    await expect(inboxCard).toBeVisible();
    await inboxCard.locator('button:has-text("Accept Request")').first().click();

    // Now request is accepted. Start Diagnosis
    const acceptedCard = page.locator(`div:has-text("${itemName}")`).first();
    await expect(acceptedCard).toBeVisible();
    await acceptedCard.locator('button:has-text("Mark: Diagnosis Started")').first().click();

    // Submit quote price
    await acceptedCard.locator('input[placeholder*="e.g. 1500"]').first().fill('1200');
    await acceptedCard.locator('button:has-text("Submit Estimate Quote")').first().click();

    // Logout
    await page.click('button[title="Log Out"]');

    // --------------------------------------------------
    // STEP 6: Approve Quote (as Customer)
    // --------------------------------------------------
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', customerEmail);
    await page.fill('input[placeholder="••••••••"]', password);
    await page.click('button:has-text("Log In")');

    // Go to requests tracker
    await page.click('a:has-text("Track Status")');
    await page.click('button:has-text("Approve & Authorize Repair")');
    await expect(page.locator('text=Request approved successfully')).toBeVisible();

    // Logout
    await page.click('button[title="Log Out"]');

    // --------------------------------------------------
    // STEP 7: Progress Repair & Complete (as Repairer)
    // --------------------------------------------------
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', 'quickfix@example.com');
    await page.fill('input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Log In")');

    const progressCard = page.locator(`div:has-text("${itemName}")`).first();
    await progressCard.locator('button:has-text("Mark: Start Repairing")').first().click();
    await expect(page.locator('text=Request status updated to REPAIR_IN_PROGRESS')).toBeVisible();

    await progressCard.locator('button:has-text("Mark: Ready for Pickup")').first().click();
    await expect(page.locator('text=Request status updated to READY_FOR_PICKUP')).toBeVisible();

    await progressCard.locator('button:has-text("Mark: Completed / Dispatched")').first().click();
    await expect(page.locator('text=Request status updated to COMPLETED')).toBeVisible();

    // Logout
    await page.click('button[title="Log Out"]');

    // --------------------------------------------------
    // STEP 8: Submit Rating Review (as Customer)
    // --------------------------------------------------
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', customerEmail);
    await page.fill('input[placeholder="••••••••"]', password);
    await page.click('button:has-text("Log In")');

    await page.click('a:has-text("Track Status")');
    
    // Submit review
    await page.selectOption('select', '5'); // 5 Stars
    await page.fill('textarea[placeholder*="Rate the speed"]', 'Fabulous E2E repair job! Done quickly.');
    await page.click('button:has-text("Submit Feedback")');

    // Verify completion
    await expect(page.locator('text=Review submitted')).toBeVisible();
  });
});
