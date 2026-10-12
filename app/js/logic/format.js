// 表示形式の整形、HTMLエスケープ、CSVエスケープを行う。
// 画面・CSVへ値を出力する処理は、必ず本ファイルの関数を通す。

(function (global) {
    'use strict';
    const constants = (typeof require === 'function') ? require('./constants.js') : global.PMA.constants;

    // 桁区切りを入れる間隔（3桁ごと）
    const COMMA_GROUP_SIZE = 3;
    // 保存形式の日時のうち、日付が占める文字数（YYYY-MM-DD）
    const STORED_DATE_LENGTH = 10;

    /**
     * 数値の商品コードを3桁ゼロ埋めの文字列にする。
     * @param {number} codeNumber 商品コードの数値
     * @returns {string} 3桁ゼロ埋めの商品コード
     */
    function padProductCode(codeNumber) {
        return String(codeNumber).padStart(constants.PRODUCT_CODE_LENGTH, '0');
    }

    /**
     * 0以上の整数を3桁カンマ区切りの文字列にする。
     * @param {number} value 0以上の整数
     * @returns {string} 3桁カンマ区切りの文字列
     */
    function formatNumberWithComma(value) {
        const digits = String(value);
        let formatted = '';
        for (let index = 0; index < digits.length; index += 1) {
            // 先頭以外で、残りの桁数が3の倍数になる位置にカンマを入れる
            if (index > 0 && (digits.length - index) % COMMA_GROUP_SIZE === 0) {
                formatted += ',';
            }
            formatted += digits[index];
        }
        return formatted;
    }

    /**
     * 0以上の整数を通貨表示の文字列にする。
     * @param {number} value 0以上の整数
     * @returns {string} 通貨記号付きの3桁カンマ区切り文字列
     */
    function formatCurrency(value) {
        return constants.CURRENCY_SYMBOL + formatNumberWithComma(value);
    }

    /**
     * 保存形式の日付を表示形式にする。
     * @param {string} storedDate 保存形式の日付（YYYY-MM-DD）
     * @returns {string} 表示形式の日付（YYYY/MM/DD）
     */
    function formatDateForDisplay(storedDate) {
        return String(storedDate).split('-').join('/');
    }

    /**
     * 保存形式の日時を表示形式にする。時刻部分は変換しない。
     * @param {string} storedDatetime 保存形式の日時（YYYY-MM-DD HH:mm:ss）
     * @returns {string} 表示形式の日時（YYYY/MM/DD HH:mm:ss）
     */
    function formatDatetimeForDisplay(storedDatetime) {
        const value = String(storedDatetime);
        const datePart = value.slice(0, STORED_DATE_LENGTH);
        const timePart = value.slice(STORED_DATE_LENGTH);
        return formatDateForDisplay(datePart) + timePart;
    }

    /**
     * 入力形式の年月を保存形式にする。
     * @param {string} inputYearMonth 入力形式の年月（YYYY/MM）
     * @returns {string} 保存形式の年月（YYYY-MM）
     */
    function formatYearMonthForStore(inputYearMonth) {
        return String(inputYearMonth).split('/').join('-');
    }

    /**
     * null または undefined を空文字に置き換える。
     * @param {*} value 対象の値
     * @returns {string} 値が無い場合は空文字、それ以外は文字列に変換した値
     */
    function toEmptyStringIfNull(value) {
        if (value === null || value === undefined) {
            return constants.EMPTY_DISPLAY_VALUE;
        }
        return String(value);
    }

    /**
     * HTMLの特殊文字をエスケープする。
     * @param {*} value 対象の値
     * @returns {string} エスケープ後の文字列
     */
    function escapeHTML(value) {
        if (value === null || value === undefined) {
            return '';
        }
        // アンパサンドを最初に置換しないと、後続の置換結果が二重に変換される
        return String(value)
            .split('&').join('&amp;')
            .split('<').join('&lt;')
            .split('>').join('&gt;')
            .split('"').join('&quot;')
            .split("'").join('&#39;');
    }

    /**
     * CSVの1項目をエスケープし、ダブルクォートで囲む。
     * @param {*} value 対象の値
     * @returns {string} エスケープ後の文字列
     */
    function escapeCSVField(value) {
        let fieldValue = (value === null || value === undefined) ? '' : String(value);
        // 表計算ソフトで数式として解釈される先頭文字を無害化する
        if (constants.CSV_FORMULA_PREFIX_CHARACTERS.indexOf(fieldValue.slice(0, 1)) >= 0) {
            fieldValue = constants.CSV_FORMULA_ESCAPE_PREFIX + fieldValue;
        }
        fieldValue = fieldValue.split('"').join('""');
        return '"' + fieldValue + '"';
    }

    const exported = {
        padProductCode,
        formatNumberWithComma,
        formatCurrency,
        formatDateForDisplay,
        formatDatetimeForDisplay,
        formatYearMonthForStore,
        toEmptyStringIfNull,
        escapeHTML,
        escapeCSVField
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = exported;
    } else {
        global.PMA = global.PMA || {};
        global.PMA.format = exported;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
