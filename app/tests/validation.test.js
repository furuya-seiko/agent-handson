// js/logic/validation.js のテスト。

const test = require('node:test');
const assert = require('node:assert/strict');
const validation = require('../js/logic/validation.js');

test('VAL-01 空白除去（半角・全角の前後）', () => {
    assert.equal(validation.trimInputValue(' 　商品　 '), '商品');
});

test('VAL-02 空白除去（タブ・改行・復帰）', () => {
    const input = String.fromCodePoint(0x0009, 0x000A, 0x000D, 0x0020) + 'A' + String.fromCodePoint(0x0020);
    assert.equal(validation.trimInputValue(input), 'A');
});

test('VAL-03 空白除去（中間の空白は残る）', () => {
    assert.equal(validation.trimInputValue(' A B '), 'A B');
});

test('VAL-04 空白除去（文字列以外）', () => {
    assert.equal(validation.trimInputValue(null), '');
});

test('VAL-05 文字数（全角）', () => {
    assert.equal(validation.countCharacters('あいう'), 3);
});

test('VAL-06 文字数（サロゲートペアは1文字）', () => {
    assert.equal(validation.countCharacters(String.fromCodePoint(0x1F600)), 1);
});

test('VAL-07 文字数（半角と全角を区別しない）', () => {
    assert.equal(validation.countCharacters('ABあい'), 4);
});

test('VAL-08 数値判定（半角数字）', () => {
    assert.equal(validation.isDigitsOnly('0123'), true);
});

test('VAL-09 数値判定（空文字）', () => {
    assert.equal(validation.isDigitsOnly(''), false);
});

test('VAL-10 数値判定（全角数字）', () => {
    assert.equal(validation.isDigitsOnly('１２３'), false);
});

test('VAL-11 数値判定（桁区切り）', () => {
    assert.equal(validation.isDigitsOnly('1,000'), false);
});

test('VAL-12 数値判定（符号）', () => {
    assert.equal(validation.isDigitsOnly('+1'), false);
    assert.equal(validation.isDigitsOnly('-1'), false);
});

test('VAL-13 数値判定（小数）', () => {
    assert.equal(validation.isDigitsOnly('1.0'), false);
});

test('VAL-14 数値判定（指数表記）', () => {
    assert.equal(validation.isDigitsOnly('1e3'), false);
});

test('VAL-15 数値判定（中間の空白）', () => {
    assert.equal(validation.isDigitsOnly('1 2'), false);
});

test('VAL-16 商品名（必須）', () => {
    const validationResult = validation.validateProductName('register-product-name', null, '　');
    assert.equal(validationResult.error.messageID, 'E-101');
    assert.equal(validationResult.error.fieldID, 'register-product-name');
    assert.equal(validationResult.error.rowIndex, null);
    assert.equal(validationResult.value, '');
});

test('VAL-17 商品名（上限ちょうど）', () => {
    const validationResult = validation.validateProductName('register-product-name', null, 'あ'.repeat(50));
    assert.equal(validationResult.error, null);
});

test('VAL-18 商品名（上限超過）', () => {
    const validationResult = validation.validateProductName('register-product-name', null, 'あ'.repeat(51));
    assert.equal(validationResult.error.messageID, 'E-103');
    assert.equal(validationResult.error.messageParams.maxLength, 50);
});

test('VAL-19 商品名（エラー時も空白除去後の値を返す）', () => {
    const validationResult = validation.validateProductName(
        'register-product-name', null, ' ' + 'あ'.repeat(51) + ' '
    );
    assert.equal(validationResult.error.messageID, 'E-103');
    assert.equal(validationResult.value, 'あ'.repeat(51));
});

test('VAL-20 商品名（判定順：必須が形式より先）', () => {
    const validationResult = validation.validateProductName('register-product-name', null, '');
    assert.equal(validationResult.error.messageID, 'E-101');
});

test('VAL-21 検索条件の商品名（空文字は正常）', () => {
    const validationResult = validation.validateSearchProductName('search-product-name', '');
    assert.equal(validationResult.error, null);
    assert.equal(validationResult.value, '');
});

test('VAL-22 検索条件の商品名（上限超過）', () => {
    const validationResult = validation.validateSearchProductName('search-product-name', 'あ'.repeat(51));
    assert.equal(validationResult.error.messageID, 'E-103');
});

test('VAL-23 単価（必須）', () => {
    const validationResult = validation.validatePrice('register-price', null, '');
    assert.equal(validationResult.error.messageID, 'E-101');
    assert.equal(validationResult.error.messageParams.label, '単価');
});

test('VAL-24 単価（形式）', () => {
    const validationResult = validation.validatePrice('register-price', null, '１５０');
    assert.equal(validationResult.error.messageID, 'E-104');
});

test('VAL-25 単価（桁区切り入り）', () => {
    const validationResult = validation.validatePrice('register-price', null, '1,000');
    assert.equal(validationResult.error.messageID, 'E-104');
});

test('VAL-26 単価（下限未満）', () => {
    const validationResult = validation.validatePrice('register-price', null, '0');
    assert.equal(validationResult.error.messageID, 'E-105');
    assert.equal(validationResult.error.messageParams.min, 1);
    assert.equal(validationResult.error.messageParams.max, 999999);
});

test('VAL-27 単価（下限ちょうど）', () => {
    const validationResult = validation.validatePrice('register-price', null, '1');
    assert.equal(validationResult.error, null);
    assert.equal(validationResult.numberValue, 1);
});

test('VAL-28 単価（上限ちょうど）', () => {
    const validationResult = validation.validatePrice('register-price', null, '999999');
    assert.equal(validationResult.error, null);
    assert.equal(validationResult.numberValue, 999999);
});

test('VAL-29 単価（上限超過）', () => {
    const validationResult = validation.validatePrice('register-price', null, '1000000');
    assert.equal(validationResult.error.messageID, 'E-105');
});

test('VAL-30 単価（先頭ゼロを許容）', () => {
    const validationResult = validation.validatePrice('register-price', null, '0001000');
    assert.equal(validationResult.error, null);
    assert.equal(validationResult.numberValue, 1000);
});

test('VAL-31 単価（判定順：必須が形式より先）', () => {
    const validationResult = validation.validatePrice('register-price', null, '　');
    assert.equal(validationResult.error.messageID, 'E-101');
});

test('VAL-32 数量（下限・上限）', () => {
    const lowerBound = validation.validateQuantity('sales-quantity', 0, '1');
    assert.equal(lowerBound.error, null);
    assert.equal(lowerBound.numberValue, 1);

    const upperBound = validation.validateQuantity('sales-quantity', 0, '9999');
    assert.equal(upperBound.error, null);
    assert.equal(upperBound.numberValue, 9999);

    assert.equal(validation.validateQuantity('sales-quantity', 0, '0').error.messageID, 'E-105');
    assert.equal(validation.validateQuantity('sales-quantity', 0, '10000').error.messageID, 'E-105');
});

test('VAL-33 数量（rowIndex がエラーに設定される）', () => {
    const validationResult = validation.validateQuantity('sales-quantity', 2, '');
    assert.equal(validationResult.error.rowIndex, 2);
    assert.equal(validationResult.error.fieldID, 'sales-quantity');
    assert.equal(validationResult.error.messageID, 'E-101');
});

test('VAL-34 商品コードの選択（未選択）', () => {
    const validationResult = validation.validateSelectedProductCode('sales-product-code', 0, '');
    assert.equal(validationResult.error.messageID, 'E-102');
    assert.equal(validationResult.error.messageParams.label, '商品名');
});

test('VAL-35 商品コードの選択（形式不正）', () => {
    const validationResult = validation.validateSelectedProductCode('sales-product-code', 0, '1');
    assert.equal(validationResult.error.messageID, 'E-102');
});

test('VAL-36 商品コードの選択（正常）', () => {
    const validationResult = validation.validateSelectedProductCode('sales-product-code', 0, '001');
    assert.equal(validationResult.error, null);
    assert.equal(validationResult.value, '001');
});

test('VAL-37 年月（必須）', () => {
    const validationResult = validation.validateYearMonth('csv-year-month', '　');
    assert.equal(validationResult.error.messageID, 'E-101');
    assert.equal(validationResult.error.messageParams.label, '年月');
});

test('VAL-38 年月（区切り文字が不正）', () => {
    assert.equal(validation.validateYearMonth('csv-year-month', '2026-04').error.messageID, 'E-106');
});

test('VAL-39 年月（月のゼロ埋めなし）', () => {
    assert.equal(validation.validateYearMonth('csv-year-month', '2026/4').error.messageID, 'E-106');
});

test('VAL-40 年月（月が範囲外）', () => {
    assert.equal(validation.validateYearMonth('csv-year-month', '2026/00').error.messageID, 'E-106');
    assert.equal(validation.validateYearMonth('csv-year-month', '2026/13').error.messageID, 'E-106');
});

test('VAL-41 年月（年が下限未満・上限超過）', () => {
    assert.equal(validation.validateYearMonth('csv-year-month', '1899/12').error.messageID, 'E-106');
    assert.equal(validation.validateYearMonth('csv-year-month', '3000/01').error.messageID, 'E-106');
});

test('VAL-42 年月（下限・上限ちょうど）', () => {
    assert.equal(validation.validateYearMonth('csv-year-month', '1900/01').error, null);
    assert.equal(validation.validateYearMonth('csv-year-month', '2999/12').error, null);
});

test('VAL-43 年月（前後の空白を除去して正常）', () => {
    const validationResult = validation.validateYearMonth('csv-year-month', ' 　2026/04 ');
    assert.equal(validationResult.error, null);
    assert.equal(validationResult.value, '2026/04');
});

test('VAL-44 年月（全角数字）', () => {
    assert.equal(validation.validateYearMonth('csv-year-month', '２０２６/０４').error.messageID, 'E-106');
});
