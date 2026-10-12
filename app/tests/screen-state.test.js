// js/view/screen-state.js のテスト。

const test = require('node:test');
const assert = require('node:assert/strict');
const screenState = require('../js/view/screen-state.js');

function createStateWithRows(productCodes) {
    const state = screenState.createInitialState();
    productCodes.forEach((productCode, index) => {
        state.salesDetailRows.push({ rowIndex: index, productCode, quantity: '' });
    });
    return state;
}

function createStateWithRowCount(count) {
    const state = screenState.createInitialState();
    for (let index = 0; index < count; index += 1) {
        state.salesDetailRows.push({ rowIndex: index, productCode: '', quantity: '' });
    }
    return state;
}

test('STA-01 初期状態', () => {
    assert.deepEqual(screenState.createInitialState(), {
        currentScreenID: '',
        editingBaseUpdateDatetime: '',
        hasSalesOfEditingProduct: false,
        salesDetailRows: []
    });
});

test('STA-02 表示中の画面IDの設定', () => {
    const state = screenState.createInitialState();
    const returned = screenState.setCurrentScreenID(state, 'screen-product-edit');
    assert.equal(returned.currentScreenID, 'screen-product-edit');
    assert.equal(returned, state);
});

test('STA-03 商品変更・削除画面の作業状態の設定', () => {
    const state = screenState.createInitialState();
    screenState.setEditingContext(state, '2026-04-01 09:00:00', true);
    assert.equal(state.editingBaseUpdateDatetime, '2026-04-01 09:00:00');
    assert.equal(state.hasSalesOfEditingProduct, true);
});

test('STA-04 明細一覧の差し替え', () => {
    const state = screenState.createInitialState();
    screenState.setSalesDetailRows(state, [{ rowIndex: 0, productCode: '001', quantity: '2' }]);
    assert.equal(state.salesDetailRows.length, 1);
});

test('STA-05 明細行の追加', () => {
    const state = screenState.createInitialState();
    assert.equal(screenState.addSalesDetailRow(state).isSuccess, true);
    assert.equal(screenState.addSalesDetailRow(state).isSuccess, true);
    assert.deepEqual(state.salesDetailRows, [
        { rowIndex: 0, productCode: '', quantity: '' },
        { rowIndex: 1, productCode: '', quantity: '' }
    ]);
});

test('STA-06 明細行の追加（上限の内側）', () => {
    const state = createStateWithRowCount(998);
    const actionResult = screenState.addSalesDetailRow(state);
    assert.equal(actionResult.isSuccess, true);
    assert.equal(state.salesDetailRows.length, 999);
});

test('STA-07 明細行の追加（上限超過）', () => {
    const state = createStateWithRowCount(999);
    const actionResult = screenState.addSalesDetailRow(state);
    assert.equal(actionResult.isSuccess, false);
    assert.equal(actionResult.messageID, 'E-209');
    assert.equal(actionResult.messageParams.maxRows, 999);
    assert.equal(state.salesDetailRows.length, 999);
});

test('STA-08 明細行の削除と行番号の振り直し', () => {
    const state = createStateWithRows(['001', '002', '003']);
    screenState.removeSalesDetailRow(state, 1);
    assert.deepEqual(
        state.salesDetailRows.map((row) => [row.rowIndex, row.productCode]),
        [[0, '001'], [1, '003']]
    );
});

test('STA-09 明細行の値の設定（商品コード）', () => {
    const state = createStateWithRows(['001']);
    const returned = screenState.setSalesDetailRowValue(state, 0, 'productCode', '005');
    assert.equal(state.salesDetailRows[0].productCode, '005');
    assert.equal(returned, state);
});

test('STA-10 明細行の値の設定（数量は文字列のまま保持）', () => {
    const state = createStateWithRows(['001']);
    screenState.setSalesDetailRowValue(state, 0, 'quantity', '１０');
    assert.equal(state.salesDetailRows[0].quantity, '１０');
});

test('STA-11 明細行の値の設定（対象外のフィールド名）', () => {
    const state = createStateWithRows(['001']);
    screenState.setSalesDetailRowValue(state, 0, 'rowIndex', '9');
    assert.equal(state.salesDetailRows[0].rowIndex, 0);
});

test('STA-12 明細行の値の設定（行番号が範囲外）', () => {
    const state = createStateWithRows(['001']);
    screenState.setSalesDetailRowValue(state, 1, 'productCode', '005');
    screenState.setSalesDetailRowValue(state, -1, 'productCode', '005');
    assert.equal(state.salesDetailRows.length, 1);
    assert.equal(state.salesDetailRows[0].productCode, '001');
});

test('STA-13 明細行の削除（行番号が範囲外）', () => {
    const state = createStateWithRows(['001', '002']);
    screenState.removeSalesDetailRow(state, -1);
    screenState.removeSalesDetailRow(state, 2);
    assert.deepEqual(state.salesDetailRows.map((row) => row.productCode), ['001', '002']);
});
