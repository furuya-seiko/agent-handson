// メッセージのID・種別・文言の定義と、埋め込み値を反映した文言の組み立てを行う。
// メッセージの文言を定義するのは本ファイルのみとする。

(function (global) {
    'use strict';
    const format = (typeof require === 'function') ? require('./format.js') : global.PMA.format;

    // 埋め込み時に3桁カンマ区切りへ整形する埋め込み名
    const COMMA_FORMATTED_PARAM_NAMES = ['min', 'max', 'maxCount', 'maxRows'];

    const MESSAGE_DEFINITIONS = {
        'I-001': { messageType: 'info', text: '商品を登録しました。' },
        'I-002': { messageType: 'info', text: '商品を変更しました。' },
        'I-003': { messageType: 'info', text: '商品を削除しました。' },
        'I-004': { messageType: 'info', text: '本日の売上を登録しました。' },
        'I-005': { messageType: 'info', text: '該当するデータがありません。' },
        'I-006': { messageType: 'info', text: '本日の売上はまだ登録されていません。' },
        'I-007': { messageType: 'info', text: 'CSVファイル「{fileName}」をダウンロードしました。' },
        'E-101': { messageType: 'error', text: '{label}を入力してください。' },
        'E-102': { messageType: 'error', text: '{label}を選択してください。' },
        'E-103': { messageType: 'error', text: '{label}は{maxLength}文字以内で入力してください。' },
        'E-104': { messageType: 'error', text: '{label}は半角数字で入力してください。' },
        'E-105': { messageType: 'error', text: '{label}は{min}以上{max}以下で入力してください。' },
        'E-106': { messageType: 'error', text: '{label}はYYYY/MM形式（1900/01〜2999/12）で入力してください。' },
        'E-107': { messageType: 'error', text: '同じ商品が複数の明細行で選択されています。' },
        'E-201': { messageType: 'error', text: '選択された商品は既に削除されています。' },
        'E-202': { messageType: 'error', text: '選択された商品が見つかりません。' },
        'E-203': { messageType: 'error', text: '他の操作によりデータが更新されています。最新の情報を表示しました。もう一度操作してください。' },
        'E-204': { messageType: 'error', text: '売上が登録されている商品のため、単価の変更と削除はできません。' },
        'E-205': { messageType: 'error', text: '商品コードが上限（{maxProductCode}）に達しているため、これ以上登録できません。' },
        'E-206': { messageType: 'error', text: '出力対象のデータがありません。' },
        'E-207': { messageType: 'error', text: '選択された商品は登録できません。商品の一覧を最新の状態に更新しました。' },
        'E-208': { messageType: 'error', text: '売上の登録件数が上限（{maxCount}件）を超えるため登録できません。' },
        'E-209': { messageType: 'error', text: '明細行は{maxRows}行までです。' },
        'E-901': { messageType: 'error', text: '保存データが読み込めないため、初期データを再投入しました。' },
        'E-902': { messageType: 'error', text: '保存領域に書き込めませんでした。ブラウザの空き容量を確認してください。' },
        'E-903': { messageType: 'error', text: '予期しないエラーが発生しました。（{detail}）' },
        'C-001': { messageType: 'confirm', text: '商品「{productName}」を削除します。よろしいですか？' },
        'C-002': { messageType: 'confirm', text: '明細が0件です。本日の売上をすべて削除します。よろしいですか？' }
    };

    /**
     * メッセージIDと埋め込み値から文言を組み立てる。
     * @param {string} messageID メッセージID
     * @param {object} [messageParams] メッセージに埋め込む値
     * @returns {string} 組み立てた文言
     */
    function getMessageText(messageID, messageParams) {
        const definition = MESSAGE_DEFINITIONS[messageID];
        if (definition === undefined) {
            return '';
        }
        const params = (messageParams === undefined || messageParams === null) ? {} : messageParams;
        let text = definition.text;
        Object.keys(params).forEach(function (paramName) {
            const rawValue = params[paramName];
            const embeddedValue = (COMMA_FORMATTED_PARAM_NAMES.indexOf(paramName) >= 0)
                ? format.formatNumberWithComma(rawValue)
                : String(rawValue);
            text = text.split('{' + paramName + '}').join(embeddedValue);
        });
        return text;
    }

    /**
     * メッセージIDから種別を返す。
     * @param {string} messageID メッセージID
     * @returns {string|null} 'info' / 'error' / 'confirm' のいずれか。未定義のIDは null
     */
    function getMessageType(messageID) {
        const definition = MESSAGE_DEFINITIONS[messageID];
        if (definition === undefined) {
            return null;
        }
        return definition.messageType;
    }

    const exported = {
        getMessageText,
        getMessageType
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = exported;
    } else {
        global.PMA = global.PMA || {};
        global.PMA.messages = exported;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
