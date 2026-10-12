// js/logic/messages.js のテスト。

const test = require('node:test');
const assert = require('node:assert/strict');
const messages = require('../js/logic/messages.js');

test('MSG-01 埋め込みの無いメッセージ', () => {
    assert.equal(messages.getMessageText('I-001', {}), '商品を登録しました。');
});

test('MSG-02 項目名の埋め込み', () => {
    assert.equal(messages.getMessageText('E-101', { label: '商品名' }), '商品名を入力してください。');
});

test('MSG-03 文字数上限の埋め込み', () => {
    assert.equal(
        messages.getMessageText('E-103', { label: '商品名', maxLength: 50 }),
        '商品名は50文字以内で入力してください。'
    );
});

test('MSG-04 下限・上限の埋め込みが3桁カンマ区切りになる', () => {
    assert.equal(
        messages.getMessageText('E-105', { label: '単価', min: 1, max: 999999 }),
        '単価は1以上999,999以下で入力してください。'
    );
});

test('MSG-05 件数上限の埋め込みが3桁カンマ区切りになる', () => {
    assert.equal(
        messages.getMessageText('E-208', { maxCount: 100000 }),
        '売上の登録件数が上限（100,000件）を超えるため登録できません。'
    );
});

test('MSG-06 商品コード上限の埋め込み（桁区切りを付けない）', () => {
    assert.equal(
        messages.getMessageText('E-205', { maxProductCode: '999' }),
        '商品コードが上限（999）に達しているため、これ以上登録できません。'
    );
});

test('MSG-07 ファイル名の埋め込み', () => {
    assert.equal(
        messages.getMessageText('I-007', { fileName: 'product_sales_summary.csv' }),
        'CSVファイル「product_sales_summary.csv」をダウンロードしました。'
    );
});

test('MSG-08 種別（情報）', () => {
    assert.equal(messages.getMessageType('I-005'), 'info');
});

test('MSG-09 種別（エラー）', () => {
    assert.equal(messages.getMessageType('E-101'), 'error');
    assert.equal(messages.getMessageType('E-901'), 'error');
});

test('MSG-10 種別（確認ダイアログ）', () => {
    assert.equal(messages.getMessageType('C-001'), 'confirm');
});

test('MSG-11 確認ダイアログの文言（HTMLエスケープされていないこと）', () => {
    assert.equal(
        messages.getMessageText('C-001', { productName: '24"ワイド, 保護フィルム' }),
        '商品「24"ワイド, 保護フィルム」を削除します。よろしいですか？'
    );
});

test('MSG-12 定義漏れが無いこと', () => {
    const allMessageParams = {
        'I-001': {},
        'I-002': {},
        'I-003': {},
        'I-004': {},
        'I-005': {},
        'I-006': {},
        'I-007': { fileName: 'product_sales_summary.csv' },
        'E-101': { label: '商品名' },
        'E-102': { label: '商品名' },
        'E-103': { label: '商品名', maxLength: 50 },
        'E-104': { label: '単価' },
        'E-105': { label: '単価', min: 1, max: 999999 },
        'E-106': { label: '年月' },
        'E-107': {},
        'E-201': {},
        'E-202': {},
        'E-203': {},
        'E-204': {},
        'E-205': { maxProductCode: '999' },
        'E-206': {},
        'E-207': {},
        'E-208': { maxCount: 100000 },
        'E-209': { maxRows: 999 },
        'E-901': {},
        'E-902': {},
        'E-903': { detail: 'テスト用の例外' },
        'C-001': { productName: 'デスクトップPC' },
        'C-002': {}
    };
    Object.keys(allMessageParams).forEach((messageID) => {
        const text = messages.getMessageText(messageID, allMessageParams[messageID]);
        assert.notEqual(text, '', messageID + ' の文言が空である');
        assert.equal(text.includes('{'), false, messageID + ' に未解決の埋め込みが残っている');
        assert.equal(text.includes('}'), false, messageID + ' に未解決の埋め込みが残っている');
    });
});
