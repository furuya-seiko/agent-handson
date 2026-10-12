// js/app/clock.js のテスト。

const test = require('node:test');
const assert = require('node:assert/strict');
const clock = require('../js/app/clock.js');

const STORED_DATETIME_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$/;

test('CLK-01 現在日時の固定', () => {
    clock.setFixedDatetime('2026-05-15 10:30:00');
    try {
        assert.equal(clock.getCurrentDatetime(), '2026-05-15 10:30:00');
        assert.equal(clock.getCurrentDate(), '2026-05-15');
    } finally {
        clock.clearFixedDatetime();
    }
});

test('CLK-02 固定の解除', () => {
    clock.setFixedDatetime('2026-05-15 10:30:00');
    clock.clearFixedDatetime();
    const currentDatetime = clock.getCurrentDatetime();
    assert.notEqual(currentDatetime, '2026-05-15 10:30:00');
    assert.equal(STORED_DATETIME_PATTERN.test(currentDatetime), true);
});

test('CLK-03 日付が日時から切り出されている', () => {
    clock.setFixedDatetime('2026-12-31 23:59:59');
    try {
        assert.equal(clock.getCurrentDate(), '2026-12-31');
    } finally {
        clock.clearFixedDatetime();
    }
});
