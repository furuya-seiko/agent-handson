// js/logic/summary-logic.js のテスト。

const test = require('node:test');
const assert = require('node:assert/strict');
const summaryLogic = require('../js/logic/summary-logic.js');
const seedData = require('../js/logic/seed-data.js');

const BOM = String.fromCodePoint(0xFEFF);
const CRLF = String.fromCodePoint(0x000D, 0x000A);
const CSV_HEADER_LINE = '"商品コード","商品名","単価","数量","金額"';

// 集計結果（全期間、9行）
const SUMMARY_ALL = [
    { productCode: '001', productName: 'デスクトップPC', price: 150000, quantity: 3, amount: 450000 },
    { productCode: '002', productName: 'ノートPC', price: 120000, quantity: 3, amount: 360000 },
    { productCode: '003', productName: 'タブレット', price: 45000, quantity: 4, amount: 180000 },
    { productCode: '004', productName: 'スマートフォン', price: 98000, quantity: 1, amount: 98000 },
    { productCode: '005', productName: '液晶モニター', price: 23800, quantity: 4, amount: 95200 },
    { productCode: '006', productName: 'ワイヤレスマウス', price: 2980, quantity: 10, amount: 29800 },
    { productCode: '007', productName: '24"ワイド, 保護フィルム', price: 1200, quantity: 0, amount: 0 },
    { productCode: '008', productName: '<script>alert(1)</script>マット', price: 800, quantity: 2, amount: 1600 },
    { productCode: '009', productName: 'ノートPC Pro', price: 135000, quantity: 1, amount: 135000 }
];

// 集計結果（2026/04、5行）
const SUMMARY_202604 = [
    { productCode: '001', productName: 'デスクトップPC', price: 150000, quantity: 3, amount: 450000 },
    { productCode: '002', productName: 'ノートPC', price: 120000, quantity: 1, amount: 120000 },
    { productCode: '003', productName: 'タブレット', price: 45000, quantity: 3, amount: 135000 },
    { productCode: '005', productName: '液晶モニター', price: 23800, quantity: 4, amount: 95200 },
    { productCode: '008', productName: '<script>alert(1)</script>マット', price: 800, quantity: 2, amount: 1600 }
];

// 集計結果（2026/05、5行）
const SUMMARY_202605 = [
    { productCode: '002', productName: 'ノートPC', price: 120000, quantity: 2, amount: 240000 },
    { productCode: '003', productName: 'タブレット', price: 45000, quantity: 1, amount: 45000 },
    { productCode: '004', productName: 'スマートフォン', price: 98000, quantity: 1, amount: 98000 },
    { productCode: '006', productName: 'ワイヤレスマウス', price: 2980, quantity: 10, amount: 29800 },
    { productCode: '009', productName: 'ノートPC Pro', price: 135000, quantity: 1, amount: 135000 }
];

// CSV出力（全期間）
const CSV_ALL = BOM + [
    CSV_HEADER_LINE,
    '"001","デスクトップPC","150,000","3","450,000"',
    '"002","ノートPC","120,000","3","360,000"',
    '"003","タブレット","45,000","4","180,000"',
    '"004","スマートフォン","98,000","1","98,000"',
    '"005","液晶モニター","23,800","4","95,200"',
    '"006","ワイヤレスマウス","2,980","10","29,800"',
    '"007","24""ワイド, 保護フィルム","1,200","0","0"',
    '"008","<script>alert(1)</script>マット","800","2","1,600"',
    '"009","ノートPC Pro","135,000","1","135,000"'
].join(CRLF) + CRLF;

// CSV出力（2026/04）
const CSV_202604 = BOM + [
    CSV_HEADER_LINE,
    '"001","デスクトップPC","150,000","3","450,000"',
    '"002","ノートPC","120,000","1","120,000"',
    '"003","タブレット","45,000","3","135,000"',
    '"005","液晶モニター","23,800","4","95,200"',
    '"008","<script>alert(1)</script>マット","800","2","1,600"'
].join(CRLF) + CRLF;

function createSalesWithUnknownProduct() {
    const sales = seedData.createInitialSales();
    sales.push({
        salesDate: '2026-04-10',
        productCode: '900',
        quantity: 5,
        registerDatetime: '2026-04-10 20:00:00',
        updateDatetime: '2026-04-10 20:00:00'
    });
    return sales;
}

test('SUM-01 商品別売上集計（全期間）', () => {
    const actionResult = summaryLogic.summarizeSalesByProduct(
        seedData.createInitialProducts(), seedData.createInitialSales()
    );
    assert.equal(actionResult.isSuccess, true);
    assert.equal(actionResult.messageID, null);
    assert.deepEqual(actionResult.data.rows, SUMMARY_ALL);
});

test('SUM-02 商品別売上集計（売上のない販売中商品が数量0で含まれる）', () => {
    const actionResult = summaryLogic.summarizeSalesByProduct(
        seedData.createInitialProducts(), seedData.createInitialSales()
    );
    const row = actionResult.data.rows.find((candidate) => candidate.productCode === '007');
    assert.equal(row.quantity, 0);
    assert.equal(row.amount, 0);
});

test('SUM-03 商品別売上集計（論理削除済みでも売上があれば含まれる）', () => {
    const actionResult = summaryLogic.summarizeSalesByProduct(
        seedData.createInitialProducts(), seedData.createInitialSales()
    );
    const row = actionResult.data.rows.find((candidate) => candidate.productCode === '008');
    assert.equal(row.quantity, 2);
    assert.equal(row.amount, 1600);
});

test('SUM-04 商品別売上集計（商品コードの昇順）', () => {
    const actionResult = summaryLogic.summarizeSalesByProduct(
        seedData.createInitialProducts(), seedData.createInitialSales()
    );
    assert.deepEqual(
        actionResult.data.rows.map((row) => row.productCode),
        ['001', '002', '003', '004', '005', '006', '007', '008', '009']
    );
});

test('SUM-05 商品別売上集計（論理削除済みで売上が無い商品は含まれない）', () => {
    const sales = seedData.createInitialSales().filter((row) => row.productCode !== '008');
    const actionResult = summaryLogic.summarizeSalesByProduct(seedData.createInitialProducts(), sales);
    assert.equal(actionResult.data.rows.length, 8);
    assert.equal(actionResult.data.rows.some((row) => row.productCode === '008'), false);
});

test('SUM-06 商品別売上集計（商品マスタに存在しない商品の売上は集計されない）', () => {
    const actionResult = summaryLogic.summarizeSalesByProduct(
        seedData.createInitialProducts(), createSalesWithUnknownProduct()
    );
    assert.deepEqual(actionResult.data.rows, SUMMARY_ALL);
});

test('SUM-07 商品別売上集計（商品0件）', () => {
    const actionResult = summaryLogic.summarizeSalesByProduct([], []);
    assert.equal(actionResult.isSuccess, false);
    assert.equal(actionResult.messageID, 'E-206');
    assert.deepEqual(actionResult.data.rows, []);
});

test('SUM-08 商品別売上集計（売上0件でも販売中商品があれば0件にならない）', () => {
    const actionResult = summaryLogic.summarizeSalesByProduct(seedData.createInitialProducts(), []);
    assert.equal(actionResult.isSuccess, true);
    assert.equal(actionResult.data.rows.length, 8);
    actionResult.data.rows.forEach((row) => {
        assert.equal(row.quantity, 0);
    });
});

test('SUM-09 指定年月集計（2026/04）', () => {
    const actionResult = summaryLogic.summarizeSalesByProductForMonth(
        seedData.createInitialProducts(), seedData.createInitialSales(), '2026/04'
    );
    assert.equal(actionResult.isSuccess, true);
    assert.deepEqual(actionResult.data.rows, SUMMARY_202604);
    assert.equal(actionResult.data.yearMonth, '2026-04');
    assert.equal(actionResult.data.trimmedYearMonth, '2026/04');
});

test('SUM-10 指定年月集計（2026/05）', () => {
    const actionResult = summaryLogic.summarizeSalesByProductForMonth(
        seedData.createInitialProducts(), seedData.createInitialSales(), '2026/05'
    );
    assert.deepEqual(actionResult.data.rows, SUMMARY_202605);
});

test('SUM-11 指定年月集計（売上のない商品は含まれない）', () => {
    const actionResult = summaryLogic.summarizeSalesByProductForMonth(
        seedData.createInitialProducts(), seedData.createInitialSales(), '2026/04'
    );
    const productCodes = actionResult.data.rows.map((row) => row.productCode);
    ['007', '004', '006', '009'].forEach((productCode) => {
        assert.equal(productCodes.includes(productCode), false, productCode + ' が含まれている');
    });
});

test('SUM-12 指定年月集計（論理削除済みでも当月に売上があれば含まれる）', () => {
    const actionResult = summaryLogic.summarizeSalesByProductForMonth(
        seedData.createInitialProducts(), seedData.createInitialSales(), '2026/04'
    );
    assert.equal(actionResult.data.rows.some((row) => row.productCode === '008'), true);
});

test('SUM-13 指定年月集計（対象0件）', () => {
    const actionResult = summaryLogic.summarizeSalesByProductForMonth(
        seedData.createInitialProducts(), seedData.createInitialSales(), '2026/06'
    );
    assert.equal(actionResult.isSuccess, false);
    assert.equal(actionResult.messageID, 'E-206');
    assert.deepEqual(actionResult.data.rows, []);
    assert.equal(actionResult.data.yearMonth, '2026-06');
});

test('SUM-14 指定年月集計（入力チェック：必須）', () => {
    const actionResult = summaryLogic.summarizeSalesByProductForMonth(
        seedData.createInitialProducts(), seedData.createInitialSales(), ''
    );
    assert.equal(actionResult.isSuccess, false);
    assert.equal(actionResult.messageID, null);
    assert.equal(actionResult.errors.length, 1);
    assert.equal(actionResult.errors[0].fieldID, 'csv-year-month');
    assert.equal(actionResult.errors[0].rowIndex, null);
    assert.equal(actionResult.errors[0].messageID, 'E-101');
});

test('SUM-15 指定年月集計（入力チェック：形式）', () => {
    const actionResult = summaryLogic.summarizeSalesByProductForMonth(
        seedData.createInitialProducts(), seedData.createInitialSales(), '2026-04'
    );
    assert.equal(actionResult.errors[0].messageID, 'E-106');
    assert.equal(actionResult.data.trimmedYearMonth, '2026-04');
    assert.equal(actionResult.data.yearMonth, '');
});

test('SUM-16 指定年月集計（前後の空白を除去して集計できる）', () => {
    const actionResult = summaryLogic.summarizeSalesByProductForMonth(
        seedData.createInitialProducts(), seedData.createInitialSales(), '　2026/04 '
    );
    assert.equal(actionResult.isSuccess, true);
    assert.equal(actionResult.data.rows.length, 5);
    assert.equal(actionResult.data.trimmedYearMonth, '2026/04');
});

test('SUM-17 指定年月集計（商品マスタに存在しない商品の売上は集計されない）', () => {
    const actionResult = summaryLogic.summarizeSalesByProductForMonth(
        seedData.createInitialProducts(), createSalesWithUnknownProduct(), '2026/04'
    );
    assert.deepEqual(actionResult.data.rows, SUMMARY_202604);
});

test('SUM-18 指定年月集計（単価変更が過去の年月の金額に反映される）', () => {
    const products = seedData.createInitialProducts();
    products.find((product) => product.productCode === '003').price = 50000;
    const actionResult = summaryLogic.summarizeSalesByProductForMonth(
        products, seedData.createInitialSales(), '2026/04'
    );
    const row = actionResult.data.rows.find((candidate) => candidate.productCode === '003');
    assert.equal(row.price, 50000);
    assert.equal(row.quantity, 3);
    assert.equal(row.amount, 150000);
});

test('SUM-19 CSV文字列（商品別売上集計）', () => {
    const actionResult = summaryLogic.summarizeSalesByProduct(
        seedData.createInitialProducts(), seedData.createInitialSales()
    );
    const csvText = summaryLogic.buildSummaryCSV(actionResult.data.rows);
    assert.equal(csvText, CSV_ALL);
    assert.equal(csvText.startsWith(BOM), true);
    assert.equal(csvText.endsWith(CRLF), true);
    assert.equal(csvText.split(CRLF).length - 1, 10);
});

test('SUM-20 CSV文字列（見出し行）', () => {
    const csvText = summaryLogic.buildSummaryCSV([]);
    assert.equal(csvText.slice(BOM.length).split(CRLF)[0], CSV_HEADER_LINE);
});

test('SUM-21 CSV文字列（ダブルクォートとカンマを含む商品名）', () => {
    const actionResult = summaryLogic.summarizeSalesByProduct(
        seedData.createInitialProducts(), seedData.createInitialSales()
    );
    const csvText = summaryLogic.buildSummaryCSV(actionResult.data.rows);
    assert.equal(csvText.includes('"007","24""ワイド, 保護フィルム","1,200","0","0"'), true);
});

test('SUM-22 CSV文字列（HTMLエスケープをしない）', () => {
    const actionResult = summaryLogic.summarizeSalesByProduct(
        seedData.createInitialProducts(), seedData.createInitialSales()
    );
    const csvText = summaryLogic.buildSummaryCSV(actionResult.data.rows);
    assert.equal(csvText.includes('"008","<script>alert(1)</script>マット","800","2","1,600"'), true);
    assert.equal(csvText.includes('&lt;'), false);
});

test('SUM-23 CSV文字列（単価・金額は桁区切り、数量は桁区切りなし）', () => {
    const csvText = summaryLogic.buildSummaryCSV([
        { productCode: '001', productName: 'X', price: 999999, quantity: 9999, amount: 9998990001 }
    ]);
    assert.equal(csvText.split(CRLF)[1], '"001","X","999,999","9999","9,998,990,001"');
});

test('SUM-24 CSV文字列（指定年月集計）', () => {
    const actionResult = summaryLogic.summarizeSalesByProductForMonth(
        seedData.createInitialProducts(), seedData.createInitialSales(), '2026/04'
    );
    assert.equal(summaryLogic.buildSummaryCSV(actionResult.data.rows), CSV_202604);
});

test('SUM-25 CSV文字列（0行）', () => {
    assert.equal(summaryLogic.buildSummaryCSV([]), BOM + CSV_HEADER_LINE + CRLF);
});

test('SUM-26 集計が引数の配列を変更しない', () => {
    const products = seedData.createInitialProducts();
    const sales = seedData.createInitialSales();
    summaryLogic.summarizeSalesByProduct(products, sales);
    summaryLogic.summarizeSalesByProductForMonth(products, sales, '2026/04');
    assert.deepEqual(products, seedData.createInitialProducts());
    assert.deepEqual(sales, seedData.createInitialSales());
});
