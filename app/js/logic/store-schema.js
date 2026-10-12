// 保存データの構造検証と、保存時の並び替えを行う。
// 構造検証は「破損」と判定する条件のみを見る。参照整合性は対象外とする。

(function (global) {
    'use strict';
    const constants = (typeof require === 'function') ? require('./constants.js') : global.PMA.constants;

    /**
     * 保存形式の日時の文字列かを判定する。
     * @param {*} value 対象の値
     * @returns {boolean} 保存形式の日時なら true
     */
    function isStoredDatetime(value) {
        return typeof value === 'string' && constants.STORED_DATETIME_PATTERN.test(value);
    }

    /**
     * 商品コードとして正しい文字列かを判定する。
     * @param {*} value 対象の値
     * @returns {boolean} 半角数字3桁の文字列なら true
     */
    function isProductCode(value) {
        return typeof value === 'string' && constants.PRODUCT_CODE_PATTERN.test(value);
    }

    /**
     * 商品マスタの構造が正しいかを判定する。
     * @param {*} value 検証対象
     * @returns {boolean} 構造が正しければ true
     */
    function isValidProducts(value) {
        if (!Array.isArray(value)) {
            return false;
        }
        const seenProductCodes = [];
        for (const product of value) {
            if (product === null || typeof product !== 'object') {
                return false;
            }
            if (!isProductCode(product.productCode)) {
                return false;
            }
            if (typeof product.productName !== 'string') {
                return false;
            }
            if (!Number.isInteger(product.price)
                || product.price < constants.PRICE_MIN || product.price > constants.PRICE_MAX) {
                return false;
            }
            if (!isStoredDatetime(product.registerDatetime) || !isStoredDatetime(product.updateDatetime)) {
                return false;
            }
            if (product.deleteDatetime !== null && !isStoredDatetime(product.deleteDatetime)) {
                return false;
            }
            if (seenProductCodes.indexOf(product.productCode) >= 0) {
                return false;
            }
            seenProductCodes.push(product.productCode);
        }
        return true;
    }

    /**
     * 売上テーブルの構造が正しいかを判定する。
     * @param {*} value 検証対象
     * @returns {boolean} 構造が正しければ true
     */
    function isValidSales(value) {
        if (!Array.isArray(value)) {
            return false;
        }
        const seenUniqueKeys = [];
        for (const sales of value) {
            if (sales === null || typeof sales !== 'object') {
                return false;
            }
            if (typeof sales.salesDate !== 'string' || !constants.STORED_DATE_PATTERN.test(sales.salesDate)) {
                return false;
            }
            if (!isProductCode(sales.productCode)) {
                return false;
            }
            if (!Number.isInteger(sales.quantity)
                || sales.quantity < constants.QUANTITY_MIN || sales.quantity > constants.QUANTITY_MAX) {
                return false;
            }
            if (!isStoredDatetime(sales.registerDatetime) || !isStoredDatetime(sales.updateDatetime)) {
                return false;
            }
            const uniqueKey = sales.salesDate + ' ' + sales.productCode;
            if (seenUniqueKeys.indexOf(uniqueKey) >= 0) {
                return false;
            }
            seenUniqueKeys.push(uniqueKey);
        }
        return true;
    }

    /**
     * 商品マスタを保存順（商品コードの昇順）に並べ替えた新しい配列を返す。
     * @param {object[]} products 商品レコードの配列
     * @returns {object[]} 並べ替えた新しい配列
     */
    function sortProducts(products) {
        return products.slice().sort(function (left, right) {
            if (left.productCode < right.productCode) {
                return -1;
            }
            if (left.productCode > right.productCode) {
                return 1;
            }
            return 0;
        });
    }

    /**
     * 売上テーブルを保存順（売上日の昇順、商品コードの昇順）に並べ替えた新しい配列を返す。
     * @param {object[]} sales 売上レコードの配列
     * @returns {object[]} 並べ替えた新しい配列
     */
    function sortSales(sales) {
        return sales.slice().sort(function (left, right) {
            if (left.salesDate !== right.salesDate) {
                return (left.salesDate < right.salesDate) ? -1 : 1;
            }
            if (left.productCode < right.productCode) {
                return -1;
            }
            if (left.productCode > right.productCode) {
                return 1;
            }
            return 0;
        });
    }

    const exported = {
        isValidProducts,
        isValidSales,
        sortProducts,
        sortSales
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = exported;
    } else {
        global.PMA = global.PMA || {};
        global.PMA.storeSchema = exported;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
