// js/app/storage.js のテスト。
// 各ケースの冒頭で偽のプロバイダを生成して差し替え、終了時に既定へ戻す。

const test = require('node:test');
const assert = require('node:assert/strict');
const storage = require('../js/app/storage.js');
const seedData = require('../js/logic/seed-data.js');

/**
 * Map を内部に持つ偽のプロバイダを生成する。
 * @param {object} [options] { failOnSetItem: 常に例外を投げるか, failOnKey: このキーの書き込みだけ例外を投げる }
 * @returns {object} プロバイダ
 */
function createFakeProvider(options) {
    const settings = options || {};
    const store = new Map();
    return {
        store,
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            if (settings.failOnSetItem === true) {
                throw new Error('quota exceeded');
            }
            if (settings.failOnKey === key) {
                throw new Error('quota exceeded');
            }
            store.set(key, value);
        },
        removeItem(key) {
            store.delete(key);
        }
    };
}

function withProviders(localProvider, sessionProvider, callback) {
    storage.setStorageProviders(localProvider, sessionProvider);
    try {
        callback();
    } finally {
        storage.resetStorageProviders();
    }
}

test('STO-01 初回起動で初期データが投入される', () => {
    const localProvider = createFakeProvider();
    withProviders(localProvider, createFakeProvider(), () => {
        const actionResult = storage.initializeStoreIfNeeded();
        assert.equal(actionResult.isSuccess, true);
        assert.equal(actionResult.messageID, null);
        assert.equal(actionResult.data.products.length, 9);
        assert.equal(actionResult.data.sales.length, 11);
        assert.equal(localProvider.getItem('pma.initialized'), 'true');
    });
});

test('STO-02 2回目の起動では既存データを保持する', () => {
    const localProvider = createFakeProvider();
    localProvider.setItem('pma.initialized', 'true');
    localProvider.setItem('pma.products', JSON.stringify([seedData.createInitialProducts()[0]]));
    localProvider.setItem('pma.sales', '[]');
    withProviders(localProvider, createFakeProvider(), () => {
        const actionResult = storage.initializeStoreIfNeeded();
        assert.equal(actionResult.data.products.length, 1);
        assert.deepEqual(actionResult.data.sales, []);
    });
});

test('STO-03 商品0件・売上0件は破損としない', () => {
    const localProvider = createFakeProvider();
    localProvider.setItem('pma.initialized', 'true');
    localProvider.setItem('pma.products', '[]');
    localProvider.setItem('pma.sales', '[]');
    withProviders(localProvider, createFakeProvider(), () => {
        const actionResult = storage.initializeStoreIfNeeded();
        assert.equal(actionResult.isSuccess, true);
        assert.equal(actionResult.messageID, null);
        assert.deepEqual(actionResult.data.products, []);
        assert.deepEqual(actionResult.data.sales, []);
    });
});

test('STO-04 JSONが壊れている場合に再投入する', () => {
    const localProvider = createFakeProvider();
    localProvider.setItem('pma.initialized', 'true');
    localProvider.setItem('pma.products', '{');
    localProvider.setItem('pma.sales', '[]');
    withProviders(localProvider, createFakeProvider(), () => {
        const actionResult = storage.initializeStoreIfNeeded();
        assert.equal(actionResult.isSuccess, false);
        assert.equal(actionResult.messageID, 'E-901');
        assert.equal(actionResult.data.products.length, 9);
        assert.equal(actionResult.data.sales.length, 11);
    });
});

test('STO-05 構造が不正な場合に再投入する', () => {
    const localProvider = createFakeProvider();
    localProvider.setItem('pma.initialized', 'true');
    localProvider.setItem('pma.products', '[{"productCode":"1"}]');
    localProvider.setItem('pma.sales', '[]');
    withProviders(localProvider, createFakeProvider(), () => {
        const actionResult = storage.initializeStoreIfNeeded();
        assert.equal(actionResult.isSuccess, false);
        assert.equal(actionResult.messageID, 'E-901');
        assert.equal(actionResult.data.products.length, 9);
    });
});

test('STO-06 投入の途中で失敗したら投入前の状態に戻る', () => {
    const localProvider = createFakeProvider({ failOnKey: 'pma.sales' });
    withProviders(localProvider, createFakeProvider(), () => {
        const actionResult = storage.initializeStoreIfNeeded();
        assert.equal(actionResult.isSuccess, false);
        assert.equal(actionResult.messageID, 'E-902');
        assert.equal(localProvider.getItem('pma.products'), null);
        assert.equal(localProvider.getItem('pma.sales'), null);
        assert.equal(localProvider.getItem('pma.initialized'), null);
    });
});

test('STO-07 投入済みフラグが最後に書き込まれる', () => {
    const localProvider = createFakeProvider({ failOnKey: 'pma.sales' });
    withProviders(localProvider, createFakeProvider(), () => {
        storage.initializeStoreIfNeeded();
        assert.equal(localProvider.getItem('pma.initialized'), null);
    });
});

test('STO-08 商品の読み込み（未設定）', () => {
    withProviders(createFakeProvider(), createFakeProvider(), () => {
        const actionResult = storage.loadProducts();
        assert.equal(actionResult.isSuccess, true);
        assert.deepEqual(actionResult.data.products, []);
    });
});

test('STO-09 商品の読み込み（破損時に再投入してE-901を返す）', () => {
    const localProvider = createFakeProvider();
    localProvider.setItem('pma.products', '{');
    withProviders(localProvider, createFakeProvider(), () => {
        const actionResult = storage.loadProducts();
        assert.equal(actionResult.isSuccess, false);
        assert.equal(actionResult.messageID, 'E-901');
        assert.equal(actionResult.data.products.length, 9);
        assert.equal(JSON.parse(localProvider.getItem('pma.products')).length, 9);
    });
});

test('STO-10 商品の書き込み（並べ替えを行わない）', () => {
    const localProvider = createFakeProvider();
    withProviders(localProvider, createFakeProvider(), () => {
        const products = seedData.createInitialProducts();
        const first = products.find((product) => product.productCode === '001');
        const second = products.find((product) => product.productCode === '002');
        storage.saveProducts([second, first]);
        assert.deepEqual(
            JSON.parse(localProvider.getItem('pma.products')).map((product) => product.productCode),
            ['002', '001']
        );
    });
});

test('STO-11 商品の書き込み（容量超過）', () => {
    withProviders(createFakeProvider({ failOnSetItem: true }), createFakeProvider(), () => {
        const actionResult = storage.saveProducts([]);
        assert.equal(actionResult.isSuccess, false);
        assert.equal(actionResult.messageID, 'E-902');
    });
});

test('STO-12 売上の読み込みと書き込み', () => {
    withProviders(createFakeProvider(), createFakeProvider(), () => {
        storage.saveSales(seedData.createInitialSales());
        const actionResult = storage.loadSales();
        assert.equal(actionResult.isSuccess, true);
        assert.equal(actionResult.data.sales.length, 11);
    });
});

test('STO-13 売上の書き込み（容量超過）', () => {
    withProviders(createFakeProvider({ failOnSetItem: true }), createFakeProvider(), () => {
        const actionResult = storage.saveSales([]);
        assert.equal(actionResult.isSuccess, false);
        assert.equal(actionResult.messageID, 'E-902');
    });
});

test('STO-14 引き継ぎメッセージの保存と読み出し', () => {
    withProviders(createFakeProvider(), createFakeProvider(), () => {
        storage.saveFlashMessage('I-001', {});
        assert.deepEqual(storage.takeFlashMessage(), { messageID: 'I-001', messageParams: {} });
    });
});

test('STO-15 引き継ぎメッセージは読み出しと同時に削除される', () => {
    withProviders(createFakeProvider(), createFakeProvider(), () => {
        storage.saveFlashMessage('I-001', {});
        storage.takeFlashMessage();
        assert.equal(storage.takeFlashMessage(), null);
    });
});

test('STO-16 引き継ぎメッセージ（未設定）', () => {
    withProviders(createFakeProvider(), createFakeProvider(), () => {
        assert.equal(storage.takeFlashMessage(), null);
    });
});

test('STO-17 引き継ぎメッセージ（破損）', () => {
    const sessionProvider = createFakeProvider();
    sessionProvider.setItem('pma.flashMessage', '{');
    withProviders(createFakeProvider(), sessionProvider, () => {
        assert.equal(storage.takeFlashMessage(), null);
        assert.equal(sessionProvider.getItem('pma.flashMessage'), null);
    });
});

test('STO-18 検索条件の保存と読み出し', () => {
    withProviders(createFakeProvider(), createFakeProvider(), () => {
        storage.saveSearchProductName('ノートPC');
        assert.equal(storage.loadSearchProductName(), 'ノートPC');
    });
});

test('STO-19 検索条件（未設定）', () => {
    withProviders(createFakeProvider(), createFakeProvider(), () => {
        assert.equal(storage.loadSearchProductName(), '');
    });
});

test('STO-20 編集対象の商品コードの保存と読み出し', () => {
    withProviders(createFakeProvider(), createFakeProvider(), () => {
        storage.saveEditProductCode('007');
        assert.equal(storage.loadEditProductCode(), '007');
    });
});

test('STO-21 編集対象の商品コード（未設定）', () => {
    withProviders(createFakeProvider(), createFakeProvider(), () => {
        assert.equal(storage.loadEditProductCode(), '');
    });
});

test('STO-22 一時情報の書き込み失敗は処理を止めない', () => {
    withProviders(createFakeProvider(), createFakeProvider({ failOnSetItem: true }), () => {
        storage.saveFlashMessage('I-001', {});
        storage.saveSearchProductName('X');
        storage.saveEditProductCode('001');
    });
});

test('STO-23 プロバイダが未設定のときの読み込み', () => {
    withProviders(null, null, () => {
        const actionResult = storage.loadProducts();
        assert.equal(actionResult.isSuccess, true);
        assert.deepEqual(actionResult.data.products, []);
    });
});

test('STO-24 プロバイダが未設定のときの書き込み', () => {
    withProviders(null, null, () => {
        const actionResult = storage.saveProducts([]);
        assert.equal(actionResult.isSuccess, false);
        assert.equal(actionResult.messageID, 'E-902');
    });
});

test('STO-25 商品の読み込み（破損を検知したが再投入にも失敗する）', () => {
    const localProvider = createFakeProvider();
    localProvider.setItem('pma.products', '{');
    // 以降の書き込みだけを失敗させる
    localProvider.setItem = function () {
        throw new Error('quota exceeded');
    };
    withProviders(localProvider, createFakeProvider(), () => {
        const actionResult = storage.loadProducts();
        assert.equal(actionResult.isSuccess, false);
        assert.equal(actionResult.messageID, 'E-902');
        assert.deepEqual(actionResult.data.products, []);
    });
});
