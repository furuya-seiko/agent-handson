// 処理結果オブジェクト（ActionResult / FieldError）を生成する。
// 業務ロジックと保存領域アクセスは、例外を投げずに本ファイルの生成関数が返す値で結果を伝える。

(function (global) {
    'use strict';

    /**
     * 成功の ActionResult を生成する。
     * @param {string|null} messageID 表示するメッセージのID。無い場合は null
     * @param {object} [messageParams] メッセージに埋め込む値
     * @param {object|null} [data] 処理結果の付随データ
     * @returns {object} ActionResult
     */
    function createSuccessResult(messageID, messageParams, data) {
        return {
            isSuccess: true,
            messageID: (messageID === undefined) ? null : messageID,
            messageParams: (messageParams === undefined) ? {} : messageParams,
            errors: [],
            data: (data === undefined) ? null : data
        };
    }

    /**
     * 業務エラーの ActionResult を生成する。
     * @param {string} messageID 表示するメッセージのID
     * @param {object} [messageParams] メッセージに埋め込む値
     * @param {object|null} [data] エラー時にも呼び出し側が必要とする付随データ
     * @returns {object} ActionResult
     */
    function createErrorResult(messageID, messageParams, data) {
        return {
            isSuccess: false,
            messageID,
            messageParams: (messageParams === undefined) ? {} : messageParams,
            errors: [],
            data: (data === undefined) ? null : data
        };
    }

    /**
     * 入力チェックエラーの ActionResult を生成する。
     * @param {object[]} errors FieldError の配列
     * @param {object|null} [data] 画面へ再表示するための付随データ
     * @returns {object} ActionResult
     */
    function createValidationErrorResult(errors, data) {
        return {
            isSuccess: false,
            messageID: null,
            messageParams: {},
            errors,
            data: (data === undefined) ? null : data
        };
    }

    /**
     * 入力チェックエラー1件（FieldError）を生成する。
     * @param {string} fieldID エラーになった画面項目の項目ID
     * @param {number|null} rowIndex 明細行の場合は0始まりの行番号。明細以外は null
     * @param {string} messageID メッセージID
     * @param {object} [messageParams] メッセージに埋め込む値
     * @returns {object} FieldError
     */
    function createFieldError(fieldID, rowIndex, messageID, messageParams) {
        return {
            fieldID,
            rowIndex,
            messageID,
            messageParams: (messageParams === undefined) ? {} : messageParams
        };
    }

    const exported = {
        createSuccessResult,
        createErrorResult,
        createValidationErrorResult,
        createFieldError
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = exported;
    } else {
        global.PMA = global.PMA || {};
        global.PMA.result = exported;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
