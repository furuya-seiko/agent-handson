// js/view/render.js のテスト。

const test = require('node:test');
const assert = require('node:assert/strict');
const render = require('../js/view/render.js');
const productLogic = require('../js/logic/product-logic.js');
const seedData = require('../js/logic/seed-data.js');

function findProduct(productCode) {
    return seedData.createInitialProducts().find((product) => product.productCode === productCode);
}

function createSellingProducts() {
    return productLogic.listSellingProducts(seedData.createInitialProducts());
}

test('REN-01 メッセージ一覧（0件）', () => {
    assert.equal(render.renderMessageList([]), '');
});

test('REN-02 メッセージ一覧（種別ごとのクラス）', () => {
    const html = render.renderMessageList([
        { messageType: 'info', text: 'A' },
        { messageType: 'error', text: 'B' }
    ]);
    assert.equal(html.includes('<ul class="message-list">'), true);
    assert.equal(html.includes('<li class="message message--info">A</li>'), true);
    assert.equal(html.includes('<li class="message message--error">B</li>'), true);
});

test('REN-03 メッセージ一覧（文言のエスケープ）', () => {
    const html = render.renderMessageList([{ messageType: 'error', text: '<b>X</b>' }]);
    assert.equal(html.includes('&lt;b&gt;X&lt;/b&gt;'), true);
    assert.equal(html.includes('<b>'), false);
});

test('REN-04 検索結果の行（0件）', () => {
    assert.equal(render.renderProductSearchRows([]), '');
});

test('REN-05 検索結果の行（商品名のエスケープ）', () => {
    const html = render.renderProductSearchRows([findProduct('008')]);
    assert.equal(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;マット'), true);
    assert.equal(html.includes('<script>'), false);
});

test('REN-06 検索結果の行（単価の通貨表示）', () => {
    assert.equal(render.renderProductSearchRows([findProduct('001')]).includes('¥150,000'), true);
});

test('REN-07 検索結果の行（編集ボタンのidと属性）', () => {
    const html = render.renderProductSearchRows([findProduct('001')]);
    assert.equal(html.includes('id="button-edit-001"'), true);
    assert.equal(html.includes('data-product-code="001"'), true);
});

test('REN-08 検索結果の行（属性値のエスケープ）', () => {
    const html = render.renderProductSearchRows([findProduct('007')]);
    assert.equal(html.includes('24&quot;ワイド, 保護フィルム'), true);
});

test('REN-09 商品の選択肢（未選択の選択肢が先頭にある）', () => {
    const html = render.renderProductOptions(createSellingProducts(), '');
    assert.equal(html.startsWith('<option value="" selected>選択してください</option>'), true);
    assert.equal(html.split('<option ').length - 1, 9);
});

test('REN-10 商品の選択肢（valueは商品コード、表示は商品名）', () => {
    const html = render.renderProductOptions(createSellingProducts(), '');
    assert.equal(html.includes('<option value="002">ノートPC</option>'), true);
    assert.equal(html.includes('<option value="009">ノートPC Pro</option>'), true);
});

test('REN-11 商品の選択肢（選択状態）', () => {
    const html = render.renderProductOptions(createSellingProducts(), '003');
    assert.equal(html.includes('<option value="003" selected>タブレット</option>'), true);
    assert.equal(html.includes('<option value="" selected>'), false);
});

test('REN-12 商品の選択肢（一致する商品が無い場合は未選択になる）', () => {
    const html = render.renderProductOptions(createSellingProducts(), '008');
    assert.equal(html.includes('<option value="" selected>選択してください</option>'), true);
    assert.equal(html.includes('value="008"'), false);
});

test('REN-13 明細行（0件）', () => {
    assert.equal(render.renderSalesDetailRows([], []), '');
});

test('REN-14 明細行（idと行番号）', () => {
    const html = render.renderSalesDetailRows([
        { rowIndex: 0, productCode: '001', quantity: '2' },
        { rowIndex: 1, productCode: '003', quantity: '4' }
    ], createSellingProducts());
    assert.equal(html.includes('id="sales-product-code-0"'), true);
    assert.equal(html.includes('id="sales-quantity-0"'), true);
    assert.equal(html.includes('id="button-remove-row-0"'), true);
    assert.equal(html.includes('id="sales-quantity-1"'), true);
    assert.equal(html.includes('<td>1</td>'), true);
    assert.equal(html.includes('<td>2</td>'), true);
});

test('REN-15 明細行（数量のエスケープ）', () => {
    const html = render.renderSalesDetailRows(
        [{ rowIndex: 0, productCode: '001', quantity: '"><img src=x>' }],
        createSellingProducts()
    );
    assert.equal(html.includes('value="&quot;&gt;&lt;img src=x&gt;"'), true);
    assert.equal(html.includes('<img'), false);
});

test('REN-16 明細行（maxlength属性を出力しない）', () => {
    const html = render.renderSalesDetailRows([
        { rowIndex: 0, productCode: '001', quantity: '2' },
        { rowIndex: 1, productCode: '003', quantity: '4' }
    ], createSellingProducts());
    assert.equal(html.includes('maxlength'), false);
    assert.equal(html.includes('¥'), false);
    assert.equal(html.split('<td>').length - 1, 8);
});
