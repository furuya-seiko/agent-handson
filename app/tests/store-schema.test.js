// js/logic/store-schema.js のテスト。

const test = require('node:test');
const assert = require('node:assert/strict');
const storeSchema = require('../js/logic/store-schema.js');
const seedData = require('../js/logic/seed-data.js');

test('SCH-01 商品0件は正常', () => {
    assert.equal(storeSchema.isValidProducts([]), true);
});

test('SCH-02 売上0件は正常', () => {
    assert.equal(storeSchema.isValidSales([]), true);
});

test('SCH-03 初期データは正常', () => {
    assert.equal(storeSchema.isValidProducts(seedData.createInitialProducts()), true);
    assert.equal(storeSchema.isValidSales(seedData.createInitialSales()), true);
});

test('SCH-04 配列でない', () => {
    assert.equal(storeSchema.isValidProducts({}), false);
});

test('SCH-05 要素が null', () => {
    assert.equal(storeSchema.isValidProducts([null]), false);
});

test('SCH-06 商品コードの形式不正', () => {
    const products = seedData.createInitialProducts();
    products[0].productCode = '1';
    assert.equal(storeSchema.isValidProducts(products), false);
});

test('SCH-07 単価が文字列', () => {
    const products = seedData.createInitialProducts();
    products[0].price = '150000';
    assert.equal(storeSchema.isValidProducts(products), false);
});

test('SCH-08 日時の形式不正', () => {
    const products = seedData.createInitialProducts();
    products[0].registerDatetime = '2026/04/01 09:00:00';
    assert.equal(storeSchema.isValidProducts(products), false);
});

test('SCH-09 削除日時が null でも日時でもない', () => {
    const products = seedData.createInitialProducts();
    products[0].deleteDatetime = '';
    assert.equal(storeSchema.isValidProducts(products), false);
});

test('SCH-10 商品コードの重複', () => {
    const products = seedData.createInitialProducts();
    products[1].productCode = '001';
    assert.equal(storeSchema.isValidProducts(products), false);
});

test('SCH-11 商品名が文字列でない', () => {
    const products = seedData.createInitialProducts();
    products[0].productName = 123;
    assert.equal(storeSchema.isValidProducts(products), false);
});

test('SCH-11b 単価が範囲外', () => {
    const zeroPrice = seedData.createInitialProducts();
    zeroPrice[0].price = 0;
    assert.equal(storeSchema.isValidProducts(zeroPrice), false);

    const overPrice = seedData.createInitialProducts();
    overPrice[0].price = 1000000;
    assert.equal(storeSchema.isValidProducts(overPrice), false);
});

test('SCH-12 売上日の形式不正', () => {
    const sales = seedData.createInitialSales();
    sales[0].salesDate = '2026/04/10';
    assert.equal(storeSchema.isValidSales(sales), false);
});

test('SCH-13 売上の商品コードの形式不正', () => {
    const sales = seedData.createInitialSales();
    sales[0].productCode = '1';
    assert.equal(storeSchema.isValidSales(sales), false);
});

test('SCH-14 売上の数量が整数でない', () => {
    const sales = seedData.createInitialSales();
    sales[0].quantity = '2';
    assert.equal(storeSchema.isValidSales(sales), false);
});

test('SCH-15 売上の日時の形式不正', () => {
    const sales = seedData.createInitialSales();
    sales[0].registerDatetime = '2026/04/10 20:00:00';
    assert.equal(storeSchema.isValidSales(sales), false);
});

test('SCH-15b 売上の数量が範囲外', () => {
    const zeroQuantity = seedData.createInitialSales();
    zeroQuantity[0].quantity = 0;
    assert.equal(storeSchema.isValidSales(zeroQuantity), false);

    const overQuantity = seedData.createInitialSales();
    overQuantity[0].quantity = 10000;
    assert.equal(storeSchema.isValidSales(overQuantity), false);
});

test('SCH-16 売上の一意キー重複', () => {
    const sales = seedData.createInitialSales();
    sales[1].salesDate = '2026-04-10';
    sales[1].productCode = '001';
    assert.equal(storeSchema.isValidSales(sales), false);
});

test('SCH-17 参照整合性違反は破損としない', () => {
    const sales = seedData.createInitialSales();
    sales.push({
        salesDate: '2026-04-10',
        productCode: '900',
        quantity: 1,
        registerDatetime: '2026-04-10 20:00:00',
        updateDatetime: '2026-04-10 20:00:00'
    });
    assert.equal(storeSchema.isValidSales(sales), true);
});

test('SCH-18 商品の並べ替え', () => {
    const products = seedData.createInitialProducts().reverse();
    const sorted = storeSchema.sortProducts(products);
    assert.deepEqual(
        sorted.map((product) => product.productCode),
        ['001', '002', '003', '004', '005', '006', '007', '008', '009']
    );
    assert.equal(products[0].productCode, '009', '引数の配列が変化している');
});

test('SCH-19 売上の並べ替え（第1キー売上日、第2キー商品コード）', () => {
    const sales = [
        {
            salesDate: '2026-05-09',
            productCode: '006',
            quantity: 10,
            registerDatetime: '2026-05-09 20:00:00',
            updateDatetime: '2026-05-09 20:00:00'
        },
        {
            salesDate: '2026-04-10',
            productCode: '003',
            quantity: 3,
            registerDatetime: '2026-04-10 20:00:00',
            updateDatetime: '2026-04-10 20:00:00'
        },
        {
            salesDate: '2026-04-10',
            productCode: '001',
            quantity: 2,
            registerDatetime: '2026-04-10 20:00:00',
            updateDatetime: '2026-04-10 20:00:00'
        }
    ];
    const sorted = storeSchema.sortSales(sales);
    assert.deepEqual(
        sorted.map((row) => [row.salesDate, row.productCode]),
        [['2026-04-10', '001'], ['2026-04-10', '003'], ['2026-05-09', '006']]
    );
});
