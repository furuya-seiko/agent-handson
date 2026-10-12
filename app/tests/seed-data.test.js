// js/logic/seed-data.js のテスト。

const test = require('node:test');
const assert = require('node:assert/strict');
const seedData = require('../js/logic/seed-data.js');
const clock = require('../js/app/clock.js');

const EXPECTED_PRODUCTS = [
    ['001', 'デスクトップPC', 150000, '2026-04-01 09:00:00', '2026-04-01 09:00:00', null],
    ['002', 'ノートPC', 120000, '2026-04-01 09:00:00', '2026-04-01 09:00:00', null],
    ['003', 'タブレット', 45000, '2026-04-01 09:00:00', '2026-04-01 09:00:00', null],
    ['004', 'スマートフォン', 98000, '2026-04-01 09:00:00', '2026-04-01 09:00:00', null],
    ['005', '液晶モニター', 23800, '2026-04-01 09:00:00', '2026-04-01 09:00:00', null],
    ['006', 'ワイヤレスマウス', 2980, '2026-04-01 09:00:00', '2026-04-01 09:00:00', null],
    ['007', '24"ワイド, 保護フィルム', 1200, '2026-04-01 09:00:00', '2026-04-01 09:00:00', null],
    ['008', '<script>alert(1)</script>マット', 800, '2026-04-01 09:00:00', '2026-04-20 10:00:00', '2026-04-20 10:00:00'],
    ['009', 'ノートPC Pro', 135000, '2026-04-01 09:00:00', '2026-04-01 09:00:00', null]
];

const EXPECTED_SALES = [
    ['2026-04-10', '001', 2, '2026-04-10 20:00:00'],
    ['2026-04-10', '002', 1, '2026-04-10 20:00:00'],
    ['2026-04-10', '003', 3, '2026-04-10 20:00:00'],
    ['2026-04-11', '001', 1, '2026-04-11 20:00:00'],
    ['2026-04-11', '005', 4, '2026-04-11 20:00:00'],
    ['2026-04-11', '008', 2, '2026-04-11 20:00:00'],
    ['2026-05-08', '002', 2, '2026-05-08 20:00:00'],
    ['2026-05-08', '004', 1, '2026-05-08 20:00:00'],
    ['2026-05-09', '003', 1, '2026-05-09 20:00:00'],
    ['2026-05-09', '006', 10, '2026-05-09 20:00:00'],
    ['2026-05-09', '009', 1, '2026-05-09 20:00:00']
];

test('SEED-01 商品の件数と商品コード', () => {
    const products = seedData.createInitialProducts();
    assert.equal(products.length, 9);
    assert.deepEqual(
        products.map((product) => product.productCode),
        ['001', '002', '003', '004', '005', '006', '007', '008', '009']
    );
});

test('SEED-02 商品の初期データの内容が正しい', () => {
    const products = seedData.createInitialProducts();
    assert.deepEqual(
        products.map((product) => [
            product.productCode,
            product.productName,
            product.price,
            product.registerDatetime,
            product.updateDatetime,
            product.deleteDatetime
        ]),
        EXPECTED_PRODUCTS
    );
});

test('SEED-03 論理削除済みは 008 のみ', () => {
    const deleted = seedData.createInitialProducts().filter((product) => product.deleteDatetime !== null);
    assert.equal(deleted.length, 1);
    assert.equal(deleted[0].productCode, '008');
    assert.equal(deleted[0].deleteDatetime, '2026-04-20 10:00:00');
});

test('SEED-04 売上の件数と内容が 8-2 と一致する', () => {
    const sales = seedData.createInitialSales();
    assert.equal(sales.length, 11);
    assert.deepEqual(
        sales.map((row) => [row.salesDate, row.productCode, row.quantity, row.registerDatetime]),
        EXPECTED_SALES
    );
    sales.forEach((row) => {
        assert.equal(row.updateDatetime, row.registerDatetime);
    });
});

test('SEED-05 007 の売上が存在しない', () => {
    const sales = seedData.createInitialSales().filter((row) => row.productCode === '007');
    assert.equal(sales.length, 0);
});

test('SEED-06 参照整合性', () => {
    const productCodes = seedData.createInitialProducts().map((product) => product.productCode);
    seedData.createInitialSales().forEach((row) => {
        assert.equal(productCodes.includes(row.productCode), true, row.productCode + ' が商品マスタに無い');
    });
});

test('SEED-07 削除日時より後の売上が無い', () => {
    const deletedProduct = seedData.createInitialProducts().find((product) => product.productCode === '008');
    const deletedDate = deletedProduct.deleteDatetime.slice(0, 10);
    seedData.createInitialSales()
        .filter((row) => row.productCode === '008')
        .forEach((row) => {
            assert.equal(row.salesDate <= deletedDate, true);
        });
});

test('SEED-08 当日（2026-05-15）の売上を含まない', () => {
    const sales = seedData.createInitialSales().filter((row) => row.salesDate === '2026-05-15');
    assert.equal(sales.length, 0);
});

test('SEED-09 呼び出しごとに新しいオブジェクトを返す', () => {
    const first = seedData.createInitialProducts();
    const second = seedData.createInitialProducts();
    first[0].productName = 'X';
    assert.equal(second[0].productName, 'デスクトップPC');
});

test('SEED-10 現在日時に依存しない', () => {
    clock.setFixedDatetime('2030-01-01 00:00:00');
    try {
        seedData.createInitialProducts().forEach((product) => {
            assert.equal(product.registerDatetime, '2026-04-01 09:00:00');
        });
    } finally {
        clock.clearFixedDatetime();
    }
});
