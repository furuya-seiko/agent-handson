// 商品の検索・登録・変更・削除・一覧取得を行う業務ロジック。
// DOM・保存領域に一切依存せず、保存データを引数で受け取り結果を戻り値で返す。

(function (global) {
    'use strict';
    const constants = (typeof require === 'function') ? require('./constants.js') : global.PMA.constants;
    const format = (typeof require === 'function') ? require('./format.js') : global.PMA.format;
    const result = (typeof require === 'function') ? require('./result.js') : global.PMA.result;
    const validation = (typeof require === 'function') ? require('./validation.js') : global.PMA.validation;
    const storeSchema = (typeof require === 'function') ? require('./store-schema.js') : global.PMA.storeSchema;
    const salesLogic = (typeof require === 'function') ? require('./sales-logic.js') : global.PMA.salesLogic;

    // 画面項目ID（FieldError に設定する）
    const FIELD_ID_REGISTER_PRODUCT_NAME = 'register-product-name';
    const FIELD_ID_REGISTER_PRICE = 'register-price';
    const FIELD_ID_EDIT_PRODUCT_NAME = 'edit-product-name';
    const FIELD_ID_EDIT_PRICE = 'edit-price';

    // 10進数への変換に使う基数
    const DECIMAL_RADIX = 10;

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
     * F-01 商品を検索する。論理削除済みの商品は対象外とする。
     * @param {object[]} products 商品レコードの配列
     * @param {object} condition SearchCondition
     * @returns {object} ActionResult。data は { products: 商品レコードの配列 }
     */
    function searchProducts(products, condition) {
        const sellingProducts = products.filter(function (product) {
            return product.deleteDatetime === null;
        });
        const narrowedProducts = (condition.productName === '')
            ? sellingProducts
            : sellingProducts.filter(function (product) {
                return product.productName.includes(condition.productName);
            });
        const sortedProducts = sortByProductCode(narrowedProducts);
        if (sortedProducts.length === 0) {
            return result.createSuccessResult('I-005', {}, { products: [] });
        }
        return result.createSuccessResult(null, {}, { products: sortedProducts });
    }

    /**
     * F-02 商品を登録する。商品コードは論理削除済みを含めた最大値 + 1 で採番する。
     * @param {object[]} products 商品レコードの配列（論理削除済みを含む全件）
     * @param {object} input { productName, price }（画面から取得した生の入力値）
     * @param {string} now 保存形式の日時文字列
     * @returns {object} ActionResult
     */
    function registerProduct(products, input, now) {
        const productNameResult = validation.validateProductName(
            FIELD_ID_REGISTER_PRODUCT_NAME, null, input.productName
        );
        const priceResult = validation.validatePrice(FIELD_ID_REGISTER_PRICE, null, input.price);
        const trimmedInput = { productName: productNameResult.value, price: priceResult.value };

        const errors = [productNameResult.error, priceResult.error].filter(function (error) {
            return error !== null;
        });
        if (errors.length > 0) {
            return result.createValidationErrorResult(errors, { trimmedInput });
        }

        let nextCodeNumber = constants.PRODUCT_CODE_MIN;
        if (products.length > 0) {
            const maxCodeNumber = products.reduce(function (currentMax, product) {
                return Math.max(currentMax, parseInt(product.productCode, DECIMAL_RADIX));
            }, 0);
            nextCodeNumber = maxCodeNumber + 1;
        }
        if (nextCodeNumber > constants.PRODUCT_CODE_MAX) {
            return result.createErrorResult(
                'E-205',
                { maxProductCode: format.padProductCode(constants.PRODUCT_CODE_MAX) },
                { trimmedInput }
            );
        }

        const registeredProduct = {
            productCode: format.padProductCode(nextCodeNumber),
            productName: productNameResult.value,
            price: priceResult.numberValue,
            registerDatetime: now,
            updateDatetime: now,
            deleteDatetime: null
        };
        const nextProducts = storeSchema.sortProducts(products.concat([registeredProduct]));
        return result.createSuccessResult('I-001', {}, {
            products: nextProducts,
            productCode: registeredProduct.productCode,
            trimmedInput
        });
    }

    /**
     * F-03 商品を1件取得する。存在しない・論理削除済みの場合はエラーを返す。
     * @param {object[]} products 商品レコードの配列（論理削除済みを含む全件）
     * @param {string} productCode 3桁ゼロ埋めの商品コード
     * @returns {object} ActionResult。成功時の data は { product: 商品レコード }
     */
    function findProductByCode(products, productCode) {
        const targetProduct = products.find(function (product) {
            return product.productCode === productCode;
        });
        if (targetProduct === undefined) {
            return result.createErrorResult('E-202');
        }
        if (targetProduct.deleteDatetime !== null) {
            return result.createErrorResult('E-201');
        }
        return result.createSuccessResult(null, {}, { product: targetProduct });
    }

    /**
     * F-04 商品の商品名と単価を変更する。売上がある商品は単価を変更できない。
     * @param {object[]} products 商品レコードの配列（論理削除済みを含む全件）
     * @param {object[]} sales 売上レコードの配列
     * @param {object} input { productCode, productName, price, baseUpdateDatetime }
     * @param {string} now 保存形式の日時文字列
     * @returns {object} ActionResult
     */
    function updateProduct(products, sales, input, now) {
        const targetProduct = products.find(function (product) {
            return product.productCode === input.productCode;
        });
        if (targetProduct === undefined) {
            return result.createErrorResult('E-202');
        }
        if (targetProduct.deleteDatetime !== null) {
            return result.createErrorResult('E-201');
        }
        if (targetProduct.updateDatetime !== input.baseUpdateDatetime) {
            return result.createErrorResult('E-203');
        }

        const hasSales = salesLogic.hasSalesOfProduct(sales, input.productCode);
        const storedPrice = String(targetProduct.price);
        if (hasSales) {
            const trimmedPrice = validation.trimInputValue(input.price);
            if (trimmedPrice !== '' && trimmedPrice !== storedPrice) {
                return result.createErrorResult('E-204');
            }
        }

        const productNameResult = validation.validateProductName(
            FIELD_ID_EDIT_PRODUCT_NAME, null, input.productName
        );
        const priceResult = hasSales
            ? null
            : validation.validatePrice(FIELD_ID_EDIT_PRICE, null, input.price);
        const trimmedInput = {
            productName: productNameResult.value,
            price: hasSales ? storedPrice : priceResult.value
        };

        const errors = [productNameResult.error, hasSales ? null : priceResult.error]
            .filter(function (error) {
                return error !== null && error !== undefined;
            });
        if (errors.length > 0) {
            return result.createValidationErrorResult(errors, { trimmedInput });
        }

        const updatedProduct = {
            productCode: targetProduct.productCode,
            productName: productNameResult.value,
            price: hasSales ? targetProduct.price : priceResult.numberValue,
            registerDatetime: targetProduct.registerDatetime,
            updateDatetime: now,
            deleteDatetime: null
        };
        const nextProducts = storeSchema.sortProducts(products.map(function (product) {
            return (product.productCode === input.productCode) ? updatedProduct : product;
        }));
        return result.createSuccessResult('I-002', {}, { products: nextProducts, trimmedInput });
    }

    /**
     * F-05 商品を論理削除する。売上がある商品は削除できない。
     * @param {object[]} products 商品レコードの配列（論理削除済みを含む全件）
     * @param {object[]} sales 売上レコードの配列
     * @param {object} input { productCode, baseUpdateDatetime }
     * @param {string} now 保存形式の日時文字列
     * @returns {object} ActionResult
     */
    function deleteProduct(products, sales, input, now) {
        const targetProduct = products.find(function (product) {
            return product.productCode === input.productCode;
        });
        if (targetProduct === undefined) {
            return result.createErrorResult('E-202');
        }
        if (targetProduct.deleteDatetime !== null) {
            return result.createErrorResult('E-201');
        }
        if (targetProduct.updateDatetime !== input.baseUpdateDatetime) {
            return result.createErrorResult('E-203');
        }
        if (salesLogic.hasSalesOfProduct(sales, input.productCode)) {
            return result.createErrorResult('E-204');
        }

        const deletedProduct = {
            productCode: targetProduct.productCode,
            productName: targetProduct.productName,
            price: targetProduct.price,
            registerDatetime: targetProduct.registerDatetime,
            updateDatetime: now,
            deleteDatetime: now
        };
        const nextProducts = storeSchema.sortProducts(products.map(function (product) {
            return (product.productCode === input.productCode) ? deletedProduct : product;
        }));
        return result.createSuccessResult('I-003', {}, { products: nextProducts });
    }

    /**
     * F-06 販売中の商品の一覧を取得する。
     * エラーの経路が無いため ActionResult を返さない。
     * @param {object[]} products 商品レコードの配列（論理削除済みを含む全件）
     * @returns {object[]} 販売中の商品を商品コードの昇順に並べた新しい配列
     */
    function listSellingProducts(products) {
        return sortByProductCode(products.filter(function (product) {
            return product.deleteDatetime === null;
        }));
    }

    const exported = {
        searchProducts,
        registerProduct,
        findProductByCode,
        updateProduct,
        deleteProduct,
        listSellingProducts
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = exported;
    } else {
        global.PMA = global.PMA || {};
        global.PMA.productLogic = exported;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
