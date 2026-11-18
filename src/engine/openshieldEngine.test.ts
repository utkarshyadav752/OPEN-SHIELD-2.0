import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateGradeFromIssues,
  detectVisualInterference,
  runOpenShieldAudit,
  type ScanInputSnapshot
} from './openshieldEngine';

const SHADY_AIRLINES_SNAPSHOT: ScanInputSnapshot = {
  domain: 'shadyairlines.example',
  pageTitle: 'ShadyAirlines — Final Checkout',
  textBlocks: [
    '🔥 Hurry! Offer expires in 00:04:59 — 38 people are viewing this flight right now!',
    'Only 1 left in stock at this price (₹42,999)!',
    'No thanks, I prefer to pay full price and risk losing my luggage'
  ],
  checkboxes: [
    {
      id: 'cb-baggage',
      label: 'Add ₹2,499 VIP Baggage Protection (Recommended)',
      checked: true,
      costInr: 2499
    },
    {
      id: 'cb-club',
      label: 'Auto-enroll me in ShadyClub Gold for ₹999/month after 7 days',
      checked: true,
      costInr: 999
    }
  ],
  buttons: [
    {
      id: 'btn-accept',
      text: 'YES! Protect My Trip & Pay Now',
      role: 'primary',
      fontSizePx: 18,
      widthPx: 620,
      heightPx: 54,
      contrastRatio: 7.4
    },
    {
      id: 'btn-decline',
      text: 'No thanks, I prefer to pay full price and risk losing my luggage',
      role: 'opt_out',
      fontSizePx: 10,
      widthPx: 320,
      heightPx: 14,
      contrastRatio: 1.6
    }
  ],
  tosText:
    'By clicking pay, your membership will auto-renew automatically each month. All bookings are strictly non-refundable under any circumstances. You agree to binding arbitration and waive class action rights. We may sell third-party marketing partners your location and browsing history, and grant us an irrevocable, perpetual license to your travel photos.'
};

test('calculateGradeFromIssues maps issue counts to exact A-F safety grades', () => {
  assert.equal(calculateGradeFromIssues(0), 'A');
  assert.equal(calculateGradeFromIssues(2), 'B');
  assert.equal(calculateGradeFromIssues(4), 'C');
  assert.equal(calculateGradeFromIssues(6), 'D');
  assert.equal(calculateGradeFromIssues(7), 'F');
  assert.equal(calculateGradeFromIssues(10), 'F');
});

test('detectVisualInterference flags asymmetric CTA sizing and low-contrast micro-text', () => {
  const res = detectVisualInterference(SHADY_AIRLINES_SNAPSHOT.buttons);
  assert.equal(res.flagged, true);
  assert.ok(res.areaRatio > 5);
  assert.equal(res.optOutFontSizePx, 10);
});

test('runOpenShieldAudit detects all 10 ShadyAirlines traps, 5 ToS risks, Roach Motel status, and ₹3,498 savings', () => {
  const report = runOpenShieldAudit(SHADY_AIRLINES_SNAPSHOT);
  assert.equal(report.grade, 'F');
  assert.equal(report.urgencyCount, 2);
  assert.equal(report.sneakyCount, 2);
  assert.equal(report.shamingCount, 1);
  assert.equal(report.tosRisks.length, 5);
  assert.equal(report.totalIssues, 10);
  assert.equal(report.potentialSavingsInr, 3498);
  assert.equal(report.roachMotel?.difficulty, 'hard');
  assert.equal(report.tosdrService?.classGrade, 'E');
});

test('runOpenShieldAudit awards Grade A after dark patterns are neutralized and ToS is clean', () => {
  const cleanSnapshot: ScanInputSnapshot = {
    domain: 'cleanbooks.example',
    pageTitle: 'CleanBooks Ethical Checkout',
    textBlocks: [
      'Standard fare locked for 24 hours with transparent breakdown.',
      'No thanks, continue with standard ticket only'
    ],
    checkboxes: [
      {
        id: 'cb-baggage',
        label: 'Add ₹2,499 VIP Baggage Protection (Optional)',
        checked: false,
        costInr: 2499
      }
    ],
    buttons: [
      {
        id: 'btn-accept',
        text: 'Pay Standard Fare',
        role: 'primary',
        fontSizePx: 15,
        widthPx: 280,
        heightPx: 44,
        contrastRatio: 7.2
      },
      {
        id: 'btn-decline',
        text: 'Continue without extras',
        role: 'opt_out',
        fontSizePx: 15,
        widthPx: 280,
        heightPx: 44,
        contrastRatio: 6.5
      }
    ],
    tosText: 'Full refund within 30 days. Zero third-party data sharing.'
  };

  const report = runOpenShieldAudit(cleanSnapshot);
  assert.equal(report.grade, 'A');
  assert.equal(report.totalIssues, 0);
  assert.equal(report.roachMotel?.difficulty, 'easy');
});
