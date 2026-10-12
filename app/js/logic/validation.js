// 入力チェック（空白除去・文字数・数値判定・項目別の検証）を行う。
// 検証関数は、エラーの有無にかかわらず空白除去後の値を ValidationResult.value に設定して返す。

(function (global) {
    'use strict';
    const constants = (typeof require === 'function') ? require('./constants.js') : global.PMA.constants;
    const result = (typeof require === 'function') ? require('./result.js') : global.PMA.result;

    // メッセージに埋め込む項目名
    const LABEL_PRODUCT_NAME = '商品名';
    const LABEL_PRICE = '単価';
    const LABEL_QUANTITY = '数量';
    const LABEL_YEAR_MONTH = '年月';

    // 10進数への変換に使う基数
    const DECIMAL_RADIX = 10;

    /**
     * ValidationResult を組み立てる。
     * @param {string} value 空白除去後の値
     * @param {number|null} numberValue 数値項目で検証に成功した場合の数値
     * @param {object|null} error FieldError。エラーが無い場合は null
     * @returns {object} ValidationResult
     */
    function createValidationResult(value, numberValue, error) {
        return { value, numberValue, error };
    }

    /**
     * 文字列の前後にある空白類を除去する。
     * @param {*} value 対象の値
     * @returns {string} 除去後の文字列。文字列でない場合は空文字
     */
    function trimInputValue(value) {
        if (typeof value !== 'string') {
            return '';
        }
        return value.replace(constants.TRIM_PATTERN, '');
    }

    /**
     * 文字列の長さをコードポイント数で数える。
     * @param {string} value 対象の文字列
     * @returns {number} コードポイント数
     */
    function countCharacters(value) {
        return Array.from(String(value)).length;
    }

    /**
     * 半角数字のみで構成される長さ1以上の文字列かを判定する。
     * @param {string} value 対象の文字列
     * @returns {boolean} 半角数字のみなら true
     */
    function isDigitsOnly(value) {
        return constants.DIGITS_PATTERN.test(String(value));
    }

    /**
     * 数値項目を検証する。必須・形式・範囲の順に判定し、最初の1件のみを返す。
     * @param {string} fieldID 項目ID
     * @param {number|null} rowIndex 明細行の場合は0始まりの行番号
     * @param {*} value 入力値
     * @param {string} label メッセージに埋め込む項目名
     * @param {number} min 下限
     * @param {number} max 上限
     * @returns {object} ValidationResult
     */
    function validateNumberField(fieldID, rowIndex, value, label, min, max) {
        const trimmedValue = trimInputValue(value);
        if (trimmedValue === '') {
            return createValidationResult(trimmedValue, null,
                result.createFieldError(fieldID, rowIndex, 'E-101', { label }));
        }
        if (!isDigitsOnly(trimmedValue)) {
            return createValidationResult(trimmedValue, null,
                result.createFieldError(fieldID, rowIndex, 'E-104', { label }));
        }
        const numberValue = parseInt(trimmedValue, DECIMAL_RADIX);
        if (numberValue < min || numberValue > max) {
            return createValidationResult(trimmedValue, null,
                result.createFieldError(fieldID, rowIndex, 'E-105', { label, min, max }));
        }
        return createValidationResult(trimmedValue, numberValue, null);
    }

    /**
     * 商品名を検証する。
     * @param {string} fieldID 項目ID
     * @param {number|null} rowIndex 明細行の場合は0始まりの行番号
     * @param {*} value 入力値
     * @returns {object} ValidationResult
     */
    function validateProductName(fieldID, rowIndex, value) {
        const trimmedValue = trimInputValue(value);
        if (trimmedValue === '') {
            return createValidationResult(trimmedValue, null,
                result.createFieldError(fieldID, rowIndex, 'E-101', { label: LABEL_PRODUCT_NAME }));
        }
        if (countCharacters(trimmedValue) > constants.PRODUCT_NAME_MAX_LENGTH) {
            return createValidationResult(trimmedValue, null,
                result.createFieldError(fieldID, rowIndex, 'E-103', {
                    label: LABEL_PRODUCT_NAME,
                    maxLength: constants.PRODUCT_NAME_MAX_LENGTH
                }));
        }
        return createValidationResult(trimmedValue, null, null);
    }

    /**
     * 検索条件の商品名を検証する。空文字は絞り込みなしを意味するため必須チェックを行わない。
     * @param {string} fieldID 項目ID
     * @param {*} value 入力値
     * @returns {object} ValidationResult
     */
    function validateSearchProductName(fieldID, value) {
        const trimmedValue = trimInputValue(value);
        if (countCharacters(trimmedValue) > constants.SEARCH_PRODUCT_NAME_MAX_LENGTH) {
            return createValidationResult(trimmedValue, null,
                result.createFieldError(fieldID, null, 'E-103', {
                    label: LABEL_PRODUCT_NAME,
                    maxLength: constants.SEARCH_PRODUCT_NAME_MAX_LENGTH
                }));
        }
        return createValidationResult(trimmedValue, null, null);
    }

    /**
     * 単価を検証する。
     * @param {string} fieldID 項目ID
     * @param {number|null} rowIndex 明細行の場合は0始まりの行番号
     * @param {*} value 入力値
     * @returns {object} ValidationResult
     */
    function validatePrice(fieldID, rowIndex, value) {
        return validateNumberField(fieldID, rowIndex, value, LABEL_PRICE,
            constants.PRICE_MIN, constants.PRICE_MAX);
    }

    /**
     * 数量を検証する。
     * @param {string} fieldID 項目ID
     * @param {number|null} rowIndex 明細行の場合は0始まりの行番号
     * @param {*} value 入力値
     * @returns {object} ValidationResult
     */
    function validateQuantity(fieldID, rowIndex, value) {
        return validateNumberField(fieldID, rowIndex, value, LABEL_QUANTITY,
            constants.QUANTITY_MIN, constants.QUANTITY_MAX);
    }

    /**
     * ドロップダウンで選択された商品コードを検証する。
     * 商品マスタに存在するか、論理削除されていないかは本関数では判定しない。
     * @param {string} fieldID 項目ID
     * @param {number|null} rowIndex 明細行の場合は0始まりの行番号
     * @param {*} value 選択値
     * @returns {object} ValidationResult
     */
    function validateSelectedProductCode(fieldID, rowIndex, value) {
        const trimmedValue = trimInputValue(value);
        if (trimmedValue === '') {
            return createValidationResult(trimmedValue, null,
                result.createFieldError(fieldID, rowIndex, 'E-102', { label: LABEL_PRODUCT_NAME }));
        }
        if (!constants.PRODUCT_CODE_PATTERN.test(trimmedValue)) {
            return createValidationResult(trimmedValue, null,
                result.createFieldError(fieldID, rowIndex, 'E-102', { label: LABEL_PRODUCT_NAME }));
        }
        return createValidationResult(trimmedValue, null, null);
    }

    /**
     * 年月を検証する。形式判定に年の範囲を内包するため、範囲チェックは行わない。
     * @param {string} fieldID 項目ID
     * @param {*} value 入力値
     * @returns {object} ValidationResult
     */
    function validateYearMonth(fieldID, value) {
        const trimmedValue = trimInputValue(value);
        if (trimmedValue === '') {
            return createValidationResult(trimmedValue, null,
                result.createFieldError(fieldID, null, 'E-101', { label: LABEL_YEAR_MONTH }));
        }
        if (!constants.YEAR_MONTH_PATTERN.test(trimmedValue)) {
            return createValidationResult(trimmedValue, null,
                result.createFieldError(fieldID, null, 'E-106', { label: LABEL_YEAR_MONTH }));
        }
        return createValidationResult(trimmedValue, null, null);
    }

    const exported = {
        trimInputValue,
        countCharacters,
        isDigitsOnly,
        validateProductName,
        validateSearchProductName,
        validatePrice,
        validateQuantity,
        validateSelectedProductCode,
        validateYearMonth
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = exported;
    } else {
        global.PMA = global.PMA || {};
        global.PMA.validation = exported;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
