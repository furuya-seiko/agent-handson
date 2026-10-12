// 画面状態（表示中の画面、明細一覧、排他制御用の更新日時）を保持する。
// DOM に依存せず、プレーンなオブジェクトとして状態を持つ。

(function (global) {
    'use strict';
    const constants = (typeof require === 'function') ? require('../logic/constants.js') : global.PMA.constants;
    const result = (typeof require === 'function') ? require('../logic/result.js') : global.PMA.result;

    // 明細行で値を設定できるフィールド名
    const EDITABLE_ROW_FIELD_NAMES = ['productCode', 'quantity'];

    /**
     * 画面状態の初期値を生成する。
     * @returns {object} ScreenState
     */
    function createInitialState() {
        return {
            currentScreenID: '',
            editingBaseUpdateDatetime: '',
            hasSalesOfEditingProduct: false,
            salesDetailRows: []
        };
    }

    /**
     * 表示中の画面IDを設定する。
     * @param {object} state ScreenState
     * @param {string} screenID 画面ID
     * @returns {object} 引数と同一の ScreenState
     */
    function setCurrentScreenID(state, screenID) {
        state.currentScreenID = screenID;
        return state;
    }

    /**
     * 商品変更・削除画面の作業状態を設定する。
     * @param {object} state ScreenState
     * @param {string} baseUpdateDatetime 楽観的排他制御の比較元となる更新日時
     * @param {boolean} hasSales 対象商品に売上があるか
     * @returns {object} 引数と同一の ScreenState
     */
    function setEditingContext(state, baseUpdateDatetime, hasSales) {
        state.editingBaseUpdateDatetime = baseUpdateDatetime;
        state.hasSalesOfEditingProduct = hasSales;
        return state;
    }

    /**
     * 売上明細の一覧を差し替える。
     * @param {object} state ScreenState
     * @param {object[]} rows SalesDetailRow の配列
     * @returns {object} 引数と同一の ScreenState
     */
    function setSalesDetailRows(state, rows) {
        state.salesDetailRows = rows;
        return state;
    }

    /**
     * 売上明細に空行を1行追加する。行数上限に達している場合は追加しない。
     * @param {object} state ScreenState
     * @returns {object} ActionResult。成功時の data は { state }
     */
    function addSalesDetailRow(state) {
        if (state.salesDetailRows.length >= constants.SALES_DETAIL_MAX_ROWS) {
            return result.createErrorResult('E-209', { maxRows: constants.SALES_DETAIL_MAX_ROWS });
        }
        state.salesDetailRows.push({
            rowIndex: state.salesDetailRows.length,
            productCode: '',
            quantity: ''
        });
        return result.createSuccessResult(null, {}, { state });
    }

    /**
     * 売上明細から1行削除し、行番号を振り直す。
     * @param {object} state ScreenState
     * @param {number} rowIndex 削除する行の0始まりの行番号
     * @returns {object} 引数と同一の ScreenState
     */
    function removeSalesDetailRow(state, rowIndex) {
        if (rowIndex < 0 || rowIndex >= state.salesDetailRows.length) {
            return state;
        }
        state.salesDetailRows.splice(rowIndex, 1);
        // 行番号と DOM 要素の id の対応を保つため、残った行を先頭から振り直す
        state.salesDetailRows.forEach(function (row, index) {
            row.rowIndex = index;
        });
        return state;
    }

    /**
     * 売上明細1行の値を設定する。
     * @param {object} state ScreenState
     * @param {number} rowIndex 0始まりの行番号
     * @param {string} fieldName 'productCode' または 'quantity'
     * @param {string} value 設定する値
     * @returns {object} 引数と同一の ScreenState
     */
    function setSalesDetailRowValue(state, rowIndex, fieldName, value) {
        if (rowIndex < 0 || rowIndex >= state.salesDetailRows.length) {
            return state;
        }
        if (EDITABLE_ROW_FIELD_NAMES.indexOf(fieldName) < 0) {
            return state;
        }
        state.salesDetailRows[rowIndex][fieldName] = value;
        return state;
    }

    const exported = {
        createInitialState,
        setCurrentScreenID,
        setEditingContext,
        setSalesDetailRows,
        addSalesDetailRow,
        removeSalesDetailRow,
        setSalesDetailRowValue
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = exported;
    } else {
        global.PMA = global.PMA || {};
        global.PMA.screenState = exported;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
