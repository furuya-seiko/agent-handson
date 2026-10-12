// js/logic/product-logic.js のテスト。

const test = require('node:test');
const assert = require('node:assert/strict');
const productLogic = require('../js/logic/product-logic.js');
const salesLogic = require('../js/logic/sales-logic.js');
const seedData = require('../js/logic/seed-data.js');

const TEST_NOW = '2026-05-15 10:30:00';
const BASE_UPDATE_DATETIME = '2026-04-01 09:00:00';
const SELLING_PRODUCT_CODES = ['001', '002', '003', '004', '005', '006', '007', '009'];

function toProductCodes(products) {
    return products.map((product) => product.productCode);
}

function findByCode(products, productCode) {
    return products.find((product) => product.productCode === productCode);
}

// F-01 商品検索

test('PRD-01 条件なしで販売中の商品を全件取得（論理削除済みを除外）', () => {
    const actionResult = productLogic.searchProducts(seedData.createInitialProducts(), { productName: '' });
    assert.equal(actionResult.isSuccess, true);
    assert.equal(actionResult.messageID, null);
    assert.deepEqual(toProductCodes(actionResult.data.products), SELLING_PRODUCT_CODES);
});

test('PRD-02 商品コードの昇順', () => {
    const products = seedData.createInitialProducts().reverse();
    const actionResult = productLogic.searchProducts(products, { productName: '' });
    assert.deepEqual(toProductCodes(actionResult.data.products), SELLING_PRODUCT_CODES);
});

test('PRD-03 部分一致', () => {
    const actionResult = productLogic.searchProducts(
        seedData.createInitialProducts(), { productName: 'ノートPC' }
    );
    assert.deepEqual(toProductCodes(actionResult.data.products), ['002', '009']);
});

test('PRD-04 部分一致（末尾一致・複数件）', () => {
    const actionResult = productLogic.searchProducts(
        seedData.createInitialProducts(), { productName: 'PC' }
    );
    assert.deepEqual(toProductCodes(actionResult.data.products), ['001', '002', '009']);
});

test('PRD-04b 部分一致（先頭でも末尾でもない位置）', () => {
    const actionResult = productLogic.searchProducts(
        seedData.createInitialProducts(), { productName: 'ワイド' }
    );
    assert.deepEqual(toProductCodes(actionResult.data.products), ['007']);
});

test('PRD-05 大文字小文字を区別する', () => {
    const actionResult = productLogic.searchProducts(
        seedData.createInitialProducts(), { productName: 'pc' }
    );
    assert.equal(actionResult.data.products.length, 0);
    assert.equal(actionResult.messageID, 'I-005');
    assert.equal(actionResult.isSuccess, true);
});

test('PRD-06 全角半角を区別する', () => {
    const actionResult = productLogic.searchProducts(
        seedData.createInitialProducts(), { productName: 'ＰＣ' }
    );
    assert.equal(actionResult.data.products.length, 0);
    assert.equal(actionResult.messageID, 'I-005');
});

test('PRD-07 論理削除済みは一致しない', () => {
    const actionResult = productLogic.searchProducts(
        seedData.createInitialProducts(), { productName: 'マット' }
    );
    assert.equal(actionResult.data.products.length, 0);
    assert.equal(actionResult.messageID, 'I-005');
});

test('PRD-08 商品マスタが0件', () => {
    const actionResult = productLogic.searchProducts([], { productName: '' });
    assert.equal(actionResult.data.products.length, 0);
    assert.equal(actionResult.messageID, 'I-005');
});

test('PRD-09 引数の配列を変更しない', () => {
    const products = seedData.createInitialProducts();
    productLogic.searchProducts(products, { productName: 'PC' });
    assert.equal(products.length, 9);
    assert.deepEqual(toProductCodes(products), ['001', '002', '003', '004', '005', '006', '007', '008', '009']);
});

// F-02 商品登録

test('PRD-10 正常登録（採番・ゼロ埋め）', () => {
    const actionResult = productLogic.registerProduct(
        seedData.createInitialProducts(), { productName: '外付けSSD', price: '12800' }, TEST_NOW
    );
    assert.equal(actionResult.isSuccess, true);
    assert.equal(actionResult.messageID, 'I-001');
    assert.equal(actionResult.data.productCode, '010');
    assert.equal(actionResult.data.products.length, 10);
});

test('PRD-11 登録日時と更新日時が同じ値', () => {
    const actionResult = productLogic.registerProduct(
        seedData.createInitialProducts(), { productName: '外付けSSD', price: '12800' }, TEST_NOW
    );
    const registered = findByCode(actionResult.data.products, '010');
    assert.equal(registered.registerDatetime, TEST_NOW);
    assert.equal(registered.updateDatetime, TEST_NOW);
    assert.equal(registered.deleteDatetime, null);
    assert.equal(registered.price, 12800);
});

test('PRD-12 既存商品の日時が書き換わらない', () => {
    const actionResult = productLogic.registerProduct(
        seedData.createInitialProducts(), { productName: '外付けSSD', price: '12800' }, TEST_NOW
    );
    const existing = findByCode(actionResult.data.products, '001');
    assert.equal(existing.registerDatetime, BASE_UPDATE_DATETIME);
    assert.equal(existing.updateDatetime, BASE_UPDATE_DATETIME);
});

test('PRD-13 戻り値が商品コードの昇順に並んでいる', () => {
    const actionResult = productLogic.registerProduct(
        seedData.createInitialProducts(), { productName: '外付けSSD', price: '12800' }, TEST_NOW
    );
    assert.deepEqual(
        toProductCodes(actionResult.data.products),
        ['001', '002', '003', '004', '005', '006', '007', '008', '009', '010']
    );
});

test('PRD-14 商品名の空白が除去されて保存される', () => {
    const actionResult = productLogic.registerProduct(
        seedData.createInitialProducts(), { productName: ' 外付けSSD　', price: '12800' }, TEST_NOW
    );
    assert.equal(findByCode(actionResult.data.products, '010').productName, '外付けSSD');
});

test('PRD-15 商品0件からの採番', () => {
    const actionResult = productLogic.registerProduct([], { productName: '最初の商品', price: '100' }, TEST_NOW);
    assert.equal(actionResult.data.productCode, '001');
});

test('PRD-16 採番は論理削除済みを含む最大値 + 1', () => {
    const products = [
        findByCode(seedData.createInitialProducts(), '005'),
        Object.assign(findByCode(seedData.createInitialProducts(), '009'), {
            deleteDatetime: '2026-04-20 10:00:00'
        })
    ];
    const actionResult = productLogic.registerProduct(products, { productName: 'X', price: '1' }, TEST_NOW);
    assert.equal(actionResult.data.productCode, '010');
});

test('PRD-17 採番上限（境界の内側）', () => {
    const products = [Object.assign(findByCode(seedData.createInitialProducts(), '001'), {
        productCode: '998'
    })];
    const actionResult = productLogic.registerProduct(products, { productName: 'X', price: '1' }, TEST_NOW);
    assert.equal(actionResult.isSuccess, true);
    assert.equal(actionResult.data.productCode, '999');
});

test('PRD-18 採番上限の超過', () => {
    const products = [Object.assign(findByCode(seedData.createInitialProducts(), '001'), {
        productCode: '999'
    })];
    const actionResult = productLogic.registerProduct(products, { productName: 'X', price: '1' }, TEST_NOW);
    assert.equal(actionResult.isSuccess, false);
    assert.equal(actionResult.messageID, 'E-205');
    assert.equal(actionResult.messageParams.maxProductCode, '999');
    assert.equal(actionResult.data.products, undefined);
    assert.notEqual(actionResult.data.trimmedInput, undefined);
});

test('PRD-19 入力チェックエラー（商品名と単価の2件、並び順）', () => {
    const actionResult = productLogic.registerProduct(
        seedData.createInitialProducts(), { productName: '', price: '' }, TEST_NOW
    );
    assert.equal(actionResult.isSuccess, false);
    assert.equal(actionResult.messageID, null);
    assert.equal(actionResult.errors.length, 2);
    assert.equal(actionResult.errors[0].fieldID, 'register-product-name');
    assert.equal(actionResult.errors[0].messageID, 'E-101');
    assert.equal(actionResult.errors[1].fieldID, 'register-price');
    assert.equal(actionResult.errors[1].messageID, 'E-101');
});

test('PRD-20 入力チェックエラー時に保存対象を返さない', () => {
    const products = seedData.createInitialProducts();
    const actionResult = productLogic.registerProduct(products, { productName: '', price: '' }, TEST_NOW);
    assert.equal(actionResult.data.products, undefined);
    assert.equal(products.length, 9);
});

test('PRD-21 入力チェックエラー時に空白除去後の値を返す', () => {
    const actionResult = productLogic.registerProduct(
        seedData.createInitialProducts(), { productName: ' あ ', price: ' 1,000 ' }, TEST_NOW
    );
    assert.equal(actionResult.errors.length, 1);
    assert.equal(actionResult.errors[0].messageID, 'E-104');
    assert.equal(actionResult.data.trimmedInput.productName, 'あ');
    assert.equal(actionResult.data.trimmedInput.price, '1,000');
});

test('PRD-22 同名商品の登録を許容する', () => {
    const actionResult = productLogic.registerProduct(
        seedData.createInitialProducts(), { productName: 'ノートPC', price: '99000' }, TEST_NOW
    );
    assert.equal(actionResult.isSuccess, true);
    assert.equal(actionResult.data.productCode, '010');
    const sameName = actionResult.data.products.filter((product) => product.productName === 'ノートPC');
    assert.equal(sameName.length, 2);
});

// F-03 商品1件取得・F-07 売上有無判定

test('PRD-23 商品1件取得（正常）', () => {
    const actionResult = productLogic.findProductByCode(seedData.createInitialProducts(), '007');
    assert.equal(actionResult.isSuccess, true);
    assert.equal(actionResult.data.product.productName, '24"ワイド, 保護フィルム');
});

test('PRD-24 商品1件取得（存在しない）', () => {
    const actionResult = productLogic.findProductByCode(seedData.createInitialProducts(), '900');
    assert.equal(actionResult.isSuccess, false);
    assert.equal(actionResult.messageID, 'E-202');
    assert.equal(actionResult.data, null);
});

test('PRD-25 商品1件取得（論理削除済み）', () => {
    const actionResult = productLogic.findProductByCode(seedData.createInitialProducts(), '008');
    assert.equal(actionResult.isSuccess, false);
    assert.equal(actionResult.messageID, 'E-201');
});

test('PRD-26 売上有無判定（売上あり）', () => {
    assert.equal(salesLogic.hasSalesOfProduct(seedData.createInitialSales(), '001'), true);
});

test('PRD-27 売上有無判定（売上なし）', () => {
    assert.equal(salesLogic.hasSalesOfProduct(seedData.createInitialSales(), '007'), false);
});

test('PRD-28 売上有無判定（論理削除済みでも売上あり）', () => {
    assert.equal(salesLogic.hasSalesOfProduct(seedData.createInitialSales(), '008'), true);
});

// F-04 商品変更

test('PRD-29 変更（売上なしの商品で商品名と単価を変更）', () => {
    const actionResult = productLogic.updateProduct(
        seedData.createInitialProducts(),
        seedData.createInitialSales(),
        { productCode: '007', productName: '24型ワイド', price: '1500', baseUpdateDatetime: BASE_UPDATE_DATETIME },
        TEST_NOW
    );
    assert.equal(actionResult.isSuccess, true);
    assert.equal(actionResult.messageID, 'I-002');
    const updated = findByCode(actionResult.data.products, '007');
    assert.equal(updated.productName, '24型ワイド');
    assert.equal(updated.price, 1500);
    assert.equal(updated.updateDatetime, TEST_NOW);
    assert.equal(updated.registerDatetime, BASE_UPDATE_DATETIME);
    assert.equal(updated.deleteDatetime, null);
});

test('PRD-30 変更（売上ありの商品で商品名のみ変更。単価は維持される）', () => {
    const actionResult = productLogic.updateProduct(
        seedData.createInitialProducts(),
        seedData.createInitialSales(),
        {
            productCode: '001',
            productName: 'デスクトップPC（旧型）',
            price: '150000',
            baseUpdateDatetime: BASE_UPDATE_DATETIME
        },
        TEST_NOW
    );
    assert.equal(actionResult.isSuccess, true);
    const updated = findByCode(actionResult.data.products, '001');
    assert.equal(updated.productName, 'デスクトップPC（旧型）');
    assert.equal(updated.price, 150000);
    assert.equal(updated.updateDatetime, TEST_NOW);
    assert.equal(updated.registerDatetime, BASE_UPDATE_DATETIME);
});

test('PRD-31 変更（売上ありの商品で単価を変えようとする）', () => {
    const actionResult = productLogic.updateProduct(
        seedData.createInitialProducts(),
        seedData.createInitialSales(),
        {
            productCode: '001',
            productName: 'デスクトップPC',
            price: '160000',
            baseUpdateDatetime: BASE_UPDATE_DATETIME
        },
        TEST_NOW
    );
    assert.equal(actionResult.isSuccess, false);
    assert.equal(actionResult.messageID, 'E-204');
    assert.equal(actionResult.data, null);
});

test('PRD-32 変更（売上ありの商品で単価が空でも商品名を変更できる）', () => {
    const actionResult = productLogic.updateProduct(
        seedData.createInitialProducts(),
        seedData.createInitialSales(),
        { productCode: '001', productName: '新名称', price: '', baseUpdateDatetime: BASE_UPDATE_DATETIME },
        TEST_NOW
    );
    assert.equal(actionResult.isSuccess, true);
    assert.equal(actionResult.errors.length, 0);
});

test('PRD-33 変更（存在しない商品）', () => {
    const actionResult = productLogic.updateProduct(
        seedData.createInitialProducts(),
        seedData.createInitialSales(),
        { productCode: '900', productName: 'X', price: '1', baseUpdateDatetime: BASE_UPDATE_DATETIME },
        TEST_NOW
    );
    assert.equal(actionResult.isSuccess, false);
    assert.equal(actionResult.messageID, 'E-202');
});

test('PRD-34 変更（論理削除済みの商品）', () => {
    const actionResult = productLogic.updateProduct(
        seedData.createInitialProducts(),
        seedData.createInitialSales(),
        { productCode: '008', productName: 'X', price: '1', baseUpdateDatetime: '2026-04-20 10:00:00' },
        TEST_NOW
    );
    assert.equal(actionResult.isSuccess, false);
    assert.equal(actionResult.messageID, 'E-201');
});

test('PRD-35 変更（楽観的排他エラー）', () => {
    const actionResult = productLogic.updateProduct(
        seedData.createInitialProducts(),
        seedData.createInitialSales(),
        { productCode: '007', productName: 'X', price: '1500', baseUpdateDatetime: '2026-04-01 09:00:01' },
        TEST_NOW
    );
    assert.equal(actionResult.isSuccess, false);
    assert.equal(actionResult.messageID, 'E-203');
    assert.equal(actionResult.data, null);
});

test('PRD-36 変更（排他エラーの判定が入力チェックより先）', () => {
    const actionResult = productLogic.updateProduct(
        seedData.createInitialProducts(),
        seedData.createInitialSales(),
        { productCode: '007', productName: '', price: '', baseUpdateDatetime: '2026-04-01 09:00:01' },
        TEST_NOW
    );
    assert.deepEqual(actionResult.errors, []);
    assert.equal(actionResult.messageID, 'E-203');
});

test('PRD-37 変更（入力チェックエラーと空白除去後の値）', () => {
    const actionResult = productLogic.updateProduct(
        seedData.createInitialProducts(),
        seedData.createInitialSales(),
        { productCode: '007', productName: '　', price: ' abc ', baseUpdateDatetime: BASE_UPDATE_DATETIME },
        TEST_NOW
    );
    assert.equal(actionResult.errors.length, 2);
    assert.equal(actionResult.errors[0].fieldID, 'edit-product-name');
    assert.equal(actionResult.errors[0].messageID, 'E-101');
    assert.equal(actionResult.errors[1].fieldID, 'edit-price');
    assert.equal(actionResult.errors[1].messageID, 'E-104');
    assert.deepEqual(actionResult.data.trimmedInput, { productName: '', price: 'abc' });
});

test('PRD-38 変更（売上ありの商品では trimmedInput.price が保存済みの単価になる）', () => {
    const actionResult = productLogic.updateProduct(
        seedData.createInitialProducts(),
        seedData.createInitialSales(),
        { productCode: '001', productName: '', price: '', baseUpdateDatetime: BASE_UPDATE_DATETIME },
        TEST_NOW
    );
    assert.equal(actionResult.errors.length, 1);
    assert.equal(actionResult.errors[0].messageID, 'E-101');
    assert.equal(actionResult.data.trimmedInput.price, '150000');
});

test('PRD-39 変更（戻り値が商品コードの昇順）', () => {
    const actionResult = productLogic.updateProduct(
        seedData.createInitialProducts(),
        seedData.createInitialSales(),
        { productCode: '007', productName: '24型ワイド', price: '1500', baseUpdateDatetime: BASE_UPDATE_DATETIME },
        TEST_NOW
    );
    assert.deepEqual(
        toProductCodes(actionResult.data.products),
        ['001', '002', '003', '004', '005', '006', '007', '008', '009']
    );
    assert.equal(actionResult.data.products.length, 9);
});

// F-05 商品削除

test('PRD-40 削除（正常）', () => {
    const actionResult = productLogic.deleteProduct(
        seedData.createInitialProducts(),
        seedData.createInitialSales(),
        { productCode: '007', baseUpdateDatetime: BASE_UPDATE_DATETIME },
        TEST_NOW
    );
    assert.equal(actionResult.isSuccess, true);
    assert.equal(actionResult.messageID, 'I-003');
    assert.equal(actionResult.data.products.length, 9);
    const deleted = findByCode(actionResult.data.products, '007');
    assert.equal(deleted.deleteDatetime, TEST_NOW);
    assert.equal(deleted.updateDatetime, TEST_NOW);
    assert.equal(deleted.registerDatetime, BASE_UPDATE_DATETIME);
    assert.equal(deleted.productName, '24"ワイド, 保護フィルム');
    assert.equal(deleted.price, 1200);
});

test('PRD-41 削除（売上がある商品は削除できない）', () => {
    const actionResult = productLogic.deleteProduct(
        seedData.createInitialProducts(),
        seedData.createInitialSales(),
        { productCode: '001', baseUpdateDatetime: BASE_UPDATE_DATETIME },
        TEST_NOW
    );
    assert.equal(actionResult.isSuccess, false);
    assert.equal(actionResult.messageID, 'E-204');
    assert.equal(actionResult.data, null);
});

test('PRD-42 削除（存在しない商品）', () => {
    const actionResult = productLogic.deleteProduct(
        seedData.createInitialProducts(),
        seedData.createInitialSales(),
        { productCode: '900', baseUpdateDatetime: BASE_UPDATE_DATETIME },
        TEST_NOW
    );
    assert.equal(actionResult.isSuccess, false);
    assert.equal(actionResult.messageID, 'E-202');
});

test('PRD-43 削除（既に論理削除済み）', () => {
    const actionResult = productLogic.deleteProduct(
        seedData.createInitialProducts(),
        seedData.createInitialSales(),
        { productCode: '008', baseUpdateDatetime: '2026-04-20 10:00:00' },
        TEST_NOW
    );
    assert.equal(actionResult.isSuccess, false);
    assert.equal(actionResult.messageID, 'E-201');
});

test('PRD-44 削除（楽観的排他エラー）', () => {
    const actionResult = productLogic.deleteProduct(
        seedData.createInitialProducts(),
        seedData.createInitialSales(),
        { productCode: '007', baseUpdateDatetime: '2026-04-01 09:00:01' },
        TEST_NOW
    );
    assert.equal(actionResult.isSuccess, false);
    assert.equal(actionResult.messageID, 'E-203');
});

test('PRD-45 削除（売上0件なら売上のある商品も削除できる）', () => {
    const actionResult = productLogic.deleteProduct(
        seedData.createInitialProducts(),
        [],
        { productCode: '001', baseUpdateDatetime: BASE_UPDATE_DATETIME },
        TEST_NOW
    );
    assert.equal(actionResult.isSuccess, true);
});

test('PRD-46 変更・削除が引数の配列を変更しない', () => {
    const products = seedData.createInitialProducts();
    const sales = seedData.createInitialSales();
    productLogic.updateProduct(
        products, sales,
        { productCode: '007', productName: '24型ワイド', price: '1500', baseUpdateDatetime: BASE_UPDATE_DATETIME },
        TEST_NOW
    );
    productLogic.deleteProduct(
        products, sales,
        { productCode: '007', baseUpdateDatetime: BASE_UPDATE_DATETIME },
        TEST_NOW
    );
    const target = findByCode(products, '007');
    assert.equal(target.productName, '24"ワイド, 保護フィルム');
    assert.equal(target.price, 1200);
    assert.equal(target.updateDatetime, BASE_UPDATE_DATETIME);
    assert.equal(target.deleteDatetime, null);
});

// F-06 販売中商品の一覧取得

test('PRD-47 販売中商品の一覧取得', () => {
    const sellingProducts = productLogic.listSellingProducts(seedData.createInitialProducts());
    assert.deepEqual(toProductCodes(sellingProducts), SELLING_PRODUCT_CODES);
});

test('PRD-48 販売中商品の一覧取得（0件）', () => {
    assert.deepEqual(productLogic.listSellingProducts([]), []);
});
