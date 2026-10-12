// 起動時に投入する初期データ（商品9件・売上11件）の具体値を定義する。
// 日時はすべて固定値であり、現在日時から生成しない。

(function (global) {
    'use strict';

    /**
     * 初期データの商品マスタを生成する。呼び出しのたびに新しい配列とオブジェクトを返す。
     * @returns {object[]} 商品レコードの配列（9件）
     */
    function createInitialProducts() {
        return [
            {
                productCode: '001',
                productName: 'デスクトップPC',
                price: 150000,
                registerDatetime: '2026-04-01 09:00:00',
                updateDatetime: '2026-04-01 09:00:00',
                deleteDatetime: null
            },
            {
                productCode: '002',
                productName: 'ノートPC',
                price: 120000,
                registerDatetime: '2026-04-01 09:00:00',
                updateDatetime: '2026-04-01 09:00:00',
                deleteDatetime: null
            },
            {
                productCode: '003',
                productName: 'タブレット',
                price: 45000,
                registerDatetime: '2026-04-01 09:00:00',
                updateDatetime: '2026-04-01 09:00:00',
                deleteDatetime: null
            },
            {
                productCode: '004',
                productName: 'スマートフォン',
                price: 98000,
                registerDatetime: '2026-04-01 09:00:00',
                updateDatetime: '2026-04-01 09:00:00',
                deleteDatetime: null
            },
            {
                productCode: '005',
                productName: '液晶モニター',
                price: 23800,
                registerDatetime: '2026-04-01 09:00:00',
                updateDatetime: '2026-04-01 09:00:00',
                deleteDatetime: null
            },
            {
                productCode: '006',
                productName: 'ワイヤレスマウス',
                price: 2980,
                registerDatetime: '2026-04-01 09:00:00',
                updateDatetime: '2026-04-01 09:00:00',
                deleteDatetime: null
            },
            {
                productCode: '007',
                productName: '24"ワイド, 保護フィルム',
                price: 1200,
                registerDatetime: '2026-04-01 09:00:00',
                updateDatetime: '2026-04-01 09:00:00',
                deleteDatetime: null
            },
            {
                productCode: '008',
                productName: '<script>alert(1)</script>マット',
                price: 800,
                registerDatetime: '2026-04-01 09:00:00',
                updateDatetime: '2026-04-20 10:00:00',
                deleteDatetime: '2026-04-20 10:00:00'
            },
            {
                productCode: '009',
                productName: 'ノートPC Pro',
                price: 135000,
                registerDatetime: '2026-04-01 09:00:00',
                updateDatetime: '2026-04-01 09:00:00',
                deleteDatetime: null
            }
        ];
    }

    /**
     * 初期データの売上テーブルを生成する。呼び出しのたびに新しい配列とオブジェクトを返す。
     * @returns {object[]} 売上レコードの配列（11件）
     */
    function createInitialSales() {
        return [
            {
                salesDate: '2026-04-10',
                productCode: '001',
                quantity: 2,
                registerDatetime: '2026-04-10 20:00:00',
                updateDatetime: '2026-04-10 20:00:00'
            },
            {
                salesDate: '2026-04-10',
                productCode: '002',
                quantity: 1,
                registerDatetime: '2026-04-10 20:00:00',
                updateDatetime: '2026-04-10 20:00:00'
            },
            {
                salesDate: '2026-04-10',
                productCode: '003',
                quantity: 3,
                registerDatetime: '2026-04-10 20:00:00',
                updateDatetime: '2026-04-10 20:00:00'
            },
            {
                salesDate: '2026-04-11',
                productCode: '001',
                quantity: 1,
                registerDatetime: '2026-04-11 20:00:00',
                updateDatetime: '2026-04-11 20:00:00'
            },
            {
                salesDate: '2026-04-11',
                productCode: '005',
                quantity: 4,
                registerDatetime: '2026-04-11 20:00:00',
                updateDatetime: '2026-04-11 20:00:00'
            },
            {
                salesDate: '2026-04-11',
                productCode: '008',
                quantity: 2,
                registerDatetime: '2026-04-11 20:00:00',
                updateDatetime: '2026-04-11 20:00:00'
            },
            {
                salesDate: '2026-05-08',
                productCode: '002',
                quantity: 2,
                registerDatetime: '2026-05-08 20:00:00',
                updateDatetime: '2026-05-08 20:00:00'
            },
            {
                salesDate: '2026-05-08',
                productCode: '004',
                quantity: 1,
                registerDatetime: '2026-05-08 20:00:00',
                updateDatetime: '2026-05-08 20:00:00'
            },
            {
                salesDate: '2026-05-09',
                productCode: '003',
                quantity: 1,
                registerDatetime: '2026-05-09 20:00:00',
                updateDatetime: '2026-05-09 20:00:00'
            },
            {
                salesDate: '2026-05-09',
                productCode: '006',
                quantity: 10,
                registerDatetime: '2026-05-09 20:00:00',
                updateDatetime: '2026-05-09 20:00:00'
            },
            {
                salesDate: '2026-05-09',
                productCode: '009',
                quantity: 1,
                registerDatetime: '2026-05-09 20:00:00',
                updateDatetime: '2026-05-09 20:00:00'
            }
        ];
    }

    const exported = {
        createInitialProducts,
        createInitialSales
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = exported;
    } else {
        global.PMA = global.PMA || {};
        global.PMA.seedData = exported;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
