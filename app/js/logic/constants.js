// 商品管理システムで使用する定数の定義。
// 保存キー名・桁数上限・件数上限・正規表現・画面ID・CSVの設定値は、すべて本ファイルで1箇所に定義する。

(function (global) {
    'use strict';

    // 保存キー
    const STORAGE_KEY_PRODUCTS = 'pma.products';
    const STORAGE_KEY_SALES = 'pma.sales';
    const STORAGE_KEY_INITIALIZED = 'pma.initialized';
    const STORAGE_VALUE_INITIALIZED = 'true';
    const SESSION_KEY_FLASH_MESSAGE = 'pma.flashMessage';
    const SESSION_KEY_SEARCH_PRODUCT_NAME = 'pma.searchProductName';
    const SESSION_KEY_EDIT_PRODUCT_CODE = 'pma.editProductCode';

    // 桁・範囲
    const PRODUCT_CODE_LENGTH = 3;
    const PRODUCT_CODE_MIN = 1;
    const PRODUCT_CODE_MAX = 999;
    const PRODUCT_NAME_MAX_LENGTH = 50;
    const SEARCH_PRODUCT_NAME_MAX_LENGTH = 50;
    const PRICE_MIN = 1;
    const PRICE_MAX = 999999;
    const QUANTITY_MIN = 1;
    const QUANTITY_MAX = 9999;
    const SALES_DETAIL_MAX_ROWS = 999;
    const SALES_MAX_COUNT = 100000;

    // 形式判定
    const DIGITS_PATTERN = /^[0-9]+$/;
    const PRODUCT_CODE_PATTERN = /^[0-9]{3}$/;
    const STORED_DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
    const STORED_DATETIME_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$/;
    const YEAR_MONTH_PATTERN = /^(19[0-9]{2}|2[0-9]{3})\/(0[1-9]|1[0-2])$/;
    const TRIM_PATTERN = /^[\u0020\u3000\u0009\u000A\u000D]+|[\u0020\u3000\u0009\u000A\u000D]+$/g;

    // 表示・出力
    const CURRENCY_SYMBOL = '¥';
    const EMPTY_DISPLAY_VALUE = '';
    const CSV_BOM = '\uFEFF';
    const CSV_NEWLINE = '\u000D\u000A';
    const CSV_MIME_TYPE = 'text/csv';
    const CSV_HEADER_COLUMNS = ['商品コード', '商品名', '単価', '数量', '金額'];
    const CSV_FILE_NAME_ALL = 'product_sales_summary.csv';
    const CSV_FILE_NAME_MONTH_PREFIX = 'product_sales_summary_';
    const CSV_FILE_EXTENSION = '.csv';
    const CSV_FORMULA_PREFIX_CHARACTERS = ['\u003D', '\u002B', '\u002D', '\u0040', '\u0009', '\u000D'];
    const CSV_FORMULA_ESCAPE_PREFIX = '\u0027';

    // 画面
    const SCREEN_ID_PRODUCT_SEARCH = 'screen-product-search';
    const SCREEN_ID_PRODUCT_REGISTER = 'screen-product-register';
    const SCREEN_ID_PRODUCT_EDIT = 'screen-product-edit';
    const SCREEN_ID_SALES_REGISTER = 'screen-sales-register';
    const SCREEN_ID_CSV_DOWNLOAD = 'screen-csv-download';
    const MESSAGE_AREA_ID_PRODUCT_SEARCH = 'message-area-product-search';
    const MESSAGE_AREA_ID_PRODUCT_REGISTER = 'message-area-product-register';
    const MESSAGE_AREA_ID_PRODUCT_EDIT = 'message-area-product-edit';
    const MESSAGE_AREA_ID_SALES_REGISTER = 'message-area-sales-register';
    const MESSAGE_AREA_ID_CSV_DOWNLOAD = 'message-area-csv-download';

    // 画面IDからメッセージ領域IDを求める対応表。文字列置換で導出してはならない。
    const MESSAGE_AREA_ID_BY_SCREEN_ID = {
        [SCREEN_ID_PRODUCT_SEARCH]: MESSAGE_AREA_ID_PRODUCT_SEARCH,
        [SCREEN_ID_PRODUCT_REGISTER]: MESSAGE_AREA_ID_PRODUCT_REGISTER,
        [SCREEN_ID_PRODUCT_EDIT]: MESSAGE_AREA_ID_PRODUCT_EDIT,
        [SCREEN_ID_SALES_REGISTER]: MESSAGE_AREA_ID_SALES_REGISTER,
        [SCREEN_ID_CSV_DOWNLOAD]: MESSAGE_AREA_ID_CSV_DOWNLOAD
    };

    const ERROR_CLASS_NAME = 'is-error';
    const HIDDEN_CLASS_NAME = 'is-hidden';
    const PRODUCT_OPTION_UNSELECTED_LABEL = '選択してください';

    const exported = {
        STORAGE_KEY_PRODUCTS,
        STORAGE_KEY_SALES,
        STORAGE_KEY_INITIALIZED,
        STORAGE_VALUE_INITIALIZED,
        SESSION_KEY_FLASH_MESSAGE,
        SESSION_KEY_SEARCH_PRODUCT_NAME,
        SESSION_KEY_EDIT_PRODUCT_CODE,
        PRODUCT_CODE_LENGTH,
        PRODUCT_CODE_MIN,
        PRODUCT_CODE_MAX,
        PRODUCT_NAME_MAX_LENGTH,
        SEARCH_PRODUCT_NAME_MAX_LENGTH,
        PRICE_MIN,
        PRICE_MAX,
        QUANTITY_MIN,
        QUANTITY_MAX,
        SALES_DETAIL_MAX_ROWS,
        SALES_MAX_COUNT,
        DIGITS_PATTERN,
        PRODUCT_CODE_PATTERN,
        STORED_DATE_PATTERN,
        STORED_DATETIME_PATTERN,
        YEAR_MONTH_PATTERN,
        TRIM_PATTERN,
        CURRENCY_SYMBOL,
        EMPTY_DISPLAY_VALUE,
        CSV_BOM,
        CSV_NEWLINE,
        CSV_MIME_TYPE,
        CSV_HEADER_COLUMNS,
        CSV_FILE_NAME_ALL,
        CSV_FILE_NAME_MONTH_PREFIX,
        CSV_FILE_EXTENSION,
        CSV_FORMULA_PREFIX_CHARACTERS,
        CSV_FORMULA_ESCAPE_PREFIX,
        SCREEN_ID_PRODUCT_SEARCH,
        SCREEN_ID_PRODUCT_REGISTER,
        SCREEN_ID_PRODUCT_EDIT,
        SCREEN_ID_SALES_REGISTER,
        SCREEN_ID_CSV_DOWNLOAD,
        MESSAGE_AREA_ID_PRODUCT_SEARCH,
        MESSAGE_AREA_ID_PRODUCT_REGISTER,
        MESSAGE_AREA_ID_PRODUCT_EDIT,
        MESSAGE_AREA_ID_SALES_REGISTER,
        MESSAGE_AREA_ID_CSV_DOWNLOAD,
        MESSAGE_AREA_ID_BY_SCREEN_ID,
        ERROR_CLASS_NAME,
        HIDDEN_CLASS_NAME,
        PRODUCT_OPTION_UNSELECTED_LABEL
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = exported;
    } else {
        global.PMA = global.PMA || {};
        global.PMA.constants = exported;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
