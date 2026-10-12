// 画面へ出力する HTML 文字列を組み立てる。
// DOM に依存せず文字列を返す。埋め込む動的値には必ず escapeHTML() を適用する。

(function (global) {
    'use strict';
    const constants = (typeof require === 'function') ? require('../logic/constants.js') : global.PMA.constants;
    const format = (typeof require === 'function') ? require('../logic/format.js') : global.PMA.format;

    /**
     * メッセージ一覧の HTML を組み立てる。
     * @param {object[]} messages { messageType, text } の配列
     * @returns {string} HTML 文字列。配列が空なら空文字
     */
    function renderMessageList(messages) {
        if (messages.length === 0) {
            return '';
        }
        const items = messages.map(function (message) {
            return '<li class="message message--' + message.messageType + '">'
                + format.escapeHTML(message.text) + '</li>';
        }).join('');
        return '<ul class="message-list">' + items + '</ul>';
    }

    /**
     * 商品検索結果の行の HTML を組み立てる。
     * @param {object[]} products 商品レコードの配列
     * @returns {string} tr 要素を並べた HTML 文字列。配列が空なら空文字
     */
    function renderProductSearchRows(products) {
        return products.map(function (product) {
            const productCode = format.escapeHTML(product.productCode);
            return '<tr>'
                + '<td>' + productCode + '</td>'
                + '<td>' + format.escapeHTML(product.productName) + '</td>'
                + '<td class="number">' + format.escapeHTML(format.formatCurrency(product.price)) + '</td>'
                + '<td><button type="button" id="button-edit-' + productCode + '"'
                + ' class="button-edit" data-product-code="' + productCode + '">編集</button></td>'
                + '</tr>';
        }).join('');
    }

    /**
     * 商品ドロップダウンの選択肢の HTML を組み立てる。
     * @param {object[]} sellingProducts 販売中の商品レコードの配列
     * @param {string} selectedProductCode 選択されている商品コード。未選択は空文字
     * @returns {string} option 要素を並べた HTML 文字列
     */
    function renderProductOptions(sellingProducts, selectedProductCode) {
        const isSelectedInList = sellingProducts.some(function (product) {
            return product.productCode === selectedProductCode;
        });
        const unselectedOption = '<option value=""'
            + (isSelectedInList ? '' : ' selected')
            + '>' + constants.PRODUCT_OPTION_UNSELECTED_LABEL + '</option>';
        const productOptions = sellingProducts.map(function (product) {
            const isSelected = (product.productCode === selectedProductCode);
            return '<option value="' + format.escapeHTML(product.productCode) + '"'
                + (isSelected ? ' selected' : '')
                + '>' + format.escapeHTML(product.productName) + '</option>';
        }).join('');
        return unselectedOption + productOptions;
    }

    /**
     * 売上明細行の HTML を組み立てる。
     * @param {object[]} rows SalesDetailRow の配列
     * @param {object[]} sellingProducts 販売中の商品レコードの配列
     * @returns {string} tr 要素を並べた HTML 文字列。配列が空なら空文字
     */
    function renderSalesDetailRows(rows, sellingProducts) {
        return rows.map(function (row) {
            const rowIndex = String(row.rowIndex);
            return '<tr>'
                + '<td>' + String(row.rowIndex + 1) + '</td>'
                + '<td><select id="sales-product-code-' + rowIndex + '" class="sales-product-code"'
                + ' data-row-index="' + rowIndex + '">'
                + renderProductOptions(sellingProducts, row.productCode)
                + '</select></td>'
                + '<td><input type="text" inputmode="numeric" id="sales-quantity-' + rowIndex + '"'
                + ' class="sales-quantity" data-row-index="' + rowIndex + '"'
                + ' value="' + format.escapeHTML(row.quantity) + '"></td>'
                + '<td><button type="button" id="button-remove-row-' + rowIndex + '"'
                + ' class="button-remove-row" data-row-index="' + rowIndex + '">削除</button></td>'
                + '</tr>';
        }).join('');
    }

    const exported = {
        renderMessageList,
        renderProductSearchRows,
        renderProductOptions,
        renderSalesDetailRows
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = exported;
    } else {
        global.PMA = global.PMA || {};
        global.PMA.render = exported;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
