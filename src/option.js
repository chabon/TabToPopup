
import { settings, getSetting, setSetting, resetSettings } from './settings.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 各設定項目を読み込んでUIに反映
    for (const [id, { elType, defaultValue }] of Object.entries(settings)) {
        const element = document.getElementById(id);
        if (!element) continue;

        const value = await getSetting(id);

        if (elType === 'checkbox') {
            element.checked = value;
        } else if (elType === 'textbox') {
            element.value = value;
        }
    }

    // イベントリスナー設定（保存）
    for (const [id, { elType }] of Object.entries(settings)) {
        const element = document.getElementById(id);
        if (!element) continue;

        element.addEventListener('change', async () => {
            let value;
            if (elType === 'checkbox') {
                value = element.checked;
            } else if (elType === 'textbox') {
                value = element.value;
            }
            await setSetting(id, value);
            console.log(`${id} is saved:`, value);
            handleSettingChange(id, value);
        });
    }

    // リセットボタンの動作(UI未実装)
    const resetButton = document.getElementById('resetOptions');
    if (resetButton) {
        resetButton.addEventListener('click', async () => {
            if (confirm('すべての設定を初期状態に戻しますか？')) {
                await resetSettings();
                alert('初期化しました。ページをリロードします。');
                location.reload();
            }
        });
    }

    // CSSのテキストボックスでTABキーを使えるようにする
    document.getElementById("cssCode").addEventListener("keydown", (e) => {
        if (e.keyCode === 9) {
            e.preventDefault();
            var elem = e.target;
            var val = elem.value;
            var pos = elem.selectionStart;
            elem.value = val.substr(0, pos) + '\t' + val.substr(pos, val.length);
            elem.setSelectionRange(pos + 1, pos + 1);
        }
    });

    // version info
    const elVerInfo = document.getElementsByName("verInfo");
    elVerInfo[0].innerText = "ver " + chrome.runtime.getManifest().version;
});


// 各設定変更時の処理
function handleSettingChange(id, value) {

    // bookmark_name_*, bookmark_url_* 変更時
    if (/^bookmark_(name|url)_\d+$/.test(id)) {
        chrome.runtime.sendMessage({ name: "TabToPopup_Command", command:"initContextMenu" }, (response) => {});
    }

    // 他のid
    switch (id) {
        case 'addRightClickMenu':
            chrome.runtime.sendMessage({ name: "TabToPopup_Command", command:"initContextMenu" }, (response) => {});
            break;
        default:
            break;
    }
}
