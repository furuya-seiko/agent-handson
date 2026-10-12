// DOM の結線、イベント登録、画面切り替えの実行を行う。
// 業務ロジック（集計・入力チェック・整形の判断）はここに書かない。

(function (global) {
    'use strict';
    const constants = (typeof require === 'function') ? require('../logic/constants.js') : global.PMA.constants;
    const format = (typeof require === 'function') ? require('../logic/format.js') : global.PMA.format;
    const messages = (typeof require === 'function') ? require('../logic/messages.js') : global.PMA.messages;
    const validation = (typeof require === 'function') ? require('../logic/validation.js') : global.PMA.validation;
    const productLogic = (typeof require === 'function') ? require('../logic/product-logic.js') : global.PMA.productLogic;
    const salesLogic = (typeof require === 'function') ? require('../logic/sales-logic.js') : global.PMA.salesLogic;
    const summaryLogic = (typeof require === 'function') ? require('../logic/summary-logic.js') : global.PMA.summaryLogic;
    const screenState = (typeof require === 'function') ? require('../view/screen-state.js') : global.PMA.screenState;
    const render = (typeof require === 'function') ? require('../view/render.js') : global.PMA.render;
    const clock = (typeof require === 'function') ? require('./clock.js') : global.PMA.clock;
    const storage = (typeof require === 'function') ? require('./storage.js') : global.PMA.storage;

    // 10進数への変換に使う基数
    const DECIMAL_RADIX = 10;
    // 確認ダイアログを出さない種別のメッセージ
    const CONFIRM_MESSAGE_TYPE = 'confirm';
    // Enter キーの key の値
    const ENTER_KEY = 'Enter';
    // 日本語入力の変換中に通知される keyCode
    const IME_COMPOSING_KEY_CODE = 229;

    const ALL_SCREEN_IDS = [
        constants.SCREEN_ID_PRODUCT_SEARCH,
        constants.SCREEN_ID_PRODUCT_REGISTER,
        constants.SCREEN_ID_PRODUCT_EDIT,
        constants.SCREEN_ID_SALES_REGISTER,
        constants.SCREEN_ID_CSV_DOWNLOAD
    ];

    let state = null;
    // 表示中のメッセージを画面IDごとに保持する
    const displayedMessages = {};

    /**
     * id で DOM 要素を取得する。
     * @param {string} elementID 要素のid
     * @returns {object|null} DOM 要素
     */
    function findElement(elementID) {
        return document.getElementById(elementID);
    }

    /**
     * 表示専用要素へ値を設定する。
     * @param {string} elementID 要素のid
     * @param {string} value 表示する値
     * @returns {void}
     */
    function setElementText(elementID, value) {
        findElement(elementID).textContent = value;
    }

    /**
     * 入力欄へ値を設定する。
     * @param {string} elementID 要素のid
     * @param {string} value 設定する値
     * @returns {void}
     */
    function setInputValue(elementID, value) {
        findElement(elementID).value = value;
    }

    /**
     * 入力欄の値を取得する。
     * @param {string} elementID 要素のid
     * @returns {string} 入力値
     */
    function getInputValue(elementID) {
        return findElement(elementID).value;
    }

    /**
     * ボタンの活性状態を設定する。
     * @param {string} elementID 要素のid
     * @param {boolean} isEnabled 活性にするか
     * @returns {void}
     */
    function setButtonEnabled(elementID, isEnabled) {
        findElement(elementID).disabled = !isEnabled;
    }

    /**
     * 要素の表示・非表示を切り替える。
     * @param {string} elementID 要素のid
     * @param {boolean} isVisible 表示するか
     * @returns {void}
     */
    function setElementVisible(elementID, isVisible) {
        const element = findElement(elementID);
        if (isVisible) {
            element.classList.remove(constants.HIDDEN_CLASS_NAME);
            return;
        }
        element.classList.add(constants.HIDDEN_CLASS_NAME);
    }

    /**
     * 画面IDからメッセージ領域の DOM 要素を求める。
     * @param {string} screenID 画面ID
     * @returns {object} メッセージ領域の DOM 要素
     */
    function findMessageArea(screenID) {
        return findElement(constants.MESSAGE_AREA_ID_BY_SCREEN_ID[screenID]);
    }

    /**
     * メッセージ領域をクリアする。
     * @param {string} screenID 画面ID
     * @returns {void}
     */
    function clearMessages(screenID) {
        displayedMessages[screenID] = [];
        findMessageArea(screenID).innerHTML = '';
    }

    /**
     * メッセージ領域にメッセージを1件追加する。
     * @param {string} screenID 画面ID
     * @param {string} messageID メッセージID
     * @param {object} messageParams メッセージに埋め込む値
     * @returns {void}
     */
    function appendMessage(screenID, messageID, messageParams) {
        const messageType = messages.getMessageType(messageID);
        if (messageType === CONFIRM_MESSAGE_TYPE) {
            return;
        }
        const text = messages.getMessageText(messageID, messageParams);
        displayedMessages[screenID].push({ messageType, text });
        findMessageArea(screenID).innerHTML = render.renderMessageList(displayedMessages[screenID]);
    }

    /**
     * FieldError の fieldID と rowIndex から DOM の id を求める。
     * @param {object} fieldError FieldError
     * @returns {string} DOM の id
     */
    function toFieldElementID(fieldError) {
        if (fieldError.rowIndex === null) {
            return fieldError.fieldID;
        }
        return fieldError.fieldID + '-' + String(fieldError.rowIndex);
    }

    /**
     * 入力チェックエラーを画面へ表示する。前回のエラー強調は必ず解除する。
     * @param {string} screenID 画面ID
     * @param {object[]} errors FieldError の配列
     * @returns {void}
     */
    function showFieldErrors(screenID, errors) {
        const section = findElement(screenID);
        section.querySelectorAll('input, select').forEach(function (element) {
            element.classList.remove(constants.ERROR_CLASS_NAME);
        });
        errors.forEach(function (fieldError) {
            const target = findElement(toFieldElementID(fieldError));
            if (target !== null) {
                target.classList.add(constants.ERROR_CLASS_NAME);
            }
        });
        errors.forEach(function (fieldError) {
            appendMessage(screenID, fieldError.messageID, fieldError.messageParams);
        });
        if (errors.length > 0) {
            const firstTarget = findElement(toFieldElementID(errors[0]));
            if (firstTarget !== null) {
                firstTarget.focus();
            }
        }
    }

    // ----- S-01 商品検索 -----

    /**
     * 検索を実行し、一覧を描画する。
     * @returns {void}
     */
    function executeProductSearch() {
        const screenID = constants.SCREEN_ID_PRODUCT_SEARCH;
        const validationResult = validation.validateSearchProductName(
            'search-product-name', getInputValue('search-product-name')
        );
        setInputValue('search-product-name', validationResult.value);
        if (validationResult.error !== null) {
            showFieldErrors(screenID, [validationResult.error]);
            return;
        }
        showFieldErrors(screenID, []);
        storage.saveSearchProductName(validationResult.value);

        const loadResult = storage.loadProducts();
        if (!loadResult.isSuccess) {
            appendMessage(screenID, loadResult.messageID, loadResult.messageParams);
        }
        const searchResult = productLogic.searchProducts(
            loadResult.data.products, { productName: validationResult.value }
        );
        if (searchResult.data.products.length === 0) {
            setElementVisible('product-search-table', false);
            findElement('product-search-tbody').innerHTML = '';
            appendMessage(screenID, searchResult.messageID, searchResult.messageParams);
            return;
        }
        findElement('product-search-tbody').innerHTML =
            render.renderProductSearchRows(searchResult.data.products);
        setElementVisible('product-search-table', true);
    }

    /**
     * S-01 の「検索」ボタン押下時、および検索条件の入力欄での Enter キー押下時の処理。
     * @returns {void}
     */
    function handleSearch() {
        clearMessages(constants.SCREEN_ID_PRODUCT_SEARCH);
        executeProductSearch();
    }

    /**
     * S-01 の初期表示。
     * @returns {void}
     */
    function initializeProductSearchScreen() {
        setInputValue('search-product-name', storage.loadSearchProductName());
        executeProductSearch();
    }

    // ----- S-02 商品登録 -----

    /**
     * S-02 のボタン活性を再計算する。
     * @returns {void}
     */
    function recalculateProductRegisterButtons() {
        setButtonEnabled('button-register-product', true);
        setButtonEnabled('button-register-back', true);
    }

    /**
     * S-02 の初期表示。
     * @returns {void}
     */
    function initializeProductRegisterScreen() {
        setInputValue('register-product-name', '');
        setInputValue('register-price', '');
        showFieldErrors(constants.SCREEN_ID_PRODUCT_REGISTER, []);
        recalculateProductRegisterButtons();
    }

    /**
     * S-02 の「登録」ボタン押下時の処理。
     * @returns {void}
     */
    function handleRegisterProduct() {
        const screenID = constants.SCREEN_ID_PRODUCT_REGISTER;
        clearMessages(screenID);
        setButtonEnabled('button-register-product', false);

        const input = {
            productName: getInputValue('register-product-name'),
            price: getInputValue('register-price')
        };
        const loadResult = storage.loadProducts();
        if (!loadResult.isSuccess) {
            appendMessage(screenID, loadResult.messageID, loadResult.messageParams);
            recalculateProductRegisterButtons();
            return;
        }
        const registerResult = productLogic.registerProduct(
            loadResult.data.products, input, clock.getCurrentDatetime()
        );
        if (registerResult.errors.length > 0) {
            setInputValue('register-product-name', registerResult.data.trimmedInput.productName);
            setInputValue('register-price', registerResult.data.trimmedInput.price);
            showFieldErrors(screenID, registerResult.errors);
            recalculateProductRegisterButtons();
            return;
        }
        if (!registerResult.isSuccess) {
            appendMessage(screenID, registerResult.messageID, registerResult.messageParams);
            recalculateProductRegisterButtons();
            return;
        }
        const saveResult = storage.saveProducts(registerResult.data.products);
        if (!saveResult.isSuccess) {
            appendMessage(screenID, saveResult.messageID, saveResult.messageParams);
            recalculateProductRegisterButtons();
            return;
        }
        storage.saveFlashMessage(registerResult.messageID, registerResult.messageParams);
        showScreen(constants.SCREEN_ID_PRODUCT_SEARCH);
        recalculateProductRegisterButtons();
    }

    // ----- S-03 商品変更・削除 -----

    /**
     * S-03 のボタン活性と単価欄の表示状態を再計算する。
     * @returns {void}
     */
    function recalculateProductEditButtons() {
        const hasSales = state.hasSalesOfEditingProduct;
        setButtonEnabled('button-update-product', true);
        setButtonEnabled('button-delete-product', !hasSales);
        setButtonEnabled('button-edit-back', true);
        setElementVisible('edit-price', !hasSales);
        setElementVisible('edit-price-display', hasSales);
        setElementVisible('edit-price-note', hasSales);
    }

    /**
     * S-03 の初期表示。対象商品が取得できない場合は S-01 へ遷移する。
     * @returns {void}
     */
    function initializeProductEditScreen() {
        const productCode = storage.loadEditProductCode();
        if (productCode === '') {
            storage.saveFlashMessage('E-202', {});
            showScreen(constants.SCREEN_ID_PRODUCT_SEARCH);
            return;
        }
        const productsResult = storage.loadProducts();
        if (!productsResult.isSuccess) {
            storage.saveFlashMessage(productsResult.messageID, productsResult.messageParams);
            showScreen(constants.SCREEN_ID_PRODUCT_SEARCH);
            return;
        }
        const salesResult = storage.loadSales();
        if (!salesResult.isSuccess) {
            storage.saveFlashMessage(salesResult.messageID, salesResult.messageParams);
            showScreen(constants.SCREEN_ID_PRODUCT_SEARCH);
            return;
        }
        const findResult = productLogic.findProductByCode(productsResult.data.products, productCode);
        if (!findResult.isSuccess) {
            storage.saveFlashMessage(findResult.messageID, findResult.messageParams);
            showScreen(constants.SCREEN_ID_PRODUCT_SEARCH);
            return;
        }
        const targetProduct = findResult.data.product;
        const hasSales = salesLogic.hasSalesOfProduct(salesResult.data.sales, targetProduct.productCode);
        screenState.setEditingContext(state, targetProduct.updateDatetime, hasSales);

        setElementText('edit-product-code', targetProduct.productCode);
        setInputValue('edit-product-name', targetProduct.productName);
        setInputValue('edit-price', String(targetProduct.price));
        setElementText('edit-price-display', format.formatCurrency(targetProduct.price));
        setElementText('edit-register-datetime', format.formatDatetimeForDisplay(targetProduct.registerDatetime));
        setElementText('edit-update-datetime', format.formatDatetimeForDisplay(targetProduct.updateDatetime));
        setElementText(
            'edit-delete-datetime',
            format.toEmptyStringIfNull(targetProduct.deleteDatetime) === ''
                ? ''
                : format.formatDatetimeForDisplay(targetProduct.deleteDatetime)
        );
        showFieldErrors(constants.SCREEN_ID_PRODUCT_EDIT, []);
        recalculateProductEditButtons();
    }

    /**
     * S-03 の業務エラー時の再表示。E-201 / E-202 は S-01 へ引き継ぐため表示しない。
     * @param {object} actionResult 業務ロジックの戻り値
     * @returns {void}
     */
    function showProductEditBusinessError(actionResult) {
        if (actionResult.messageID !== 'E-201' && actionResult.messageID !== 'E-202') {
            appendMessage(constants.SCREEN_ID_PRODUCT_EDIT, actionResult.messageID, actionResult.messageParams);
        }
        initializeProductEditScreen();
    }

    /**
     * S-03 の更新系処理（変更・削除）を実行する。
     * @param {function} confirmBeforeExecute 確認ダイアログを出す関数。不要な場合は null
     * @param {function} callLogic 業務ロジックを呼ぶ関数（products, sales, now を受け取る）
     * @returns {void}
     */
    function executeProductEditUpdate(confirmBeforeExecute, callLogic) {
        const screenID = constants.SCREEN_ID_PRODUCT_EDIT;
        clearMessages(screenID);
        setButtonEnabled('button-update-product', false);
        setButtonEnabled('button-delete-product', false);

        if (confirmBeforeExecute !== null && !confirmBeforeExecute()) {
            recalculateProductEditButtons();
            return;
        }
        const productsResult = storage.loadProducts();
        const salesResult = storage.loadSales();
        if (!productsResult.isSuccess || !salesResult.isSuccess) {
            const failedResult = productsResult.isSuccess ? salesResult : productsResult;
            showProductEditBusinessError(failedResult);
            recalculateProductEditButtons();
            return;
        }
        const actionResult = callLogic(
            productsResult.data.products, salesResult.data.sales, clock.getCurrentDatetime()
        );
        if (actionResult.errors.length > 0) {
            setInputValue('edit-product-name', actionResult.data.trimmedInput.productName);
            if (!state.hasSalesOfEditingProduct) {
                setInputValue('edit-price', actionResult.data.trimmedInput.price);
            }
            showFieldErrors(screenID, actionResult.errors);
            recalculateProductEditButtons();
            return;
        }
        if (!actionResult.isSuccess) {
            showProductEditBusinessError(actionResult);
            recalculateProductEditButtons();
            return;
        }
        const saveResult = storage.saveProducts(actionResult.data.products);
        if (!saveResult.isSuccess) {
            showProductEditBusinessError(saveResult);
            recalculateProductEditButtons();
            return;
        }
        storage.saveFlashMessage(actionResult.messageID, actionResult.messageParams);
        showScreen(constants.SCREEN_ID_PRODUCT_SEARCH);
        recalculateProductEditButtons();
    }

    /**
     * S-03 の「変更」ボタン押下時の処理。
     * @returns {void}
     */
    function handleUpdateProduct() {
        executeProductEditUpdate(null, function (products, sales, now) {
            const input = {
                productCode: findElement('edit-product-code').textContent,
                productName: getInputValue('edit-product-name'),
                price: getInputValue('edit-price'),
                baseUpdateDatetime: state.editingBaseUpdateDatetime
            };
            return productLogic.updateProduct(products, sales, input, now);
        });
    }

    /**
     * S-03 の「削除」ボタン押下時の処理。
     * @returns {void}
     */
    function handleDeleteProduct() {
        const confirmBeforeExecute = function () {
            return window.confirm(messages.getMessageText('C-001', {
                productName: validation.trimInputValue(getInputValue('edit-product-name'))
            }));
        };
        executeProductEditUpdate(confirmBeforeExecute, function (products, sales, now) {
            const input = {
                productCode: findElement('edit-product-code').textContent,
                baseUpdateDatetime: state.editingBaseUpdateDatetime
            };
            return productLogic.deleteProduct(products, sales, input, now);
        });
    }

    // ----- S-04 日ごとの売上一括登録 -----

    /**
     * S-04 のボタン活性を再計算する。
     * @returns {void}
     */
    function recalculateSalesRegisterButtons() {
        setButtonEnabled('button-register-sales', true);
        setButtonEnabled('button-add-row', true);
        findElement('sales-detail-tbody')
            .querySelectorAll('.button-remove-row')
            .forEach(function (button) {
                button.disabled = false;
            });
    }

    /**
     * 明細一覧を再描画する。メッセージは表示しない。
     * @returns {void}
     */
    function redrawSalesDetail() {
        const screenID = constants.SCREEN_ID_SALES_REGISTER;
        const loadResult = storage.loadProducts();
        if (!loadResult.isSuccess) {
            appendMessage(screenID, loadResult.messageID, loadResult.messageParams);
        }
        const sellingProducts = productLogic.listSellingProducts(loadResult.data.products);
        findElement('sales-detail-tbody').innerHTML =
            render.renderSalesDetailRows(state.salesDetailRows, sellingProducts);
        setElementVisible('sales-detail-table', state.salesDetailRows.length > 0);
    }

    /**
     * S-04 の初期表示。
     * @returns {void}
     */
    function initializeSalesRegisterScreen() {
        const screenID = constants.SCREEN_ID_SALES_REGISTER;
        const salesDate = clock.getCurrentDate();
        setElementText('sales-date', format.formatDateForDisplay(salesDate));

        const salesResult = storage.loadSales();
        if (!salesResult.isSuccess) {
            appendMessage(screenID, salesResult.messageID, salesResult.messageParams);
        }
        const productsResult = storage.loadProducts();
        if (!productsResult.isSuccess) {
            appendMessage(screenID, productsResult.messageID, productsResult.messageParams);
        }
        // 再投入は商品・売上の両方を上書きするため、先に読んだ売上を読み直す
        const sales = productsResult.isSuccess ? salesResult.data.sales : storage.loadSales().data.sales;

        const detailResult = salesLogic.findSalesDetailRowsByDate(
            sales, productsResult.data.products, salesDate
        );
        screenState.setSalesDetailRows(state, detailResult.data.rows);
        redrawSalesDetail();
        if (detailResult.messageID !== null) {
            appendMessage(screenID, detailResult.messageID, detailResult.messageParams);
        }
        showFieldErrors(screenID, []);
        recalculateSalesRegisterButtons();
    }

    /**
     * S-04 の「追加」ボタン押下時の処理。
     * @returns {void}
     */
    function handleAddSalesDetailRow() {
        const screenID = constants.SCREEN_ID_SALES_REGISTER;
        clearMessages(screenID);
        const addResult = screenState.addSalesDetailRow(state);
        if (!addResult.isSuccess) {
            appendMessage(screenID, addResult.messageID, addResult.messageParams);
            return;
        }
        redrawSalesDetail();
    }

    /**
     * S-04 の明細各行の「削除」ボタン押下時の処理。
     * @param {object} clickedButton 押下されたボタンの DOM 要素
     * @returns {void}
     */
    function handleRemoveSalesDetailRow(clickedButton) {
        clearMessages(constants.SCREEN_ID_SALES_REGISTER);
        const rowIndex = parseInt(clickedButton.dataset.rowIndex, DECIMAL_RADIX);
        screenState.removeSalesDetailRow(state, rowIndex);
        redrawSalesDetail();
    }

    /**
     * 明細一覧の DOM の入力値を、すべて画面状態へ反映する。
     * @returns {void}
     */
    function syncSalesDetailRowsFromDOM() {
        const tbody = findElement('sales-detail-tbody');
        tbody.querySelectorAll('.sales-product-code').forEach(function (element) {
            screenState.setSalesDetailRowValue(
                state, parseInt(element.dataset.rowIndex, DECIMAL_RADIX), 'productCode', element.value
            );
        });
        tbody.querySelectorAll('.sales-quantity').forEach(function (element) {
            screenState.setSalesDetailRowValue(
                state, parseInt(element.dataset.rowIndex, DECIMAL_RADIX), 'quantity', element.value
            );
        });
    }

    /**
     * S-04 の「登録」ボタン押下時の処理。
     * @returns {void}
     */
    function handleRegisterSales() {
        const screenID = constants.SCREEN_ID_SALES_REGISTER;
        clearMessages(screenID);
        setButtonEnabled('button-register-sales', false);
        setButtonEnabled('button-add-row', false);
        findElement('sales-detail-tbody')
            .querySelectorAll('.button-remove-row')
            .forEach(function (button) {
                button.disabled = true;
            });

        syncSalesDetailRowsFromDOM();
        if (state.salesDetailRows.length === 0
            && !window.confirm(messages.getMessageText('C-002', {}))) {
            recalculateSalesRegisterButtons();
            return;
        }
        const salesResult = storage.loadSales();
        const productsResult = storage.loadProducts();
        if (!salesResult.isSuccess || !productsResult.isSuccess) {
            const failedResult = salesResult.isSuccess ? productsResult : salesResult;
            appendMessage(screenID, failedResult.messageID, failedResult.messageParams);
            initializeSalesRegisterScreen();
            recalculateSalesRegisterButtons();
            return;
        }
        const registerResult = salesLogic.registerDailySales(
            salesResult.data.sales, productsResult.data.products,
            state.salesDetailRows, clock.getCurrentDatetime()
        );
        if (registerResult.errors.length > 0) {
            screenState.setSalesDetailRows(state, registerResult.data.trimmedRows);
            redrawSalesDetail();
            showFieldErrors(screenID, registerResult.errors);
            recalculateSalesRegisterButtons();
            return;
        }
        if (!registerResult.isSuccess) {
            appendMessage(screenID, registerResult.messageID, registerResult.messageParams);
            recalculateSalesRegisterButtons();
            return;
        }
        const saveResult = storage.saveSales(registerResult.data.sales);
        if (!saveResult.isSuccess) {
            appendMessage(screenID, saveResult.messageID, saveResult.messageParams);
            recalculateSalesRegisterButtons();
            return;
        }
        appendMessage(screenID, registerResult.messageID, registerResult.messageParams);
        initializeSalesRegisterScreen();
        recalculateSalesRegisterButtons();
    }

    // ----- S-05 集計データCSVダウンロード -----

    /**
     * S-05 のボタン活性を再計算する。
     * @returns {void}
     */
    function recalculateCsvDownloadButtons() {
        setButtonEnabled('button-csv-all', true);
        setButtonEnabled('button-csv-month', true);
    }

    /**
     * S-05 の初期表示。
     * @returns {void}
     */
    function initializeCsvDownloadScreen() {
        setInputValue('csv-year-month', '');
        showFieldErrors(constants.SCREEN_ID_CSV_DOWNLOAD, []);
        recalculateCsvDownloadButtons();
    }

    /**
     * CSV 文字列をファイルとしてダウンロードさせる。
     * @param {string} csvText CSV 文字列（BOM を含む）
     * @param {string} fileName ダウンロードするファイル名
     * @returns {void}
     */
    function downloadCSV(csvText, fileName) {
        const blob = new Blob([csvText], { type: constants.CSV_MIME_TYPE });
        const objectURL = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectURL;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        // 確保したオブジェクトURLを解放する
        URL.revokeObjectURL(objectURL);
        appendMessage(constants.SCREEN_ID_CSV_DOWNLOAD, 'I-007', { fileName });
    }

    /**
     * S-05 の集計処理を実行し、成功したら CSV をダウンロードさせる。
     * @param {function} callLogic 業務ロジックを呼ぶ関数（products, sales を受け取る）
     * @param {function} buildFileName ファイル名を組み立てる関数（data を受け取る）
     * @param {function|null} restoreInput 入力欄を再表示する関数。不要な場合は null
     * @returns {void}
     */
    function executeCsvDownload(callLogic, buildFileName, restoreInput) {
        const screenID = constants.SCREEN_ID_CSV_DOWNLOAD;
        clearMessages(screenID);
        setButtonEnabled('button-csv-all', false);
        setButtonEnabled('button-csv-month', false);

        const productsResult = storage.loadProducts();
        const salesResult = storage.loadSales();
        if (!productsResult.isSuccess || !salesResult.isSuccess) {
            const failedResult = productsResult.isSuccess ? salesResult : productsResult;
            appendMessage(screenID, failedResult.messageID, failedResult.messageParams);
            recalculateCsvDownloadButtons();
            return;
        }
        const summaryResult = callLogic(productsResult.data.products, salesResult.data.sales);
        if (summaryResult.errors.length > 0) {
            if (restoreInput !== null) {
                restoreInput(summaryResult.data);
            }
            showFieldErrors(screenID, summaryResult.errors);
            recalculateCsvDownloadButtons();
            return;
        }
        if (!summaryResult.isSuccess) {
            if (restoreInput !== null) {
                restoreInput(summaryResult.data);
            }
            appendMessage(screenID, summaryResult.messageID, summaryResult.messageParams);
            recalculateCsvDownloadButtons();
            return;
        }
        const csvText = summaryLogic.buildSummaryCSV(summaryResult.data.rows);
        downloadCSV(csvText, buildFileName(summaryResult.data));
        recalculateCsvDownloadButtons();
    }

    /**
     * S-05 の「商品別売上集計」ボタン押下時の処理。
     * @returns {void}
     */
    function handleCsvAll() {
        executeCsvDownload(
            function (products, sales) {
                return summaryLogic.summarizeSalesByProduct(products, sales);
            },
            function () {
                return constants.CSV_FILE_NAME_ALL;
            },
            null
        );
    }

    /**
     * S-05 の「指定年月商品別売上集計」ボタン押下時の処理。
     * @returns {void}
     */
    function handleCsvMonth() {
        const inputYearMonth = getInputValue('csv-year-month');
        executeCsvDownload(
            function (products, sales) {
                return summaryLogic.summarizeSalesByProductForMonth(products, sales, inputYearMonth);
            },
            function (data) {
                return constants.CSV_FILE_NAME_MONTH_PREFIX
                    + data.yearMonth.split('-').join('')
                    + constants.CSV_FILE_EXTENSION;
            },
            function (data) {
                setInputValue('csv-year-month', data.trimmedYearMonth);
            }
        );
    }

    // ----- 画面切り替えと共通処理 -----

    /**
     * 画面ごとの初期表示処理を実行する。
     * @param {string} screenID 画面ID
     * @returns {void}
     */
    function initializeScreen(screenID) {
        if (screenID === constants.SCREEN_ID_PRODUCT_SEARCH) {
            initializeProductSearchScreen();
            return;
        }
        if (screenID === constants.SCREEN_ID_PRODUCT_REGISTER) {
            initializeProductRegisterScreen();
            return;
        }
        if (screenID === constants.SCREEN_ID_PRODUCT_EDIT) {
            initializeProductEditScreen();
            return;
        }
        if (screenID === constants.SCREEN_ID_SALES_REGISTER) {
            initializeSalesRegisterScreen();
            return;
        }
        initializeCsvDownloadScreen();
    }

    /**
     * 画面ごとのボタン活性を再計算する。
     * @param {string} screenID 画面ID
     * @returns {void}
     */
    function recalculateButtons(screenID) {
        if (screenID === constants.SCREEN_ID_PRODUCT_REGISTER) {
            recalculateProductRegisterButtons();
            return;
        }
        if (screenID === constants.SCREEN_ID_PRODUCT_EDIT) {
            recalculateProductEditButtons();
            return;
        }
        if (screenID === constants.SCREEN_ID_SALES_REGISTER) {
            recalculateSalesRegisterButtons();
            return;
        }
        if (screenID === constants.SCREEN_ID_CSV_DOWNLOAD) {
            recalculateCsvDownloadButtons();
        }
        // S-01 には更新系処理が無いため、再計算する対象は無い
    }

    /**
     * 画面を切り替える。メッセージ領域をクリアするのは本関数のみである。
     * @param {string} screenID 表示する画面ID
     * @returns {void}
     */
    function showScreen(screenID) {
        ALL_SCREEN_IDS.forEach(function (candidateScreenID) {
            setElementVisible(candidateScreenID, false);
        });
        setElementVisible(screenID, true);
        clearMessages(screenID);
        screenState.setCurrentScreenID(state, screenID);
        const flashMessage = storage.takeFlashMessage();
        if (flashMessage !== null) {
            appendMessage(screenID, flashMessage.messageID, flashMessage.messageParams);
        }
        initializeScreen(screenID);
    }

    /**
     * イベントハンドラを共通ラッパーで包む。捕捉した例外は画面に表示する。
     * @param {function} handler イベントハンドラ
     * @returns {function} ラップしたハンドラ
     */
    function runHandler(handler) {
        return function (event) {
            try {
                handler(event);
            } catch (error) {
                const screenID = state.currentScreenID;
                const detail = (error instanceof Error) ? error.message : String(error);
                appendMessage(screenID, 'E-903', { detail });
                recalculateButtons(screenID);
            }
        };
    }

    /**
     * 入力欄の Enter キー押下で処理を実行するハンドラを組み立てる。
     * 日本語入力の変換確定による Enter では実行しない。
     * @param {function} execute Enter キーで実行する処理
     * @returns {function} keydown のイベントハンドラ
     */
    function createEnterKeyHandler(execute) {
        return function (event) {
            if (event.key !== ENTER_KEY) {
                return;
            }
            // 変換候補を確定するための Enter を実行の契機にしない
            if (event.isComposing === true || event.keyCode === IME_COMPOSING_KEY_CODE) {
                return;
            }
            execute();
        };
    }

    /**
     * すべてのイベントを共通ラッパー経由で登録する。
     * @returns {void}
     */
    function bindEvents() {
        findElement('menu-product-search').addEventListener('click', runHandler(function () {
            showScreen(constants.SCREEN_ID_PRODUCT_SEARCH);
        }));
        findElement('menu-product-register').addEventListener('click', runHandler(function () {
            showScreen(constants.SCREEN_ID_PRODUCT_REGISTER);
        }));
        findElement('menu-sales-register').addEventListener('click', runHandler(function () {
            showScreen(constants.SCREEN_ID_SALES_REGISTER);
        }));
        findElement('menu-csv-download').addEventListener('click', runHandler(function () {
            showScreen(constants.SCREEN_ID_CSV_DOWNLOAD);
        }));

        findElement('button-search').addEventListener('click', runHandler(handleSearch));
        findElement('search-product-name').addEventListener(
            'keydown', runHandler(createEnterKeyHandler(handleSearch))
        );
        findElement('button-go-register').addEventListener('click', runHandler(function () {
            showScreen(constants.SCREEN_ID_PRODUCT_REGISTER);
        }));
        findElement('product-search-tbody').addEventListener('click', runHandler(function (event) {
            const button = event.target.closest('.button-edit');
            if (button === null) {
                return;
            }
            storage.saveEditProductCode(button.dataset.productCode);
            showScreen(constants.SCREEN_ID_PRODUCT_EDIT);
        }));

        findElement('button-register-product').addEventListener('click', runHandler(handleRegisterProduct));
        findElement('button-register-back').addEventListener('click', runHandler(function () {
            showScreen(constants.SCREEN_ID_PRODUCT_SEARCH);
        }));

        findElement('button-update-product').addEventListener('click', runHandler(handleUpdateProduct));
        findElement('button-delete-product').addEventListener('click', runHandler(handleDeleteProduct));
        findElement('button-edit-back').addEventListener('click', runHandler(function () {
            showScreen(constants.SCREEN_ID_PRODUCT_SEARCH);
        }));

        findElement('button-add-row').addEventListener('click', runHandler(handleAddSalesDetailRow));
        findElement('button-register-sales').addEventListener('click', runHandler(handleRegisterSales));
        findElement('sales-detail-tbody').addEventListener('change', runHandler(function (event) {
            const element = event.target;
            const rowIndex = parseInt(element.dataset.rowIndex, DECIMAL_RADIX);
            if (element.classList.contains('sales-product-code')) {
                screenState.setSalesDetailRowValue(state, rowIndex, 'productCode', element.value);
                return;
            }
            if (element.classList.contains('sales-quantity')) {
                screenState.setSalesDetailRowValue(state, rowIndex, 'quantity', element.value);
            }
        }));
        findElement('sales-detail-tbody').addEventListener('click', runHandler(function (event) {
            const button = event.target.closest('.button-remove-row');
            if (button === null) {
                return;
            }
            handleRemoveSalesDetailRow(button);
        }));

        findElement('button-csv-all').addEventListener('click', runHandler(handleCsvAll));
        findElement('button-csv-month').addEventListener('click', runHandler(handleCsvMonth));
        findElement('csv-year-month').addEventListener(
            'keydown', runHandler(createEnterKeyHandler(handleCsvMonth))
        );
    }

    /**
     * 起動処理を行う。DOMContentLoaded で呼ぶ。
     * @returns {void}
     */
    function initializeApplication() {
        const initResult = storage.initializeStoreIfNeeded();
        state = screenState.createInitialState();
        ALL_SCREEN_IDS.forEach(function (screenID) {
            displayedMessages[screenID] = [];
        });
        bindEvents();
        showScreen(constants.SCREEN_ID_PRODUCT_SEARCH);
        // 手順の順序を入れ替えると、showScreen のクリアで起動時のメッセージが消える
        if (!initResult.isSuccess) {
            appendMessage(constants.SCREEN_ID_PRODUCT_SEARCH, initResult.messageID, initResult.messageParams);
        }
    }

    const exported = {
        initializeApplication
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = exported;
    } else {
        global.PMA = global.PMA || {};
        global.PMA.main = exported;
        document.addEventListener('DOMContentLoaded', function () {
            initializeApplication();
        });
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
