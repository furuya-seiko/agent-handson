// js/logic/result.js のテスト。

const test = require('node:test');
const assert = require('node:assert/strict');
const result = require('../js/logic/result.js');

test('RES-01 成功結果の既定値', () => {
    assert.deepEqual(result.createSuccessResult(null), {
        isSuccess: true,
        messageID: null,
        messageParams: {},
        errors: [],
        data: null
    });
});

test('RES-02 成功結果（メッセージとデータあり）', () => {
    const actionResult = result.createSuccessResult('I-001', {}, { productCode: '010' });
    assert.equal(actionResult.isSuccess, true);
    assert.equal(actionResult.messageID, 'I-001');
    assert.equal(actionResult.data.productCode, '010');
    assert.deepEqual(actionResult.errors, []);
});

test('RES-03 業務エラー結果', () => {
    assert.deepEqual(result.createErrorResult('E-206'), {
        isSuccess: false,
        messageID: 'E-206',
        messageParams: {},
        errors: [],
        data: null
    });
});

test('RES-04 業務エラー結果（データあり）', () => {
    const actionResult = result.createErrorResult('E-901', {}, { products: [] });
    assert.equal(actionResult.isSuccess, false);
    assert.deepEqual(actionResult.data.products, []);
});

test('RES-05 入力チェックエラー結果', () => {
    const actionResult = result.createValidationErrorResult([
        result.createFieldError('register-price', null, 'E-101', { label: '単価' })
    ]);
    assert.equal(actionResult.isSuccess, false);
    assert.equal(actionResult.messageID, null);
    assert.equal(actionResult.errors.length, 1);
    assert.equal(actionResult.errors[0].fieldID, 'register-price');
});

test('RES-06 FieldError の生成', () => {
    assert.deepEqual(
        result.createFieldError('sales-quantity', 3, 'E-105', { label: '数量', min: 1, max: 9999 }),
        {
            fieldID: 'sales-quantity',
            rowIndex: 3,
            messageID: 'E-105',
            messageParams: { label: '数量', min: 1, max: 9999 }
        }
    );
});
