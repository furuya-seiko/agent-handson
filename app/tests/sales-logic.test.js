// js/logic/sales-logic.js のテスト。

const test = require('node:test');
const assert = require('node:assert/strict');
const salesLogic = require('../js/logic/sales-logic.js');
const storeSchema = require('../js/logic/store-schema.js');
const seedData = require('../js/logic/seed-data.js');

const TEST_NOW = '2026-05-15 10:30:00';
const TEST_DATE = '2026-05-15';
const MILLISECONDS_PER_DAY = 86400000;

function createProducts() {
    return seedData.createInitialProducts();
}

// 当日の売上を1件加えた前提データ
function createSalesWithToday() {
    const sales = seedData.createInitialSales();
    sales.push({
        salesDate: TEST_DATE,
        productCode: '001',
        quantity: 2,
        registerDatetime: '2026-05-15 08:00:00',
        updateDatetime: '2026-05-15 08:00:00'
    });
    return storeSchema.sortSales(sales);
}

// 件数上限テスト用の売上を生成する。売上日は対象日の翌日から1日ずつ増やす。
function createSalesForCountLimit(count) {
    const baseTime = Date.UTC(2026, 4, 16);
    const sales = [];
    for (let index = 0; index < count; index += 1) {
        const salesDate = new Date(baseTime + index * MILLISECONDS_PER_DAY).toISOString().slice(0, 10);
        sales.push({
            salesDate,
            productCode: '001',
            quantity: 1,
            registerDatetime: salesDate + ' 00:00:00',
            updateDatetime: salesDate + ' 00:00:00'
        });
    }
    return sales;
}

function findSalesOn(sales, salesDate) {
    return sales.filter((row) => row.salesDate === salesDate);
}

test('SLS-01 指定日の売上明細（0件）', () => {
    const actionResult = salesLogic.findSalesDetailRowsByDate(
        seedData.createInitialSales(), createProducts(), TEST_DATE
    );
    assert.equal(actionResult.isSuccess, true);
    assert.equal(actionResult.messageID, 'I-006');
    assert.deepEqual(actionResult.data.rows, []);
});

test('SLS-02 指定日の売上明細（1件以上）', () => {
    const actionResult = salesLogic.findSalesDetailRowsByDate(
        createSalesWithToday(), createProducts(), TEST_DATE
    );
    assert.equal(actionResult.messageID, null);
    assert.deepEqual(actionResult.data.rows, [{ rowIndex: 0, productCode: '001', quantity: '2' }]);
});

test('SLS-03 指定日の売上明細（商品コードの昇順、行番号の連番）', () => {
    const sales = seedData.createInitialSales();
    sales.push({
        salesDate: TEST_DATE,
        productCode: '003',
        quantity: 3,
        registerDatetime: '2026-05-15 08:00:00',
        updateDatetime: '2026-05-15 08:00:00'
    });
    sales.push({
        salesDate: TEST_DATE,
        productCode: '001',
        quantity: 2,
        registerDatetime: '2026-05-15 08:00:00',
        updateDatetime: '2026-05-15 08:00:00'
    });
    const actionResult = salesLogic.findSalesDetailRowsByDate(sales, createProducts(), TEST_DATE);
    assert.deepEqual(actionResult.data.rows, [
        { rowIndex: 0, productCode: '001', quantity: '2' },
        { rowIndex: 1, productCode: '003', quantity: '3' }
    ]);
});

test('SLS-04 指定日の売上明細（別の日を指定）', () => {
    const actionResult = salesLogic.findSalesDetailRowsByDate(
        seedData.createInitialSales(), createProducts(), '2026-04-10'
    );
    assert.deepEqual(actionResult.data.rows.map((row) => row.productCode), ['001', '002', '003']);
    assert.deepEqual(actionResult.data.rows.map((row) => row.quantity), ['2', '1', '3']);
});

test('SLS-05 指定日の売上明細（論理削除済み商品の売上は表示しない）', () => {
    const actionResult = salesLogic.findSalesDetailRowsByDate(
        seedData.createInitialSales(), createProducts(), '2026-04-11'
    );
    assert.deepEqual(actionResult.data.rows.map((row) => row.productCode), ['001', '005']);
});

test('SLS-06 指定日の売上明細（商品マスタに存在しない商品の売上は表示しない）', () => {
    const sales = seedData.createInitialSales();
    sales.push({
        salesDate: TEST_DATE,
        productCode: '900',
        quantity: 1,
        registerDatetime: '2026-05-15 08:00:00',
        updateDatetime: '2026-05-15 08:00:00'
    });
    const actionResult = salesLogic.findSalesDetailRowsByDate(sales, createProducts(), TEST_DATE);
    assert.deepEqual(actionResult.data.rows, []);
    assert.equal(actionResult.messageID, 'I-006');
});

test('SLS-07 一括登録（新規1行）', () => {
    const actionResult = salesLogic.registerDailySales(
        seedData.createInitialSales(), createProducts(),
        [{ rowIndex: 0, productCode: '003', quantity: '4' }], TEST_NOW
    );
    assert.equal(actionResult.isSuccess, true);
    assert.equal(actionResult.messageID, 'I-004');
    assert.equal(actionResult.data.sales.length, 12);
    const todaySales = findSalesOn(actionResult.data.sales, TEST_DATE);
    assert.equal(todaySales.length, 1);
    assert.equal(todaySales[0].productCode, '003');
    assert.equal(todaySales[0].quantity, 4);
    assert.equal(todaySales[0].registerDatetime, TEST_NOW);
    assert.equal(todaySales[0].updateDatetime, TEST_NOW);
});

test('SLS-08 一括登録（既存行の数量変更で登録日時が維持される）', () => {
    const actionResult = salesLogic.registerDailySales(
        createSalesWithToday(), createProducts(),
        [{ rowIndex: 0, productCode: '001', quantity: '5' }], TEST_NOW
    );
    const target = findSalesOn(actionResult.data.sales, TEST_DATE)[0];
    assert.equal(target.quantity, 5);
    assert.equal(target.registerDatetime, '2026-05-15 08:00:00');
    assert.equal(target.updateDatetime, TEST_NOW);
    assert.notEqual(target.registerDatetime, target.updateDatetime);
});

test('SLS-09 一括登録（数量が加算ではなく置き換えになる）', () => {
    const actionResult = salesLogic.registerDailySales(
        createSalesWithToday(), createProducts(),
        [{ rowIndex: 0, productCode: '001', quantity: '5' }], TEST_NOW
    );
    assert.equal(findSalesOn(actionResult.data.sales, TEST_DATE)[0].quantity, 5);
});

test('SLS-10 一括登録（画面から消した行の売上が消える）', () => {
    const actionResult = salesLogic.registerDailySales(
        createSalesWithToday(), createProducts(),
        [{ rowIndex: 0, productCode: '003', quantity: '1' }], TEST_NOW
    );
    const todaySales = findSalesOn(actionResult.data.sales, TEST_DATE);
    assert.equal(todaySales.length, 1);
    assert.equal(todaySales[0].productCode, '003');
});

test('SLS-11 一括登録（明細0件で当日分がすべて消える）', () => {
    const actionResult = salesLogic.registerDailySales(
        createSalesWithToday(), createProducts(), [], TEST_NOW
    );
    assert.equal(actionResult.isSuccess, true);
    assert.equal(actionResult.messageID, 'I-004');
    assert.equal(actionResult.data.sales.length, 11);
    assert.equal(findSalesOn(actionResult.data.sales, TEST_DATE).length, 0);
});

test('SLS-12 一括登録（対象日以外の売上は変化しない）', () => {
    const actionResult = salesLogic.registerDailySales(
        createSalesWithToday(), createProducts(), [], TEST_NOW
    );
    assert.deepEqual(actionResult.data.sales, seedData.createInitialSales());
});

test('SLS-13 一括登録（戻り値が売上日・商品コードの昇順）', () => {
    const actionResult = salesLogic.registerDailySales(
        seedData.createInitialSales(), createProducts(),
        [
            { rowIndex: 0, productCode: '003', quantity: '1' },
            { rowIndex: 1, productCode: '001', quantity: '2' }
        ],
        TEST_NOW
    );
    const lastTwo = actionResult.data.sales.slice(-2);
    assert.deepEqual(
        lastTwo.map((row) => [row.salesDate, row.productCode]),
        [[TEST_DATE, '001'], [TEST_DATE, '003']]
    );
});

test('SLS-14 一括登録（未選択）', () => {
    const actionResult = salesLogic.registerDailySales(
        seedData.createInitialSales(), createProducts(),
        [{ rowIndex: 0, productCode: '', quantity: '1' }], TEST_NOW
    );
    assert.equal(actionResult.errors.length, 1);
    assert.equal(actionResult.errors[0].fieldID, 'sales-product-code');
    assert.equal(actionResult.errors[0].rowIndex, 0);
    assert.equal(actionResult.errors[0].messageID, 'E-102');
    assert.equal(actionResult.data.sales, undefined);
});

test('SLS-15 一括登録（数量エラー）', () => {
    const actionResult = salesLogic.registerDailySales(
        seedData.createInitialSales(), createProducts(),
        [{ rowIndex: 0, productCode: '001', quantity: '0' }], TEST_NOW
    );
    assert.equal(actionResult.errors[0].fieldID, 'sales-quantity');
    assert.equal(actionResult.errors[0].rowIndex, 0);
    assert.equal(actionResult.errors[0].messageID, 'E-105');
});

test('SLS-16 一括登録（エラーの並び順：行番号昇順・行内は商品名→数量）', () => {
    const actionResult = salesLogic.registerDailySales(
        seedData.createInitialSales(), createProducts(),
        [
            { rowIndex: 0, productCode: '', quantity: '' },
            { rowIndex: 1, productCode: '001', quantity: '0' }
        ],
        TEST_NOW
    );
    assert.equal(actionResult.errors.length, 3);
    assert.deepEqual(
        actionResult.errors.map((error) => [error.fieldID, error.rowIndex, error.messageID]),
        [
            ['sales-product-code', 0, 'E-102'],
            ['sales-quantity', 0, 'E-101'],
            ['sales-quantity', 1, 'E-105']
        ]
    );
});

test('SLS-17 一括登録（同一商品の重複）', () => {
    const actionResult = salesLogic.registerDailySales(
        seedData.createInitialSales(), createProducts(),
        [
            { rowIndex: 0, productCode: '001', quantity: '2' },
            { rowIndex: 1, productCode: '001', quantity: '3' }
        ],
        TEST_NOW
    );
    assert.equal(actionResult.errors.length, 1);
    assert.equal(actionResult.errors[0].fieldID, 'sales-product-code');
    assert.equal(actionResult.errors[0].rowIndex, 1);
    assert.equal(actionResult.errors[0].messageID, 'E-107');
});

test('SLS-18 一括登録（同名別商品は重複としない）', () => {
    const actionResult = salesLogic.registerDailySales(
        seedData.createInitialSales(), createProducts(),
        [
            { rowIndex: 0, productCode: '002', quantity: '1' },
            { rowIndex: 1, productCode: '009', quantity: '1' }
        ],
        TEST_NOW
    );
    assert.equal(actionResult.isSuccess, true);
    assert.equal(findSalesOn(actionResult.data.sales, TEST_DATE).length, 2);
});

test('SLS-19 一括登録（未選択の行が重複判定されない）', () => {
    const actionResult = salesLogic.registerDailySales(
        seedData.createInitialSales(), createProducts(),
        [
            { rowIndex: 0, productCode: '', quantity: '1' },
            { rowIndex: 1, productCode: '', quantity: '1' }
        ],
        TEST_NOW
    );
    assert.equal(actionResult.errors.length, 2);
    actionResult.errors.forEach((error) => {
        assert.equal(error.messageID, 'E-102');
    });
});

test('SLS-20 一括登録（1項目にエラーは1件のみ）', () => {
    const actionResult = salesLogic.registerDailySales(
        seedData.createInitialSales(), createProducts(),
        [
            { rowIndex: 0, productCode: '008', quantity: '1' },
            { rowIndex: 1, productCode: '008', quantity: '1' }
        ],
        TEST_NOW
    );
    assert.equal(actionResult.errors.length, 2);
    assert.deepEqual(
        actionResult.errors.map((error) => [error.fieldID, error.rowIndex, error.messageID]),
        [
            ['sales-product-code', 0, 'E-207'],
            ['sales-product-code', 1, 'E-207']
        ]
    );
});

test('SLS-21 一括登録（論理削除済みの商品）', () => {
    const actionResult = salesLogic.registerDailySales(
        seedData.createInitialSales(), createProducts(),
        [{ rowIndex: 0, productCode: '008', quantity: '1' }], TEST_NOW
    );
    assert.equal(actionResult.errors[0].fieldID, 'sales-product-code');
    assert.equal(actionResult.errors[0].rowIndex, 0);
    assert.equal(actionResult.errors[0].messageID, 'E-207');
});

test('SLS-22 一括登録（商品マスタに存在しない商品）', () => {
    const actionResult = salesLogic.registerDailySales(
        seedData.createInitialSales(), createProducts(),
        [{ rowIndex: 0, productCode: '900', quantity: '1' }], TEST_NOW
    );
    assert.equal(actionResult.errors[0].messageID, 'E-207');
});

test('SLS-23 一括登録（1件でもエラーがあれば1件も登録しない）', () => {
    const sales = seedData.createInitialSales();
    const actionResult = salesLogic.registerDailySales(
        sales, createProducts(),
        [
            { rowIndex: 0, productCode: '', quantity: '' },
            { rowIndex: 1, productCode: '001', quantity: '0' }
        ],
        TEST_NOW
    );
    assert.equal(actionResult.data.sales, undefined);
    assert.equal(sales.length, 11);
    assert.equal(findSalesOn(sales, TEST_DATE).length, 0);
});

test('SLS-24 一括登録（空白除去後の値を返す）', () => {
    const actionResult = salesLogic.registerDailySales(
        seedData.createInitialSales(), createProducts(),
        [{ rowIndex: 0, productCode: ' 001 ', quantity: '　1,0　' }], TEST_NOW
    );
    assert.equal(actionResult.errors.length, 1);
    assert.equal(actionResult.errors[0].messageID, 'E-104');
    assert.deepEqual(actionResult.data.trimmedRows, [{ rowIndex: 0, productCode: '001', quantity: '1,0' }]);
});

test('SLS-25 一括登録（件数上限の内側）', () => {
    const sales = createSalesForCountLimit(99999);
    const actionResult = salesLogic.registerDailySales(
        sales, createProducts(),
        [{ rowIndex: 0, productCode: '001', quantity: '1' }], TEST_NOW
    );
    assert.equal(actionResult.isSuccess, true);
    assert.equal(actionResult.data.sales.length, 100000);
});

test('SLS-26 一括登録（件数上限の超過）', () => {
    const sales = createSalesForCountLimit(100000);
    const actionResult = salesLogic.registerDailySales(
        sales, createProducts(),
        [{ rowIndex: 0, productCode: '001', quantity: '1' }], TEST_NOW
    );
    assert.equal(actionResult.isSuccess, false);
    assert.equal(actionResult.messageID, 'E-208');
    assert.equal(actionResult.messageParams.maxCount, 100000);
    assert.equal(actionResult.data.sales, undefined);
});

test('SLS-27 一括登録（対象日の既存売上は上限の計算に含めない）', () => {
    const actionResult = salesLogic.registerDailySales(
        createSalesWithToday(), createProducts(),
        [{ rowIndex: 0, productCode: '001', quantity: '1' }], TEST_NOW
    );
    assert.equal(actionResult.isSuccess, true);
    assert.equal(actionResult.data.sales.length, 12);
});

test('SLS-28 一括登録（引数の配列を変更しない）', () => {
    const sales = seedData.createInitialSales();
    salesLogic.registerDailySales(
        sales, createProducts(),
        [{ rowIndex: 0, productCode: '003', quantity: '4' }], TEST_NOW
    );
    assert.equal(sales.length, 11);
});
