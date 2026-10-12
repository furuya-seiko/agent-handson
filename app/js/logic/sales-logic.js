// 売上の取得・一括登録・売上有無判定を行う業務ロジック。
// DOM・保存領域に一切依存せず、保存データを引数で受け取り結果を戻り値で返す。

(function (global) {
    'use strict';
    const constants = (typeof require === 'function') ? require('./constants.js') : global.PMA.constants;
    const result = (typeof require === 'function') ? require('./result.js') : global.PMA.result;
    const validation = (typeof require === 'function') ? require('./validation.js') : global.PMA.validation;
    const storeSchema = (typeof require === 'function') ? require('./store-schema.js') : global.PMA.storeSchema;

    // 明細行の項目ID（FieldError に設定する接頭辞）
    const FIELD_ID_SALES_PRODUCT_CODE = 'sales-product-code';
    const FIELD_ID_SALES_QUANTITY = 'sales-quantity';

    // 保存形式の日時のうち、日付が占める文字数（YYYY-MM-DD）
    const STORED_DATE_LENGTH = 10;
    // 10進数への変換に使う基数
    const DECIMAL_RADIX = 10;

    /**
     * F-07 商品に売上が存在するかを判定する。
     * エラーの経路が無いため ActionResult を返さない。
     * @param {object[]} sales 売上レコードの配列
     * @param {string} productCode 3桁ゼロ埋めの商品コード
     * @returns {boolean} 売上が1件以上あれば true
     */
    function hasSalesOfProduct(sales, productCode) {
        return sales.some(function (row) {
            return row.productCode === productCode;
        });
    }

    /**
     * F-08 指定日の売上明細を取得する。
     * @param {object[]} sales 売上レコードの配列（全期間）
     * @param {object[]} products 商品レコードの配列（論理削除済みを含む全件）
     * @param {string} salesDate 保存形式の日付
     * @returns {object} ActionResult。data は { rows: SalesDetailRow の配列 }
     */
    function findSalesDetailRowsByDate(sales, products, salesDate) {
        const sameDateSales = sales.filter(function (row) {
            return row.salesDate === salesDate;
        });
        const sellingSales = sameDateSales.filter(function (row) {
            return products.some(function (product) {
                return product.productCode === row.productCode && product.deleteDatetime === null;
            });
        });
        const sortedSales = sellingSales.slice().sort(function (left, right) {
            if (left.productCode < right.productCode) {
                return -1;
            }
            if (left.productCode > right.productCode) {
                return 1;
            }
            return 0;
        });
        const rows = sortedSales.map(function (row, index) {
            return {
                rowIndex: index,
                productCode: row.productCode,
                quantity: String(row.quantity)
            };
        });
        if (rows.length === 0) {
            return result.createSuccessResult('I-006', {}, { rows: [] });
        }
        return result.createSuccessResult(null, {}, { rows });
    }

    /**
     * F-09 当日の売上を明細行で置き換える。
     * @param {object[]} sales 売上レコードの配列（全期間）
     * @param {object[]} products 商品レコードの配列（論理削除済みを含む全件）
     * @param {object[]} rows SalesDetailRow の配列。0件でもよい
     * @param {string} now 保存形式の日時文字列
     * @returns {object} ActionResult
     */
    function registerDailySales(sales, products, rows, now) {
        const targetSalesDate = now.slice(0, STORED_DATE_LENGTH);
        const sortedRows = rows.slice().sort(function (left, right) {
            return left.rowIndex - right.rowIndex;
        });

        const trimmedRows = [];
        const productCodeErrors = [];
        const quantityErrors = [];

        sortedRows.forEach(function (row) {
            const productCodeResult = validation.validateSelectedProductCode(
                FIELD_ID_SALES_PRODUCT_CODE, row.rowIndex, row.productCode
            );
            let productCodeError = productCodeResult.error;
            if (productCodeError === null) {
                const isSelling = products.some(function (product) {
                    return product.productCode === productCodeResult.value && product.deleteDatetime === null;
                });
                if (!isSelling) {
                    productCodeError = result.createFieldError(
                        FIELD_ID_SALES_PRODUCT_CODE, row.rowIndex, 'E-207', {}
                    );
                }
            }
            const quantityResult = validation.validateQuantity(
                FIELD_ID_SALES_QUANTITY, row.rowIndex, row.quantity
            );
            trimmedRows.push({
                rowIndex: row.rowIndex,
                productCode: productCodeResult.value,
                quantity: quantityResult.value
            });
            productCodeErrors.push(productCodeError);
            quantityErrors.push(quantityResult.error);
        });

        // 商品名のエラーが無い行だけを対象に、商品コードの重複を判定する
        const seenProductCodes = [];
        trimmedRows.forEach(function (row, index) {
            if (productCodeErrors[index] !== null) {
                return;
            }
            if (seenProductCodes.indexOf(row.productCode) >= 0) {
                productCodeErrors[index] = result.createFieldError(
                    FIELD_ID_SALES_PRODUCT_CODE, row.rowIndex, 'E-107', {}
                );
                return;
            }
            seenProductCodes.push(row.productCode);
        });

        const errors = [];
        trimmedRows.forEach(function (row, index) {
            if (productCodeErrors[index] !== null) {
                errors.push(productCodeErrors[index]);
            }
            if (quantityErrors[index] !== null) {
                errors.push(quantityErrors[index]);
            }
        });
        if (errors.length > 0) {
            return result.createValidationErrorResult(errors, { trimmedRows });
        }

        const otherSales = sales.filter(function (row) {
            return row.salesDate !== targetSalesDate;
        });
        if (otherSales.length + trimmedRows.length > constants.SALES_MAX_COUNT) {
            return result.createErrorResult(
                'E-208', { maxCount: constants.SALES_MAX_COUNT }, { trimmedRows }
            );
        }

        // 登録日時を引き継ぐため、置き換えより前に当日分の既存売上を退避する
        const existingSales = sales.filter(function (row) {
            return row.salesDate === targetSalesDate;
        });

        const registeredSales = trimmedRows.map(function (row) {
            const existing = existingSales.find(function (candidate) {
                return candidate.productCode === row.productCode;
            });
            return {
                salesDate: targetSalesDate,
                productCode: row.productCode,
                quantity: parseInt(row.quantity, DECIMAL_RADIX),
                registerDatetime: (existing === undefined) ? now : existing.registerDatetime,
                updateDatetime: now
            };
        });

        const nextSales = storeSchema.sortSales(otherSales.concat(registeredSales));
        return result.createSuccessResult('I-004', {}, { sales: nextSales, trimmedRows });
    }

    const exported = {
        hasSalesOfProduct,
        findSalesDetailRowsByDate,
        registerDailySales
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = exported;
    } else {
        global.PMA = global.PMA || {};
        global.PMA.salesLogic = exported;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
