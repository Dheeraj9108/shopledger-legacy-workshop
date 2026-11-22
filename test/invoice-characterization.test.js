'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const pricing = require('../lib/pricing');
const invoice = require('../lib/invoice');

// These fixtures are deliberately in memory; this test does not access data/db.json.
test('invoice uses the billed HSN slabs when gstRate is absent from stored order lines', function () {
  const items = [
    { id: 1, name: 'Rice', sku: 'GRN-001', hsn: '1006', price: 640, qty: 1 },
    { id: 8, name: 'Tea', sku: 'BEV-001', hsn: '0902', price: 140, qty: 2 }
  ];

  const billed = pricing.computeTotals(items, '');
  const printed = invoice.computeInvoiceFigures({ items: items, coupon: '' });

  assert.equal(billed.subtotal, 920);
  assert.equal(billed.tax, 82.4);
  assert.equal(billed.total, 1002.4);
  assert.equal(printed.subtotal, 920);
  assert.equal(printed.tax, billed.tax);
  assert.equal(printed.cgst, billed.cgst);
  assert.equal(printed.sgst, billed.sgst);
  assert.equal(printed.total, billed.total);
  assert.deepEqual(printed.rows.map(function (row) { return row.gstPercent; }), [5, 18]);
  assert.deepEqual(printed.rows.map(function (row) { return row.lineTax; }), [32, 50.4]);
});

test('invoice applies the billed SAVE10 discount cap and post-discount GST base', function () {
  const items = [
    { id: 5, name: 'Groundnut Oil', sku: 'OIL-002', hsn: '1508', price: 1120, qty: 2 }
  ];

  const billed = pricing.computeTotals(items, 'SAVE10');
  const printed = invoice.computeInvoiceFigures({ items: items, coupon: 'SAVE10' });

  assert.equal(billed.subtotal, 2240);
  assert.equal(billed.discount, 150);
  assert.equal(billed.tax, 104.5);
  assert.equal(billed.total, 2194.5);
  assert.equal(printed.discount, billed.discount);
  assert.equal(printed.tax, billed.tax);
  assert.equal(printed.cgst, billed.cgst);
  assert.equal(printed.sgst, billed.sgst);
  assert.equal(printed.total, billed.total);
  assert.equal(printed.rows[0].lineTax, billed.lines[0].tax);
});

test('invoice preserves an explicit GST rate in the billed line breakdown', function () {
  const items = [
    { id: 1, name: 'Rice', sku: 'GRN-001', hsn: '1006', gstRate: 5, price: 100, qty: 1 }
  ];

  const billed = pricing.computeTotals(items, '');
  const printed = invoice.computeInvoiceFigures({ items: items, coupon: '' });

  assert.equal(billed.tax, 5);
  assert.equal(printed.tax, 5);
  assert.equal(printed.rows[0].gstPercent, 5);
  assert.equal(printed.cgst, 2.5);
  assert.equal(printed.sgst, 2.5);
  assert.equal(printed.total, 105);
});

test('invoice figures and GST rows match the billed order for HSN slabs and SAVE10', function () {
  const items = [
    { id: 1, name: 'Rice', sku: 'GRN-001', hsn: '1006', price: 640, qty: 1 },
    { id: 8, name: 'Tea', sku: 'BEV-001', hsn: '0902', price: 140, qty: 2 }
  ];
  const billed = pricing.computeTotals(items, 'SAVE10');
  const printed = invoice.computeInvoiceFigures({ items: items, coupon: 'SAVE10' });

  assert.equal(printed.subtotal, billed.subtotal);
  assert.equal(printed.discount, billed.discount);
  assert.equal(printed.tax, billed.tax);
  assert.equal(printed.cgst, billed.cgst);
  assert.equal(printed.sgst, billed.sgst);
  assert.equal(printed.total, billed.total);
  assert.deepEqual(
    printed.rows.map(function (row) { return { gstPercent: row.gstPercent, lineTax: row.lineTax }; }),
    billed.lines.map(function (line) { return { gstPercent: line.gstPercent, lineTax: line.tax }; })
  );
});
