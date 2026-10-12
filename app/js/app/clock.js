// 現在日時の取得元。テスト時は固定値へ差し替えられる。
// 他のファイルで new Date() を直接呼んではならない。

(function (global) {
    'use strict';

    // 保存形式の日時のうち、日付が占める文字数（YYYY-MM-DD）
    const STORED_DATE_LENGTH = 10;
    // 月日・時分秒のゼロ埋め桁数
    const TIME_PART_LENGTH = 2;

    let fixedDatetime = null;

    /**
     * 数値を2桁のゼロ埋め文字列にする。
     * @param {number} value 対象の数値
     * @returns {string} ゼロ埋めした文字列
     */
    function padTimePart(value) {
        return String(value).padStart(TIME_PART_LENGTH, '0');
    }

    /**
     * 現在日時を保存形式の文字列で返す。
     * @returns {string} 保存形式の日時（YYYY-MM-DD HH:mm:ss）
     */
    function getCurrentDatetime() {
        if (fixedDatetime !== null) {
            return fixedDatetime;
        }
        const now = new Date();
        const datePart = now.getFullYear() + '-'
            + padTimePart(now.getMonth() + 1) + '-'
            + padTimePart(now.getDate());
        const timePart = padTimePart(now.getHours()) + ':'
            + padTimePart(now.getMinutes()) + ':'
            + padTimePart(now.getSeconds());
        return datePart + ' ' + timePart;
    }

    /**
     * 現在日付を保存形式の文字列で返す。現在日時から切り出すため、日付と時刻が食い違わない。
     * @returns {string} 保存形式の日付（YYYY-MM-DD）
     */
    function getCurrentDate() {
        return getCurrentDatetime().slice(0, STORED_DATE_LENGTH);
    }

    /**
     * 現在日時を固定値に差し替える（テスト用）。
     * @param {string} value 保存形式の日時文字列
     * @returns {void}
     */
    function setFixedDatetime(value) {
        fixedDatetime = value;
    }

    /**
     * 現在日時の固定を解除する（テスト用）。
     * @returns {void}
     */
    function clearFixedDatetime() {
        fixedDatetime = null;
    }

    const exported = {
        getCurrentDatetime,
        getCurrentDate,
        setFixedDatetime,
        clearFixedDatetime
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = exported;
    } else {
        global.PMA = global.PMA || {};
        global.PMA.clock = exported;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
