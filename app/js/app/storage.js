// localStorage / sessionStorage へのアクセスと、起動時の初期データ投入を行う。
// 業務ロジックは保存領域に一切アクセスしない。

(function (global) {
    'use strict';
    const constants = (typeof require === 'function') ? require('../logic/constants.js') : global.PMA.constants;
    const result = (typeof require === 'function') ? require('../logic/result.js') : global.PMA.result;
    const storeSchema = (typeof require === 'function') ? require('../logic/store-schema.js') : global.PMA.storeSchema;
    const seedData = (typeof require === 'function') ? require('../logic/seed-data.js') : global.PMA.seedData;

    /**
     * 既定のプロバイダを求める。利用できない環境では null を返す。
     * @param {string} providerName 'localStorage' または 'sessionStorage'
     * @returns {object|null} プロバイダ
     */
    function getDefaultProvider(providerName) {
        if (typeof global[providerName] === 'undefined' || global[providerName] === null) {
            return null;
        }
        return global[providerName];
    }

    let localProviderRef = getDefaultProvider('localStorage');
    let sessionProviderRef = getDefaultProvider('sessionStorage');

    /**
     * 保存領域の実体を差し替える（テスト用）。
     * @param {object|null} localProvider localStorage の代替
     * @param {object|null} sessionProvider sessionStorage の代替
     * @returns {void}
     */
    function setStorageProviders(localProvider, sessionProvider) {
        localProviderRef = localProvider;
        sessionProviderRef = sessionProvider;
    }

    /**
     * 保存領域の実体を既定に戻す（テスト用）。
     * @returns {void}
     */
    function resetStorageProviders() {
        localProviderRef = getDefaultProvider('localStorage');
        sessionProviderRef = getDefaultProvider('sessionStorage');
    }

    /**
     * localStorage から値を読む。プロバイダが無い場合は null を返す。
     * @param {string} key 保存キー
     * @returns {string|null} 保存されている文字列
     */
    function readLocal(key) {
        if (localProviderRef === null) {
            return null;
        }
        return localProviderRef.getItem(key);
    }

    /**
     * 初期データを投入する。途中で失敗した場合は投入前の状態に戻す。
     * @returns {object} ActionResult。data は { products, sales }
     */
    function restoreInitialData() {
        const products = storeSchema.sortProducts(seedData.createInitialProducts());
        const sales = storeSchema.sortSales(seedData.createInitialSales());
        const writtenKeys = [];
        if (localProviderRef === null) {
            return result.createErrorResult('E-902', {}, { products: [], sales: [] });
        }
        try {
            localProviderRef.setItem(constants.STORAGE_KEY_PRODUCTS, JSON.stringify(products));
            writtenKeys.push(constants.STORAGE_KEY_PRODUCTS);
            localProviderRef.setItem(constants.STORAGE_KEY_SALES, JSON.stringify(sales));
            writtenKeys.push(constants.STORAGE_KEY_SALES);
            // 途中で失敗したときに「投入済み」と誤認されないよう、フラグは最後に書き込む
            localProviderRef.setItem(constants.STORAGE_KEY_INITIALIZED, constants.STORAGE_VALUE_INITIALIZED);
            writtenKeys.push(constants.STORAGE_KEY_INITIALIZED);
        } catch (error) {
            writtenKeys.forEach(function (key) {
                localProviderRef.removeItem(key);
            });
            return result.createErrorResult('E-902', {}, { products: [], sales: [] });
        }
        return result.createSuccessResult(null, {}, { products, sales });
    }

    /**
     * 起動時の初期データ投入と破損検知を行う。
     * @returns {object} ActionResult。data は { products, sales }
     */
    function initializeStoreIfNeeded() {
        if (readLocal(constants.STORAGE_KEY_INITIALIZED) !== constants.STORAGE_VALUE_INITIALIZED) {
            return restoreInitialData();
        }

        let products = null;
        let sales = null;
        let isBroken = false;
        try {
            products = JSON.parse(readLocal(constants.STORAGE_KEY_PRODUCTS));
            sales = JSON.parse(readLocal(constants.STORAGE_KEY_SALES));
        } catch (error) {
            isBroken = true;
        }
        if (isBroken || !storeSchema.isValidProducts(products) || !storeSchema.isValidSales(sales)) {
            const restoreResult = restoreInitialData();
            if (!restoreResult.isSuccess) {
                return restoreResult;
            }
            return result.createErrorResult('E-901', {}, restoreResult.data);
        }
        return result.createSuccessResult(null, {}, { products, sales });
    }

    /**
     * 保存データを1種類読み込む。破損していれば初期データを再投入する。
     * @param {string} storageKey 保存キー
     * @param {function} isValid 構造検証の関数
     * @param {string} dataKey 戻り値の data に設定するキー名
     * @returns {object} ActionResult
     */
    function loadStoredArray(storageKey, isValid, dataKey) {
        const rawValue = readLocal(storageKey);
        if (rawValue === null) {
            return result.createSuccessResult(null, {}, { [dataKey]: [] });
        }
        let storedArray = null;
        let isBroken = false;
        try {
            storedArray = JSON.parse(rawValue);
        } catch (error) {
            isBroken = true;
        }
        if (isBroken || !isValid(storedArray)) {
            const restoreResult = restoreInitialData();
            if (!restoreResult.isSuccess) {
                return restoreResult;
            }
            return result.createErrorResult('E-901', {}, { [dataKey]: restoreResult.data[dataKey] });
        }
        return result.createSuccessResult(null, {}, { [dataKey]: storedArray });
    }

    /**
     * 商品マスタを読み込む。
     * @returns {object} ActionResult。data は { products }
     */
    function loadProducts() {
        return loadStoredArray(constants.STORAGE_KEY_PRODUCTS, storeSchema.isValidProducts, 'products');
    }

    /**
     * 売上テーブルを読み込む。
     * @returns {object} ActionResult。data は { sales }
     */
    function loadSales() {
        return loadStoredArray(constants.STORAGE_KEY_SALES, storeSchema.isValidSales, 'sales');
    }

    /**
     * 保存データを1種類書き込む。並べ替えは行わない。
     * @param {string} storageKey 保存キー
     * @param {object[]} storedArray 書き込む配列
     * @returns {object} ActionResult
     */
    function saveStoredArray(storageKey, storedArray) {
        if (localProviderRef === null) {
            return result.createErrorResult('E-902');
        }
        try {
            localProviderRef.setItem(storageKey, JSON.stringify(storedArray));
        } catch (error) {
            return result.createErrorResult('E-902');
        }
        return result.createSuccessResult(null, {}, null);
    }

    /**
     * 商品マスタを書き込む。
     * @param {object[]} products 商品レコードの配列
     * @returns {object} ActionResult
     */
    function saveProducts(products) {
        return saveStoredArray(constants.STORAGE_KEY_PRODUCTS, products);
    }

    /**
     * 売上テーブルを書き込む。
     * @param {object[]} sales 売上レコードの配列
     * @returns {object} ActionResult
     */
    function saveSales(sales) {
        return saveStoredArray(constants.STORAGE_KEY_SALES, sales);
    }

    /**
     * sessionStorage へ書き込む。失敗しても処理を止めない。
     * @param {string} key 保存キー
     * @param {string} value 書き込む文字列
     * @returns {void}
     */
    function writeSession(key, value) {
        if (sessionProviderRef === null) {
            return;
        }
        try {
            sessionProviderRef.setItem(key, value);
        } catch (error) {
            // 一時情報は失われても業務処理を止めない
        }
    }

    /**
     * sessionStorage から読み出す。失敗した場合は「値が無い」として扱う。
     * @param {string} key 保存キー
     * @returns {string|null} 保存されている文字列
     */
    function readSession(key) {
        if (sessionProviderRef === null) {
            return null;
        }
        try {
            return sessionProviderRef.getItem(key);
        } catch (error) {
            return null;
        }
    }

    /**
     * 引き継ぎメッセージを保存する。
     * @param {string} messageID メッセージID
     * @param {object} messageParams メッセージに埋め込む値
     * @returns {void}
     */
    function saveFlashMessage(messageID, messageParams) {
        writeSession(constants.SESSION_KEY_FLASH_MESSAGE, JSON.stringify({ messageID, messageParams }));
    }

    /**
     * 引き継ぎメッセージを読み出して削除する。
     * @returns {object|null} { messageID, messageParams }。無い場合は null
     */
    function takeFlashMessage() {
        const rawValue = readSession(constants.SESSION_KEY_FLASH_MESSAGE);
        if (rawValue === null) {
            return null;
        }
        if (sessionProviderRef !== null) {
            try {
                sessionProviderRef.removeItem(constants.SESSION_KEY_FLASH_MESSAGE);
            } catch (error) {
                // 削除できなくても処理を続ける
            }
        }
        try {
            const flashMessage = JSON.parse(rawValue);
            return { messageID: flashMessage.messageID, messageParams: flashMessage.messageParams };
        } catch (error) {
            return null;
        }
    }

    /**
     * 検索条件を保存する。
     * @param {string} value 空白除去後の商品名
     * @returns {void}
     */
    function saveSearchProductName(value) {
        writeSession(constants.SESSION_KEY_SEARCH_PRODUCT_NAME, value);
    }

    /**
     * 検索条件を読み出す。
     * @returns {string} 保存されている商品名。無い場合は空文字
     */
    function loadSearchProductName() {
        const rawValue = readSession(constants.SESSION_KEY_SEARCH_PRODUCT_NAME);
        return (rawValue === null) ? '' : rawValue;
    }

    /**
     * 編集対象の商品コードを保存する。
     * @param {string} value 3桁ゼロ埋めの商品コード
     * @returns {void}
     */
    function saveEditProductCode(value) {
        writeSession(constants.SESSION_KEY_EDIT_PRODUCT_CODE, value);
    }

    /**
     * 編集対象の商品コードを読み出す。
     * @returns {string} 保存されている商品コード。無い場合は空文字
     */
    function loadEditProductCode() {
        const rawValue = readSession(constants.SESSION_KEY_EDIT_PRODUCT_CODE);
        return (rawValue === null) ? '' : rawValue;
    }

    const exported = {
        setStorageProviders,
        resetStorageProviders,
        initializeStoreIfNeeded,
        loadProducts,
        saveProducts,
        loadSales,
        saveSales,
        saveFlashMessage,
        takeFlashMessage,
        saveSearchProductName,
        loadSearchProductName,
        saveEditProductCode,
        loadEditProductCode
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = exported;
    } else {
        global.PMA = global.PMA || {};
        global.PMA.storage = exported;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
