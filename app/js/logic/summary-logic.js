// 商品別売上集計と、集計結果からのCSV文字列生成を行う業務ロジック。
// DOM・保存領域に一切依存せず、保存データを引数で受け取り結果を戻り値で返す。

(function (global) {
    'use strict';
    const constants = (typeof require === 'function') ? require('./constants.js') : global.PMA.constants;
    const format = (typeof require === 'function') ? require('./format.js') : global.PMA.format;
    const result = (typeof require === 'function') ? require('./result.js') : global.PMA.result;
    const validation = (typeof require === 'function') ? require('./validation.js') : global.PMA.validation;

    // 画面項目ID（FieldError に設定する）
    const FIELD_ID_CSV_YEAR_MONTH = 'csv-year-month';
    // 保存形式の年月が占める文字数（YYYY-MM）
    const STORED_YEAR_MONTH_LENGTH = 7;

    /**
     * 商品コードの昇順に並べ替えた新しい配列を返す。
     * @param {object[]} products 商品レコードの配列
     * @returns {object[]} 並べ替えた新しい配列
     */
    function sortByProductCode(products) {
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
     * 対象商品と売上から SummaryRow を組み立てる。
     * @param {object[]} targetProducts 集計対象の商品レコードの配列（商品コードの昇順）
     * @param {object[]} targetSales 集計対象の売上レコードの配列
     * @returns {object[]} SummaryRow の配列
     */
    function buildSummaryRows(targetProducts, targetSales) {
        return targetProducts.map(function (product) {
            const quantity = targetSales.reduce(function (total, row) {
                return (row.productCode === product.productCode) ? total + row.quantity : total;
            }, 0);
            return {
                productCode: product.productCode,
                productName: product.productName,
                price: product.price,
                quantity,
                amount: product.price * quantity
            };
        });
    }

    /**
     * F-10 全期間の商品別売上集計を行う。売上が無い販売中の商品も対象に含める。
     * @param {object[]} products 商品レコードの配列（論理削除済みを含む全件）
     * @param {object[]} sales 売上レコードの配列（全期間）
     * @returns {object} ActionResult。data は { rows: SummaryRow の配列 }
     */
    function summarizeSalesByProduct(products, sales) {
        const targetProducts = products.filter(function (product) {
            if (product.deleteDatetime === null) {
                return true;
            }
            // 論理削除済みでも、売上が存在する商品は集計対象に含める
            return sales.some(function (row) {
                return row.productCode === product.productCode;
            });
        });
        const rows = buildSummaryRows(sortByProductCode(targetProducts), sales);
        if (rows.length === 0) {
            return result.createErrorResult('E-206', {}, { rows: [] });
        }
        return result.createSuccessResult(null, {}, { rows });
    }

    /**
     * F-11 指定年月の商品別売上集計を行う。指定年月に売上がある商品のみを対象とする。
     * @param {object[]} products 商品レコードの配列（論理削除済みを含む全件）
     * @param {object[]} sales 売上レコードの配列（全期間）
     * @param {string} inputYearMonth 画面から取得した生の入力値（YYYY/MM 形式を期待する）
     * @returns {object} ActionResult
     */
    function summarizeSalesByProductForMonth(products, sales, inputYearMonth) {
        const yearMonthResult = validation.validateYearMonth(FIELD_ID_CSV_YEAR_MONTH, inputYearMonth);
        if (yearMonthResult.error !== null) {
            return result.createValidationErrorResult([yearMonthResult.error], {
                rows: [],
                yearMonth: '',
                trimmedYearMonth: yearMonthResult.value
            });
        }
        const storedYearMonth = format.formatYearMonthForStore(yearMonthResult.value);
        const targetSales = sales.filter(function (row) {
            return row.salesDate.slice(0, STORED_YEAR_MONTH_LENGTH) === storedYearMonth;
        });
        const targetProducts = products.filter(function (product) {
            return targetSales.some(function (row) {
                return row.productCode === product.productCode;
            });
        });
        const rows = buildSummaryRows(sortByProductCode(targetProducts), targetSales);
        if (rows.length === 0) {
            return result.createErrorResult('E-206', {}, {
                rows: [],
                yearMonth: storedYearMonth,
                trimmedYearMonth: yearMonthResult.value
            });
        }
        return result.createSuccessResult(null, {}, {
            rows,
            yearMonth: storedYearMonth,
            trimmedYearMonth: yearMonthResult.value
        });
    }

    /**
     * F-12 集計結果から CSV 文字列を生成する。先頭に BOM を付ける。
     * @param {object[]} summaryRows SummaryRow の配列
     * @returns {string} CSV 文字列
     */
    function buildSummaryCSV(summaryRows) {
        const headerLine = constants.CSV_HEADER_COLUMNS.map(function (column) {
            return format.escapeCSVField(column);
        }).join(',');
        const dataLines = summaryRows.map(function (row) {
            return [
                format.escapeCSVField(row.productCode),
                format.escapeCSVField(row.productName),
                format.escapeCSVField(format.formatNumberWithComma(row.price)),
                format.escapeCSVField(String(row.quantity)),
                format.escapeCSVField(format.formatNumberWithComma(row.amount))
            ].join(',');
        });
        const lines = [headerLine].concat(dataLines);
        // 最終行の末尾にも改行を付ける
        return constants.CSV_BOM + lines.join(constants.CSV_NEWLINE) + constants.CSV_NEWLINE;
    }

    const exported = {
        summarizeSalesByProduct,
        summarizeSalesByProductForMonth,
        buildSummaryCSV
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = exported;
    } else {
        global.PMA = global.PMA || {};
        global.PMA.summaryLogic = exported;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
