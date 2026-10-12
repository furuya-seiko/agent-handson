// js/logic/format.js のテスト。

const test = require('node:test');
const assert = require('node:assert/strict');
const format = require('../js/logic/format.js');

test('FMT-01 商品コードのゼロ埋め（下限）', () => {
    assert.equal(format.padProductCode(1), '001');
});

test('FMT-02 商品コードのゼロ埋め（上限）', () => {
    assert.equal(format.padProductCode(999), '999');
});

test('FMT-03 商品コードのゼロ埋め（2桁）', () => {
    assert.equal(format.padProductCode(10), '010');
});

test('FMT-04 桁区切り（0）', () => {
    assert.equal(format.formatNumberWithComma(0), '0');
});

test('FMT-05 桁区切り（3桁）', () => {
    assert.equal(format.formatNumberWithComma(999), '999');
});

test('FMT-06 桁区切り（4桁）', () => {
    assert.equal(format.formatNumberWithComma(1000), '1,000');
});

test('FMT-07 桁区切り（上限に近い値）', () => {
    assert.equal(format.formatNumberWithComma(999999), '999,999');
});

test('FMT-08 桁区切り（集計金額の大きい値）', () => {
    assert.equal(format.formatNumberWithComma(999899000100000), '999,899,000,100,000');
});

test('FMT-09 通貨表示', () => {
    assert.equal(format.formatCurrency(150000), '¥150,000');
});

test('FMT-10 通貨表示（0）', () => {
    assert.equal(format.formatCurrency(0), '¥0');
});

test('FMT-11 日付の表示形式', () => {
    assert.equal(format.formatDateForDisplay('2026-04-10'), '2026/04/10');
});

test('FMT-12 日時の表示形式（時刻のコロンが変換されない）', () => {
    assert.equal(format.formatDatetimeForDisplay('2026-04-10 20:00:00'), '2026/04/10 20:00:00');
});

test('FMT-13 年月の保存形式への変換', () => {
    assert.equal(format.formatYearMonthForStore('2026/04'), '2026-04');
});

test('FMT-14 HTMLエスケープ（5種すべて、アンパサンドの二重変換が起きないこと）', () => {
    const input = `<a href="x">&'</a>`;
    assert.equal(format.escapeHTML(input), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
});

test('FMT-15 HTMLエスケープ（初期データ 008 の商品名）', () => {
    assert.equal(
        format.escapeHTML('<script>alert(1)</script>マット'),
        '&lt;script&gt;alert(1)&lt;/script&gt;マット'
    );
});

test('FMT-16 HTMLエスケープ（null）', () => {
    assert.equal(format.escapeHTML(null), '');
});

test('FMT-17 CSVエスケープ（ダブルクォートとカンマを含む）', () => {
    assert.equal(format.escapeCSVField('24"ワイド, 保護フィルム'), '"24""ワイド, 保護フィルム"');
});

test('FMT-18 CSVエスケープ（空文字）', () => {
    assert.equal(format.escapeCSVField(''), '""');
});

test('FMT-19 CSVエスケープ（null）', () => {
    assert.equal(format.escapeCSVField(null), '""');
});

test('FMT-20 CSVエスケープ（改行を含む値がダブルクォートで囲まれる）', () => {
    const newline = String.fromCodePoint(0x000D, 0x000A);
    assert.equal(format.escapeCSVField('改行' + newline + '入り'), '"改行' + newline + '入り"');
});

test('FMT-21 CSVエスケープ（数式インジェクション対策・イコール）', () => {
    const expected = String.fromCodePoint(0x0022, 0x0027) + '=1+1' + String.fromCodePoint(0x0022);
    assert.equal(format.escapeCSVField('=1+1'), expected);
    assert.equal(format.escapeCSVField('=1+1').length, 7);
});

test('FMT-22 CSVエスケープ（数式インジェクション対策・ハイフン）', () => {
    const expected = String.fromCodePoint(0x0022, 0x0027) + '-1' + String.fromCodePoint(0x0022);
    assert.equal(format.escapeCSVField('-1'), expected);
    assert.equal(format.escapeCSVField('-1').length, 5);
});

test('FMT-23 CSVエスケープ（対象外の先頭文字では接頭辞が付かない）', () => {
    assert.equal(format.escapeCSVField('1=2'), '"1=2"');
});

test('FMT-24 値が無い場合の空文字置換（null）', () => {
    assert.equal(format.toEmptyStringIfNull(null), '');
});

test('FMT-25 値が無い場合の空文字置換（値がある）', () => {
    assert.equal(format.toEmptyStringIfNull('2026-04-20 10:00:00'), '2026-04-20 10:00:00');
});
