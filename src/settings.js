

// 設定
// 値のタイプは、object, boolean, string のいずれか(数値型は無し)
export const settings = {
    // app

    // 現在表示しているポップアップウインドウの情報
    // bookmarkではない場合、bookmarkIndex の値は -1
    // { windowId:, bookmarkIndex:, bounds:{left:, top:, width:, height:} } の配列
    popupWindows         : { key: "popupWindows"        , elType: null      , defaultValue: []        }, 

    // 前回ポップアップウインドウを閉じたときの矩形情報
    // { bookmarkIndex:, bounds:{left:, top:, width:, height:} } の配列
    prevBoundsList       : { key: "prevBoundsList"      , elType: null      , defaultValue: []        },


    // option
    closeOrgWindow       : { key: "closeOrgWindow"      , elType: "checkbox", defaultValue: true      },
    hideScrollBar        : { key: "hideScrollBar"       , elType: "checkbox", defaultValue: true      },
    addRightClickMenu    : { key: "addRightClickMenu"   , elType: "checkbox", defaultValue: false     },

    insertCSS            : { key: "insertCSS"           , elType: "checkbox", defaultValue: false     },
    cssCode              : { key: "cssCode"             , elType: "textbox",  defaultValue: ""        },

    saveWindowBounds     : { key: "saveWindowBounds"    , elType: "checkbox",  defaultValue: true     },
     
    specifyWindowSize    : { key: "specifyWindowSize"   , elType: "checkbox", defaultValue: false     },
    popupWindowWidth     : { key: "popupWindowWidth"    , elType: "textbox" , defaultValue: ""        },
    popupWindowHeight    : { key: "popupWindowHeight"   , elType: "textbox" , defaultValue: ""        },

    specifyWindowPos     : { key: "specifyWindowPos"    , elType: "checkbox", defaultValue: false     },
    popupWindowPosX      : { key: "popupWindowPosX"     , elType: "textbox" , defaultValue: ""        },
    popupWindowPosY      : { key: "popupWindowPosY"     , elType: "textbox" , defaultValue: ""        }
};

//  ブックマーク設定(上限20個)
for (let i = 0; i < 20; i++) {
  settings[`bookmark_name_${i}`]        = { key: `bookmark_name_${i}`       , elType: "textbox" , defaultValue: ""   };
  settings[`bookmark_url_${i}`]         = { key: `bookmark_url_${i}`        , elType: "textbox" , defaultValue: ""   };
  settings[`bookmark_saveBounds_${i}`]  = { key: `bookmark_saveBounds_${i}` , elType: "checkbox", defaultValue: true };
}

// 1個取得する
export async function getSetting(id) {
    if (!settings[id]) {
        throw new Error(`設定ID '${id}' が settings に存在しません`);
    }
    const { key, defaultValue } = settings[id];
    const result = await chrome.storage.local.get(key);
    return result[key] !== undefined ? result[key] : defaultValue;
}

// 1個保存する
export async function setSetting(id, value) {
    if (!settings[id]) {
        throw new Error(`設定ID '${id}' が settings に存在しません`);
    }
    const { key } = settings[id];
    await chrome.storage.local.set({ [key]: value });
}

// すべての設定をデフォルト値に初期化する
export async function resetSettings() {
    const resetData = {};
    for (const { key, defaultValue } of Object.values(settings)) {
        resetData[key] = defaultValue;
    }
    await chrome.storage.local.set(resetData);
}
