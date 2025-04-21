// ==UserScript==
// @name         JSON Fetcher Ultimate (Advanced InlineConfirm Edition, EphemeralPreview Fixed)
// @namespace    https://github.com/alicewish/
// @version      3.0
// @description  满足各种需求
// @match        *://yiyan.baidu.com/*
// @match        *://*.chatgpt.com/*
// @match        *://*.claude.ai/*
// @match        *://*.poe.com/*
// @match        *://gemini.google.com/*
// @license      MIT
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    /************************************************************************
     * 0. 统一按钮配置：集中管理所有图标、名称、提示
     *    （去除在暗色主题下会变彩色Emoji的字符，用 \uFE0E 或者非emoji字符来修正）
     ************************************************************************/
    const BUTTON_MAP = {
        // 标题栏 & 通用操作相关
        SCROLL_TOP: {icon: '↥', label: 'ScrollTop', title: '滚动到顶部'},
        SCROLL_BOTTOM: {icon: '↧', label: 'ScrollBottom', title: '滚动到底部'},
        MINIMIZE: {icon: '▁', label: 'Minimize', title: '最小化面板'},
        RESTORE: {icon: '▔', label: 'Restore', title: '还原面板'},
        CLOSE: {icon: '×', label: 'Close', title: '关闭面板'},

        // 日志面板
        DOWNLOAD_LOG: {icon: '📥', label: 'DownloadLog', title: '下载日志文件到本地'},
        CLEAR_LOGS: {icon: '🗑️', label: 'ClearLogs', title: '清空全部日志'},
        AUTO_SCROLL: {icon: '⤵️', label: 'AutoScroll', title: '自动滚动到最新日志开关'},
        WRAP_LINES: {icon: '↩️', label: 'WrapLines', title: '日志换行开关'},

        // JSON抓取面板
        THEME_TOGGLE: {icon: '🌗', label: 'ThemeToggle', title: '切换亮/暗主题'},
        TOGGLE_CAT: {icon: '⚙', label: 'ToggleCategory', title: '按分类显示或不分类'},
        COPY_JSON: {icon: '📋', label: 'CopyJSON', title: '复制此JSON到剪贴板'},
        DOWNLOAD_JSON: {icon: '⬇️', label: 'DownloadJSON', title: '下载此JSON文件'},
        PREVIEW_JSON: {icon: '👁️', label: 'PreviewJSON', title: '预览此JSON'},
        REMOVE_ITEM: {icon: '✂️', label: 'RemoveItem', title: '删除此条抓取记录'},
        DOWNLOAD_ALL: {icon: '⬇️', label: 'DownloadAll', title: '批量下载'},
        CLEAR_CATEGORY: {icon: '🗑️', label: 'ClearCategory', title: '清空此分类'},
        SORT_ASC: {icon: '🔼', label: 'SortAsc', title: '升序排序'},
        SORT_DESC: {icon: '🔽', label: 'SortDesc', title: '降序排序'},

        // 特殊数据面板
        TO_CSV: {icon: '⬇️表格', label: 'ToCSV', title: '导出所有解析数据为CSV'},
        FOLD_ALL: {icon: '⏵', label: 'FoldAll', title: '折叠所有分类'},
        UNFOLD_ALL: {icon: '⏷', label: 'UnfoldAll', title: '展开所有分类'},
        DL_SINGLE: {icon: '⬇️', label: 'DownloadSingle', title: '下载此对话'},
        TRASH: {icon: '🗑️', label: 'TrashAll', title: '清空所有解析数据'},

        // 行内确认
        CONFIRM_CHECK: {icon: '✔️', label: 'ConfirmYes', title: '确定'},
        CONFIRM_CANCEL: {icon: '×', label: 'ConfirmNo', title: '取消'}
    };


    /************************************************************************
     * 1. 全局配置 / 常量（CONFIG）
     ************************************************************************/
    const CONFIG = {
        // 初始面板位置/大小
        initialPanels: {
            logPanel: {left: '400px', top: '100px', width: 420, height: 320},
            jsonPanel: {left: '100px', top: '100px', width: 440, height: 500},
            specPanel: {left: '600px', top: '100px', width: 460, height: 360}
        },

        // 面板拖拽/缩放/吸附/透明度等 (不受主题影响)
        panelLimit: {
            defaultPanelOpacity: 0.95,  // 面板默认不透明度
            snapThreshold: 15,    // 吸附像素范围
            enableBackdropBlur: false  // 若关闭，则强制不透明背景(主题透明度失效)
        },

        // 额外功能限制或特性选项
        features: {
            enableInlineConfirm: true, // 是否启用行内确认(替代系统confirm)
            maxLogEntries: 1000, // 日志最多保留多少条，超过后丢弃最旧的
            maxJSONSizeKB: 0,    // 若 >0 则提示过大JSON, 0 不限制
            autoCleanupOnLarge: false // 若为true, 超过maxJSONSizeKB的JSON直接丢弃
        },

        // 是否在 JSON 面板标题中显示 PoW 难度(仅示例用)
        showPoWDifficulty: true,

        // 星标关键字(如 "VIP"、"myFav" 等)
        userStarKeywords: [],

        // Claude 列表 URL 正则
        claudeListUrlPatterns: [
            /\/api\/organizations\/[^/]+\/chat_conversations\?limit=10000$/i
        ],

        // Claude 批量下载选项
        claudeBatchButtons: [
            {label: '全部', days: Infinity, enabled: true, icon: '⇩全部'},
            {label: '一天', days: 1, enabled: true, icon: '⬇️一天'},
            {label: '三天', days: 3, enabled: true, icon: '⬇️三天'},
            {label: '一周', days: 7, enabled: true, icon: '⬇️一周'},
            {label: '一月', days: 30, enabled: true, icon: '⬇️一月'}
        ],

        // LocalStorage 键
        logStorageKey: 'JSONInterceptorLogs',
        settingsStorageKey: 'JSONInterceptorSettings',
        panelStatePrefix: 'FloatingPanelState_',

        // 面板外观特效 (不受主题影响)
        panelEffects: {
            borderRadius: '8px',
            defaultBoxShadow: '0 5px 16px rgba(0,0,0,0.3)',
            hoverBoxShadow: '0 5px 24px rgba(0,0,0,0.4)',
            titlebarBottomBorder: 'rgba(68,68,68,0.07)',
            minimizedHeight: '36px'
        },

        // 字号相关 (不受主题影响)
        fontSizes: {
            title: '16px', // 面板标题字号
            content: '13px', // 面板正文字号
            categoryTitle: '16px', // 分类标题字号(加大)
            categoryItem: '13px', // 分类子项字号
            log: '12px', // 日志面板
            inlineConfirm: '14px'  // 行内确认提示
        },

        // 图标按钮尺寸相关 (不受主题影响)
        iconSizes: {
            titlebarButton: '14px', // 标题栏按钮
            panelButton: '12px',
            categoryTitleButton: '14px',
            categoryItemButton: '12px'
        },

        // 与布局/间距相关的通用设置(不受主题影响)
        layout: {
            // 行内确认
            inlineConfirmPadding: '8px 12px',
            inlineConfirmButtonPadding: '2px 6px',

            // 面板拖拽把手
            dragHandleSize: '18px',
            dragHandleMargin: '0 4px',

            // 面板内容区
            floatingPanelContentPadding: '4px',

            // 分类及列表
            categoryMargin: '8px',
            categoryHeaderPadding: '4px 8px',
            itemPadding: '4px 8px',

            // 进度条
            progressBarHeight: '28px'
        },

        // 主题颜色配置 (light/dark)
        themes: {
            light: {
                // 面板
                panelTitleTextColor: '#333',
                panelTitleBgGradient: 'linear-gradient(to right, #b0c4de, #d8e6f3)',
                panelHandleColor: '#999',
                panelContentBg: 'rgba(255,255,255,0.7)',
                panelBorderColor: '#ccc',
                panelLogFontColor: '#222',
                panelJsonItemHoverBg: '#f9f9f9',
                panelHoverShadowColor: '0 5px 24px rgba(0,0,0,0.4)',

                // JSON高亮
                highlightStringColor: '#ce9178',
                highlightNumberColor: '#b5cea8',
                highlightBooleanColor: '#569cd6',
                highlightNullColor: '#569cd6',
                highlightKeyColor: '#9cdcfe',

                // 特殊数据颜色
                specialTitleColor: '#1f6feb',
                specialUuidColor: '#c678dd',
                specialUpdateColor: '#999',
                specialTaskColor: '#2b9371',

                // 进度条
                progressBarBg: '#4caf50',
                progressBarTextColor: '#333',

                // 分类面板
                categoryHeaderBg: '#f2f6fa',
                categoryBorderColor: '#ddd',
                itemHoverBg: '#f9f9f9',
                searchInputBorder: '#ccc',

                // 各类文字
                panelBtnTextColor: '#333',
                categoryTitleColor: '#444',
                searchLabelColor: '#333',
                itemDividerColor: '#eee',
                panelMinimizeBtnColor: '#333', // 最小化按钮(在light主题下)
                panelCloseBtnColor: '#c00', // 关闭按钮(在light主题下)
                foldIconColor: '#333',
                panelReopenBtnBg: '#f0f0f0',

                // 日志
                logMultiColor: true,
                logLevelColors: {
                    debug: '#666',
                    info: '#222',
                    warn: 'orange',
                    error: 'red'
                },

                // 行内确认(InlineConfirm)
                inlineConfirmBg: 'rgba(30,30,30,0.85)',
                inlineConfirmText: '#fff',
                inlineConfirmBorder: 'rgba(0,0,0,0.3)',
                inlineConfirmYesBg: '#4caf50',
                inlineConfirmYesText: '#fff',
                inlineConfirmNoBg: '#f44336',
                inlineConfirmNoText: '#fff',

                // 新增：拖拽把手内阴影、按钮悬停背景等
                dragHandleInnerShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)',
                inlineConfirmBtnBg: 'rgba(255,255,255,0.07)',
                inlineConfirmBtnHoverBg: 'rgba(255,255,255,0.12)',
                floatingReopenBtnBorder: '#999',
                jsonUrlColor: '#666',
                jsonSizeColor: '#999',
                progressWrapBg: '#f8f8f899',
                panelBtnHoverBg: 'rgba(0, 0, 0, 0.1)'
            },
            dark: {
                // 面板
                panelTitleTextColor: '#f8f8f8',
                panelTitleBgGradient: 'linear-gradient(to right, #3a3a3a, #444)',
                panelHandleColor: '#aaa',
                panelContentBg: 'rgba(25,25,25,0.88)',
                panelBorderColor: '#555',
                panelLogFontColor: '#ddd',
                panelJsonItemHoverBg: '#444',
                panelHoverShadowColor: '0 5px 24px rgba(0,0,0,0.9)',

                // JSON高亮
                highlightStringColor: '#eecd99',
                highlightNumberColor: '#cae3b0',
                highlightBooleanColor: '#7fc8f8',
                highlightNullColor: '#7fc8f8',
                highlightKeyColor: '#8fd2ff',

                // 特殊数据颜色
                specialTitleColor: '#62a8ea',
                specialUuidColor: '#c78dea',
                specialUpdateColor: '#aaa',
                specialTaskColor: '#6ccdaf',

                // 进度条
                progressBarBg: '#4caf50',
                progressBarTextColor: '#fff',

                // 分类面板
                categoryHeaderBg: '#333',
                categoryBorderColor: '#444',
                itemHoverBg: '#4a4a4a',
                searchInputBorder: '#666',

                // 各类文字
                panelBtnTextColor: '#ddd',
                categoryTitleColor: '#f0f0f0',
                searchLabelColor: '#ddd',
                itemDividerColor: '#444',
                panelMinimizeBtnColor: '#fff',    // 最小化按钮(在dark主题下)
                panelCloseBtnColor: '#ff5555', // 关闭按钮(在dark主题下)
                foldIconColor: '#ddd',
                panelReopenBtnBg: '#444',

                // 日志
                logMultiColor: true,
                logLevelColors: {
                    debug: '#aaaaaa',
                    info: '#ddd',
                    warn: 'yellow',
                    error: 'tomato'
                },

                // 行内确认(InlineConfirm)
                inlineConfirmBg: 'rgba(80,80,80,0.85)',
                inlineConfirmText: '#fff',
                inlineConfirmBorder: 'rgba(255,255,255,0.3)',
                inlineConfirmYesBg: '#4caf50',
                inlineConfirmYesText: '#fff',
                inlineConfirmNoBg: '#f44336',
                inlineConfirmNoText: '#fff',

                // 新增
                dragHandleInnerShadow: 'inset 0 1px 2px rgba(255,255,255,0.2)',
                inlineConfirmBtnBg: 'rgba(255,255,255,0.07)',
                inlineConfirmBtnHoverBg: 'rgba(255,255,255,0.12)',
                floatingReopenBtnBorder: '#999',
                jsonUrlColor: '#aaa',
                jsonSizeColor: '#999',
                progressWrapBg: '#6667',
                panelBtnHoverBg: 'rgba(255,255,255,0.1)'
            }
        },

        // 默认主题
        defaultTheme: 'light',

        // 已存在相同 URL 时的更新策略: 'larger' or 'time'
        captureUpdatePolicy: "larger",

        // 并发下载队列
        downloadQueueOptions: {
            maxConcurrent: 3,
            maxRetry: 3,
            retryDelay: 1000
        }
    };


    /************************************************************************
     * 2. 行内确认(inlineConfirm)，代替系统 confirm 弹窗
     ************************************************************************/
    function inlineConfirm(question, onYes, onNo, timeoutMs = 5000) {
        if (!CONFIG.features.enableInlineConfirm) {
            // 如果不启用行内确认，直接执行onYes
            if (onYes) onYes();
            return;
        }
        // 创建行内确认容器
        const container = document.createElement('div');
        container.className = 'inline-confirm-container';
        container.innerHTML = `
            <div class="inline-confirm-text">${question}</div>
            <button class="inline-confirm-btn inline-confirm-yes" title="${BUTTON_MAP.CONFIRM_CHECK.title}">${BUTTON_MAP.CONFIRM_CHECK.icon}</button>
            <button class="inline-confirm-btn inline-confirm-no"  title="${BUTTON_MAP.CONFIRM_CANCEL.title}">${BUTTON_MAP.CONFIRM_CANCEL.icon}</button>
        `;
        document.body.appendChild(container);

        const yesBtn = container.querySelector('.inline-confirm-yes');
        if (yesBtn) {
            yesBtn.addEventListener('click', () => {
                UILogger.logMessage(`(inlineConfirm) 用户选择：确认 => ${question}`, 'info');
                if (onYes) onYes();
                cleanup();
            });
        }
        const noBtn = container.querySelector('.inline-confirm-no');
        if (noBtn) {
            noBtn.addEventListener('click', () => {
                UILogger.logMessage(`(inlineConfirm) 用户选择：取消 => ${question}`, 'info');
                if (onNo) onNo();
                cleanup();
            });
        }

        const timer = setTimeout(() => {
            UILogger.logMessage(`(inlineConfirm) 超时自动消失 => ${question}`, 'debug');
            cleanup();
        }, timeoutMs);

        function cleanup() {
            clearTimeout(timer);
            container.remove();
        }
    }


    /************************************************************************
     * 3. 通用函数（下载、JSON高亮、错误日志、复制等）
     ************************************************************************/
    function downloadFile(text, fileName, mime = 'application/json') {
        try {
            if (!text) {
                UILogger.logMessage(`downloadFile警告: 内容为空，无法下载 -> ${fileName}`, 'warn');
                return;
            }
            if (!fileName) {
                UILogger.logMessage(`downloadFile警告: 文件名为空, 使用默认download.json`, 'warn');
                fileName = 'download.json';
            }
            const blob = new Blob([text], {type: mime});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            logErrorWithStack(err, 'downloadFile');
        }
    }

    function highlightJson(str) {
        try {
            // 转义 HTML
            str = str.replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            return str.replace(
                /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^"\\])*"(\s*:\s*)?|\b(true|false|null)\b|\b-?\d+(\.\d+)?([eE][+\-]?\d+)?\b)/g,
                match => {
                    let cls = 'number';
                    if (/^"/.test(match)) {
                        cls = /:$/.test(match) ? 'key' : 'string';
                    } else if (/true|false/.test(match)) {
                        cls = 'boolean';
                    } else if (/null/.test(match)) {
                        cls = 'null';
                    }
                    return `<span class="${cls}">${match}</span>`;
                }
            );
        } catch (err) {
            logErrorWithStack(err, 'highlightJson');
            return str;
        }
    }

    function logErrorWithStack(err, context = '') {
        const msg = `[ERROR] ${context ? (context + ': ') : ''}${err.message}\nStack: ${err.stack}`;
        UILogger.logMessage(msg, 'error');
        console.error(err);
    }

    function copyText(str) {
        try {
            navigator.clipboard.writeText(str);
            UILogger.logMessage(`已复制文本到剪贴板`, 'info');
        } catch (e) {
            UILogger.logMessage(`复制到剪贴板失败: ${e.message}`, 'error');
        }
    }


    /************************************************************************
     * 4. ZIndex & GlobalPanels 管理
     ************************************************************************/
    const ZIndexManager = {
        currentZIndex: 999999,
        /**
         * 将某个元素提升到最前
         * @param {HTMLElement} el 目标元素
         */
        bringToFront(el) {
            this.currentZIndex++;
            el.style.zIndex = String(this.currentZIndex);
        }
    };

    const GlobalPanels = {
        panels: [],
        register(panel) {
            this.panels.push(panel);
        },
        unregister(panel) {
            const idx = this.panels.indexOf(panel);
            if (idx >= 0) this.panels.splice(idx, 1);
        },
        getAllPanels() {
            return this.panels;
        }
    };


    /************************************************************************
     * 5. BaseFloatingPanel (面板基类)
     *    新增onDragStart/onDragEnd/onDestroy/onReopen，优化事件回调与日志
     ************************************************************************/
    class BaseFloatingPanel {
        /**
         * @param {Object} options 初始化选项
         * @param {string}    options.id                    面板ID(用于保存/加载位置尺寸)
         * @param {string}    options.title                 面板标题
         * @param {string|number} options.defaultLeft       初始left
         * @param {string|number} options.defaultTop        初始top
         * @param {number}    options.defaultWidth          初始宽度
         * @param {number}    options.defaultHeight         初始高度
         * @param {boolean}   options.showReopenBtn         是否显示"重新打开"按钮
         * @param {string}    options.reopenBtnText         重新打开按钮文字
         * @param {string}    options.reopenBtnTop          重新打开按钮的top定位
         * @param {boolean}   options.allowResize           是否允许拖拽缩放
         * @param {boolean}   options.destroyOnClose        关闭后是否直接销毁DOM
         * @param {boolean}   options.doubleClickTitleToToggleMaximize 是否双击标题栏自动最大化切换
         *
         * @param {Function}  options.onClose               关闭回调
         * @param {Function}  options.onMinimize            最小化回调
         * @param {Function}  options.onRestore             还原回调
         * @param {Function}  options.onFocus               面板获得焦点(点击)回调
         * @param {Function}  options.onOpen                面板初次打开时的回调
         * @param {Function}  options.onDestroy             面板真正destroy时的回调
         * @param {Function}  options.onReopen              面板重新打开时的回调
         * @param {Function}  options.onDragStart           拖拽开始回调
         * @param {Function}  options.onDragEnd             拖拽结束回调
         */
        constructor(options = {}) {
            const {
                id = '',
                title = '浮动面板',
                defaultLeft = '50px',
                defaultTop = '50px',
                defaultWidth = 300,
                defaultHeight = 200,
                showReopenBtn = true,
                reopenBtnText = '打开面板',
                reopenBtnTop = '10px',
                allowResize = true,
                destroyOnClose = false,
                doubleClickTitleToToggleMaximize = false,

                onClose = () => {
                },
                onMinimize = () => {
                },
                onRestore = () => {
                },
                onFocus = () => {
                },
                onOpen = () => {
                },
                onDestroy = () => {
                },
                onReopen = () => {
                },
                onDragStart = () => {
                },
                onDragEnd = () => {
                }
            } = options;

            // 保存初始化参数
            this.id = id;
            this.title = title;
            this.showReopenBtn = showReopenBtn;
            this.reopenBtnText = reopenBtnText;
            this.reopenBtnTop = reopenBtnTop;
            this.allowResize = allowResize;
            this.destroyOnClose = destroyOnClose;
            this.doubleClickTitleToToggleMaximize = doubleClickTitleToToggleMaximize;

            // 回调
            this.onClose = onClose;
            this.onMinimize = onMinimize;
            this.onRestore = onRestore;
            this.onFocus = onFocus;
            this.onOpen = onOpen;
            this.onDestroy = onDestroy;
            this.onReopen = onReopen;
            this.onDragStart = onDragStart;
            this.onDragEnd = onDragEnd;

            // 面板的状态记录
            this.panelState = {
                minimized: false,
                closed: false,
                isMaximized: false,  // 可选：是否最大化
                left: defaultLeft,
                top: defaultTop,
                width: defaultWidth + 'px',
                height: defaultHeight + 'px',
                restoredHeight: defaultHeight + 'px'
            };

            try {
                this.initDOM(defaultHeight);
                GlobalPanels.register(this);
                this.loadState(defaultHeight);
                this.initDragEvents();
                this.initResizeObserver();
                this.updatePanelBackgroundByTheme();
                this.initTitlebarDoubleClick();

                UILogger.logMessage(`[BaseFloatingPanel] 面板已创建并初始化: ${title}`, 'info');
                this.onOpen(); // 初次创建时执行onOpen
            } catch (err) {
                logErrorWithStack(err, 'BaseFloatingPanel constructor');
            }
        }

        /**
         * 快速创建一个按钮，根据 BUTTON_MAP 的配置
         * @param {string} btnKey 对应 BUTTON_MAP 的键
         * @param {Function} onClick 点击回调
         * @returns {HTMLButtonElement}
         */
        static createPanelButton(btnKey, onClick = null) {
            const cfg = BUTTON_MAP[btnKey];
            if (!cfg) {
                UILogger.logMessage(`[createPanelButton] 未找到按钮配置: ${btnKey}`, 'warn');
                const fallbackBtn = document.createElement('button');
                fallbackBtn.textContent = btnKey;
                if (onClick) fallbackBtn.addEventListener('click', onClick);
                return fallbackBtn;
            }
            const btn = document.createElement('button');
            btn.className = 'floating-panel-btn';
            btn.textContent = cfg.icon;
            btn.title = cfg.title;
            if (onClick) {
                btn.addEventListener('click', onClick);
            }
            return btn;
        }

        /**
         * 初始化DOM结构
         * @param {number} defaultHeight 面板默认高度
         */
        initDOM(defaultHeight) {
            // 主容器
            this.container = document.createElement('div');
            this.container.classList.add('floating-panel-container', 'floating-panel');
            if (this.id) this.container.id = this.id;

            // 初始位置与尺寸
            this.container.style.left = this.panelState.left;
            this.container.style.top = this.panelState.top;
            this.container.style.width = this.panelState.width;
            this.container.style.height = this.panelState.height;
            this.container.style.opacity = String(CONFIG.panelLimit.defaultPanelOpacity);

            // 如果不启用毛玻璃，则强制全不透明
            if (!CONFIG.panelLimit.enableBackdropBlur) {
                const theme = UIManager?.globalSettings?.currentTheme || CONFIG.defaultTheme;
                const themeVars = CONFIG.themes[theme] || CONFIG.themes.light;
                let forcedBg = themeVars.panelContentBg;
                forcedBg = forcedBg.replace(/(\d+,\s*\d+,\s*\d+),\s*([\d\.]+)/, '$1,1'); // 透明度改为1
                this.container.style.background = forcedBg;
                this.container.style.backdropFilter = 'none';
            }

            if (!this.allowResize) {
                this.container.style.resize = 'none';
            }

            // 标题栏
            this.titlebar = document.createElement('div');
            this.titlebar.className = 'floating-panel-titlebar';

            // 拖拽把手
            this.dragHandle = document.createElement('div');
            this.dragHandle.className = 'floating-panel-drag-handle';

            // 标题文本
            this.titleSpan = document.createElement('span');
            this.titleSpan.className = 'floating-panel-title';
            this.titleSpan.textContent = this.title;

            // 标题栏按钮（右侧：滚动、最小化、关闭）
            this.btnScrollTop = BaseFloatingPanel.createPanelButton('SCROLL_TOP', () => this.scrollToTop());
            this.btnScrollBottom = BaseFloatingPanel.createPanelButton('SCROLL_BOTTOM', () => this.scrollToBottom());
            this.btnMinimize = BaseFloatingPanel.createPanelButton('MINIMIZE', () => this.toggleMinimize());
            this.btnMinimize.classList.add('minimize-btn');
            this.btnClose = BaseFloatingPanel.createPanelButton('CLOSE', () => this.close());
            this.btnClose.classList.add('close-btn');

            // 组装标题栏
            const fragTitle = document.createDocumentFragment();
            fragTitle.appendChild(this.dragHandle);
            fragTitle.appendChild(this.titleSpan);
            fragTitle.appendChild(this.btnScrollTop);
            fragTitle.appendChild(this.btnScrollBottom);
            fragTitle.appendChild(this.btnMinimize);
            fragTitle.appendChild(this.btnClose);
            this.titlebar.appendChild(fragTitle);

            // 内容区
            this.contentEl = document.createElement('div');
            this.contentEl.className = 'floating-panel-content';
            this.contentEl.style.padding = CONFIG.layout.floatingPanelContentPadding;

            // 将标题栏和内容区插入容器
            this.container.appendChild(this.titlebar);
            this.container.appendChild(this.contentEl);
            document.body.appendChild(this.container);

            // 重新打开按钮(默认隐藏)
            this.reopenBtn = document.createElement('button');
            this.reopenBtn.className = 'floating-reopen-btn';
            this.reopenBtn.textContent = this.reopenBtnText;
            this.reopenBtn.style.top = this.reopenBtnTop;
            this.reopenBtn.style.display = 'none'; // 默认隐藏
            document.body.appendChild(this.reopenBtn);
            this.reopenBtn.addEventListener('click', () => this.reopen());
        }

        /**
         * 是否允许双击标题栏实现最大化/还原
         */
        initTitlebarDoubleClick() {
            if (!this.doubleClickTitleToToggleMaximize) return;
            this.titlebar.addEventListener('dblclick', () => {
                this.toggleMaximize();
            });
        }

        /**
         * 切换最大化 / 还原
         * 示例用：若不需要，可自行移除
         */
        toggleMaximize() {
            const isMax = this.panelState.isMaximized;
            if (!isMax) {
                // 记录当前rect
                const rect = this.container.getBoundingClientRect();
                this.panelState.oldLeft = rect.left + 'px';
                this.panelState.oldTop = rect.top + 'px';
                this.panelState.oldWidth = rect.width + 'px';
                this.panelState.oldHeight = rect.height + 'px';
                this.container.style.left = '0px';
                this.container.style.top = '0px';
                this.container.style.width = window.innerWidth + 'px';
                this.container.style.height = window.innerHeight + 'px';
                this.panelState.isMaximized = true;
                UILogger.logMessage(`[BaseFloatingPanel] 最大化: ${this.title}`, 'info');
            } else {
                // 还原
                this.container.style.left = this.panelState.oldLeft;
                this.container.style.top = this.panelState.oldTop;
                this.container.style.width = this.panelState.oldWidth;
                this.container.style.height = this.panelState.oldHeight;
                this.panelState.isMaximized = false;
                UILogger.logMessage(`[BaseFloatingPanel] 取消最大化: ${this.title}`, 'info');
            }
        }

        /**
         * 根据当前主题更新面板背景等
         */
        updatePanelBackgroundByTheme() {
            try {
                const theme = UIManager?.globalSettings?.currentTheme || CONFIG.defaultTheme;
                const themeVars = CONFIG.themes[theme] || CONFIG.themes.light;
                if (CONFIG.panelLimit.enableBackdropBlur) {
                    this.container.style.backdropFilter = 'blur(4px)';
                } else {
                    this.container.style.backdropFilter = 'none';
                }
                let bg = themeVars.panelContentBg;
                if (!CONFIG.panelLimit.enableBackdropBlur) {
                    // 强制不透明
                    bg = bg.replace(/(\d+,\s*\d+,\s*\d+),\s*([\d\.]+)/, '$1,1');
                }
                this.container.style.background = bg;
            } catch (err) {
                logErrorWithStack(err, 'updatePanelBackgroundByTheme');
            }
        }

        /**
         * 初始化拖拽事件
         */
        initDragEvents() {
            let offsetX = 0, offsetY = 0;
            let startLeft = 0, startTop = 0;
            let mouseDown = false;

            const onMove = (e) => {
                if (!mouseDown) return;
                const deltaX = e.clientX - offsetX;
                const deltaY = e.clientY - offsetY;
                this.container.style.left = (startLeft + deltaX) + 'px';
                this.container.style.top = (startTop + deltaY) + 'px';
            };

            const onUp = () => {
                if (!mouseDown) return;
                mouseDown = false;
                this.snapToEdges(); // 吸附
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);

                this.saveState();
                UILogger.logMessage(`[BaseFloatingPanel] 拖拽结束 => left=${this.container.style.left}, top=${this.container.style.top}`, 'debug');
                this.onDragEnd();
            };

            this.dragHandle.addEventListener('mousedown', e => {
                e.preventDefault();
                e.stopPropagation();
                ZIndexManager.bringToFront(this.container);
                this.onFocus(); // 用户点击了面板

                offsetX = e.clientX;
                offsetY = e.clientY;
                const rect = this.container.getBoundingClientRect();
                startLeft = rect.left;
                startTop = rect.top;
                mouseDown = true;
                this.onDragStart();

                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
                UILogger.logMessage(`[BaseFloatingPanel] 开始拖拽: ${this.title}`, 'debug');
            });

            // 点击面板时置顶
            this.container.addEventListener('mousedown', () => {
                ZIndexManager.bringToFront(this.container);
                this.onFocus();
            });
        }

        /**
         * 若支持 ResizeObserver，则监听面板 resize
         */
        initResizeObserver() {
            if (!this.allowResize) return;
            if (typeof ResizeObserver !== 'function') return;

            try {
                this.resizeObserver = new ResizeObserver(() => {
                    if (!this.panelState.minimized && !this.panelState.isMaximized) {
                        const rect = this.container.getBoundingClientRect();
                        this.panelState.restoredHeight = rect.height + 'px';
                    }
                    this.saveState();
                });
                this.resizeObserver.observe(this.container);
            } catch (err) {
                logErrorWithStack(err, 'initResizeObserver');
            }
        }

        /**
         * 边缘吸附逻辑
         */
        snapToEdges() {
            try {
                const rect = this.container.getBoundingClientRect();
                let left = rect.left;
                let top = rect.top;
                const sw = window.innerWidth;
                const sh = window.innerHeight;
                const t = CONFIG.panelLimit.snapThreshold;

                // 与窗口四边吸附
                if (left < t) left = 0;
                else if (sw - (left + rect.width) < t) left = sw - rect.width;
                if (top < t) top = 0;
                else if (sh - (top + rect.height) < t) top = sh - rect.height;

                // 与其他面板吸附
                const panels = GlobalPanels.getAllPanels();
                for (const p of panels) {
                    if (p === this || p.panelState.closed) continue;
                    const r2 = p.container.getBoundingClientRect();
                    const dxLeft = Math.abs(left - r2.right);
                    const dxRight = Math.abs((left + rect.width) - r2.left);
                    const dyTop = Math.abs(top - r2.bottom);
                    const dyBottom = Math.abs((top + rect.height) - r2.top);
                    const horizontallyOverlap = (top + rect.height >= r2.top && top <= r2.bottom);
                    const verticallyOverlap = (left + rect.width >= r2.left && left <= r2.right);

                    if (dxLeft < t && horizontallyOverlap) {
                        left = r2.right;
                    }
                    if (dxRight < t && horizontallyOverlap) {
                        left = r2.left - rect.width;
                    }
                    if (dyTop < t && verticallyOverlap) {
                        top = r2.bottom;
                    }
                    if (dyBottom < t && verticallyOverlap) {
                        top = r2.top - rect.height;
                    }
                }

                this.container.style.left = left + 'px';
                this.container.style.top = top + 'px';
            } catch (err) {
                logErrorWithStack(err, 'snapToEdges');
            }
        }

        /**
         * 从 localStorage 中加载面板状态
         * @param {number} defaultHeight
         */
        loadState(defaultHeight) {
            if (!this.id) return;
            try {
                const key = CONFIG.panelStatePrefix + this.id;
                const saved = localStorage.getItem(key);
                if (!saved) return;
                const st = JSON.parse(saved);
                if (!st) return;
                Object.assign(this.panelState, st);

                // 兼容无效数据
                if (!this.panelState.restoredHeight || parseInt(this.panelState.restoredHeight) < 10) {
                    this.panelState.restoredHeight = defaultHeight + 'px';
                }
                const {
                    minimized, closed, left, top, width, height,
                    restoredHeight, isMaximized
                } = this.panelState;

                this.container.style.left = left;
                this.container.style.top = top;
                this.container.style.width = width;

                this.container.style.height = minimized
                    ? CONFIG.panelEffects.minimizedHeight
                    : (restoredHeight || height);

                // 若最大化
                if (isMaximized) {
                    this.toggleMaximize(); // 恢复最大化
                }

                // 若最小化
                if (minimized) {
                    this.container.classList.add('minimized');
                    this.contentEl.style.display = 'none';
                    this.btnMinimize.textContent = BUTTON_MAP.RESTORE.icon;
                    this.btnMinimize.title = BUTTON_MAP.RESTORE.title;
                }
                // 若关闭
                if (closed) {
                    this.container.style.display = 'none';
                    if (this.showReopenBtn) {
                        this.reopenBtn.style.display = 'block';
                    }
                }
            } catch (err) {
                logErrorWithStack(err, 'BaseFloatingPanel loadState');
            }
        }

        /**
         * 将面板状态存储到 localStorage
         */
        saveState() {
            if (!this.id) return;
            try {
                const rect = this.container.getBoundingClientRect();
                this.panelState.left = this.container.style.left || (rect.left + 'px');
                this.panelState.top = this.container.style.top || (rect.top + 'px');
                this.panelState.width = this.container.style.width || (rect.width + 'px');
                if (!this.panelState.minimized && !this.panelState.isMaximized) {
                    this.panelState.restoredHeight = this.container.style.height || (rect.height + 'px');
                }
                this.panelState.height = this.container.style.height || (rect.height + 'px');
                localStorage.setItem(CONFIG.panelStatePrefix + this.id, JSON.stringify(this.panelState));
            } catch (err) {
                logErrorWithStack(err, 'BaseFloatingPanel saveState');
            }
        }

        /**
         * 设置面板标题
         * @param {string} newTitle
         */
        setTitle(newTitle) {
            this.titleSpan.textContent = newTitle;
        }

        /**
         * 切换面板最小化/还原
         */
        toggleMinimize() {
            const willMinimize = !this.panelState.minimized;
            if (willMinimize) {
                // 记录还原前的高度
                const rect = this.container.getBoundingClientRect();
                if (rect.height > 40) {
                    this.panelState.restoredHeight = rect.height + 'px';
                }
                this.panelState.minimized = true;
                this.container.classList.add('minimized');
                this.container.style.height = CONFIG.panelEffects.minimizedHeight;
                this.contentEl.style.display = 'none';
                this.btnMinimize.textContent = BUTTON_MAP.RESTORE.icon;
                this.btnMinimize.title = BUTTON_MAP.RESTORE.title;
                UILogger.logMessage(`[BaseFloatingPanel] 已最小化: ${this.title}`, 'info');
                this.onMinimize();
            } else {
                this.panelState.minimized = false;
                this.container.classList.remove('minimized');
                const rh = this.panelState.restoredHeight || '200px';
                this.container.style.height = rh;
                this.contentEl.style.display = 'block';
                this.btnMinimize.textContent = BUTTON_MAP.MINIMIZE.icon;
                this.btnMinimize.title = BUTTON_MAP.MINIMIZE.title;
                UILogger.logMessage(`[BaseFloatingPanel] 已还原: ${this.title}`, 'info');
                this.onRestore();
            }
            this.saveState();
        }

        /**
         * 关闭面板
         */
        close() {
            if (this.destroyOnClose) {
                // 直接销毁模式
                UILogger.logMessage(`[BaseFloatingPanel] destroyOnClose => ${this.title}`, 'info');
                this.onClose();
                this.destroy();
                return;
            }
            // 否则正常“关闭”逻辑
            this.panelState.closed = true;
            this.panelState.minimized = false;
            this.container.style.display = 'none';
            if (this.showReopenBtn) {
                this.reopenBtn.style.display = 'block';
            }
            UILogger.logMessage(`[BaseFloatingPanel] 已关闭: ${this.title}`, 'info');
            this.onClose();
            this.saveState();
        }

        /**
         * 重新打开面板
         */
        reopen() {
            this.panelState.closed = false;
            this.container.style.display = 'flex';
            if (this.showReopenBtn) {
                this.reopenBtn.style.display = 'none';
            }
            if (this.panelState.minimized) {
                this.container.classList.add('minimized');
                this.container.style.height = CONFIG.panelEffects.minimizedHeight;
                this.contentEl.style.display = 'none';
                this.btnMinimize.textContent = BUTTON_MAP.RESTORE.icon;
                this.btnMinimize.title = BUTTON_MAP.RESTORE.title;
            } else {
                this.container.classList.remove('minimized');
                this.contentEl.style.display = 'block';
                this.btnMinimize.textContent = BUTTON_MAP.MINIMIZE.icon;
                this.btnMinimize.title = BUTTON_MAP.MINIMIZE.title;
                this.container.style.height = this.panelState.restoredHeight;
            }
            this.updatePanelBackgroundByTheme();
            this.saveState();
            UILogger.logMessage(`[BaseFloatingPanel] 重新打开: ${this.title}`, 'info');
            this.onReopen();
        }

        /**
         * 完全销毁面板(从DOM中移除)
         */
        destroy() {
            GlobalPanels.unregister(this);
            if (this.container) {
                this.container.remove();
            }
            if (this.reopenBtn) {
                this.reopenBtn.remove();
            }
            UILogger.logMessage(`[BaseFloatingPanel] 已销毁: ${this.title}`, 'info');
            this.onDestroy();
        }

        /**
         * 内容区滚动到顶部
         */
        scrollToTop() {
            this.contentEl.scrollTop = 0;
            UILogger.logMessage(`[BaseFloatingPanel] scrollToTop: ${this.title}`, 'debug');
        }

        /**
         * 内容区滚动到底部
         */
        scrollToBottom() {
            this.contentEl.scrollTop = this.contentEl.scrollHeight;
            UILogger.logMessage(`[BaseFloatingPanel] scrollToBottom: ${this.title}`, 'debug');
        }

        /**
         * 静态方法: 打开一个临时预览面板(可用于JSON或其他文本)
         * @param {string} title
         * @param {string} jsonString
         */
        static openPreviewPanel(title, jsonString) {
            // 如果上一次还留有 window.__globalEphemeralPanel，就先销毁它
            if (window.__globalEphemeralPanel) {
                window.__globalEphemeralPanel.destroy();
                window.__globalEphemeralPanel = null;
            }

            const ephemeralPanel = new BaseFloatingPanel({
                title: `JSON预览: ${title}`,
                defaultLeft: '120px',
                defaultTop: '120px',
                defaultWidth: 600,
                defaultHeight: 400,
                showReopenBtn: false,  // 不需要“打开面板”按钮
                destroyOnClose: true,  // 关闭后直接销毁
                onClose: () => {
                    // 清空全局引用
                    if (window.__globalEphemeralPanel === ephemeralPanel) {
                        window.__globalEphemeralPanel = null;
                    }
                }
            });

            let pretty = jsonString;
            try {
                const obj = JSON.parse(jsonString);
                pretty = JSON.stringify(obj, null, 2);
            } catch (e) {
                // 若 parse 失败，就保持原字符串
            }
            const html = `<div class="json-preview">${highlightJson(pretty)}</div>`;

            ephemeralPanel.contentEl.innerHTML = `
                <div class="json-preview-content" style="flex:1;overflow:auto;padding:8px;">${html}</div>
            `;
            ephemeralPanel.updatePanelBackgroundByTheme();
            ephemeralPanel.container.style.zIndex = String(ZIndexManager.currentZIndex + 1);
            window.__globalEphemeralPanel = ephemeralPanel;

            UILogger.logMessage(`[BaseFloatingPanel] 打开临时预览面板 => ${title}`, 'info');
        }
    }


    /************************************************************************
     * 6. 并发下载队列(DownloadQueue) - 附加日志
     ************************************************************************/
    class DownloadQueue {
        /**
         * @param {Object} options
         * @param {number} options.maxConcurrent 并发数
         * @param {number} options.maxRetry 重试次数
         * @param {number} options.retryDelay 重试延时
         */
        constructor(options = {}) {
            this.maxConcurrent = options.maxConcurrent || 3;
            this.maxRetry = options.maxRetry || 3;
            this.retryDelay = options.retryDelay || 1000;

            this.queue = [];
            this.activeCount = 0;
            this.results = [];
            this.onProgress = (doneCount, total, task) => {
            };
            this.onComplete = (successCount, failCount, results) => {
            };
        }

        /**
         * 添加任务
         * @param {any}      taskInfo  任务信息(自定义)
         * @param {Function} taskFn    必须返回 Promise 的函数
         */
        addTask(taskInfo, taskFn) {
            this.queue.push({
                info: taskInfo,
                fn: taskFn,
                retryCount: 0,
                success: false,
                error: null
            });
        }

        start() {
            UILogger.logMessage(`[DownloadQueue] start: total=${this.queue.length}`, 'debug');
            this.next();
        }

        next() {
            if (this.queue.length === 0 && this.activeCount === 0) {
                const successCount = this.results.filter(r => r.success).length;
                const failCount = this.results.length - successCount;
                UILogger.logMessage(`[DownloadQueue] 完成: 成功=${successCount}, 失败=${failCount}`, failCount > 0 ? 'warn' : 'info');
                this.onComplete(successCount, failCount, this.results);
                return;
            }
            if (this.activeCount >= this.maxConcurrent) return;

            const task = this.queue.shift();
            if (!task) return;
            this.activeCount++;

            task.fn().then(() => {
                task.success = true;
                this.results.push(task);
                this.activeCount--;
                const doneCount = this.results.length;
                const totalCount = this.results.length + this.queue.length;
                this.onProgress(doneCount, totalCount, task);
                this.next();
            }).catch(err => {
                task.retryCount++;
                task.error = err;
                if (task.retryCount <= this.maxRetry) {
                    UILogger.logMessage(`[DownloadQueue] 任务失败, 重试(${task.retryCount}): ${err.message}`, 'warn');
                    setTimeout(() => {
                        this.activeCount--;
                        this.queue.unshift(task);
                        this.next();
                    }, this.retryDelay);
                } else {
                    UILogger.logMessage(`[DownloadQueue] 任务彻底失败: ${err.message}`, 'error');
                    this.results.push(task);
                    this.activeCount--;
                    const doneCount = this.results.length;
                    const totalCount = this.results.length + this.queue.length;
                    this.onProgress(doneCount, totalCount, task);
                    this.next();
                }
            });

            this.next();
        }
    }


    /************************************************************************
     * 7. 日志系统（UILogger）、请求拦截器、PoW 解析
     ************************************************************************/
    const UILogger = {
        logEntries: [],
        logPanel: null,
        logListEl: null,
        autoScroll: true,
        wrapLines: false,

        init() {
            try {
                const saved = localStorage.getItem(CONFIG.logStorageKey);
                if (saved) {
                    const arr = JSON.parse(saved);
                    if (Array.isArray(arr)) {
                        this.logEntries = arr;
                    }
                }
            } catch (e) {
            }

            this.createLogPanel();
        },

        createLogPanel() {
            const initPos = CONFIG.initialPanels.logPanel;
            this.logPanel = new BaseFloatingPanel({
                id: 'log-panel-container',
                title: '操作日志',
                defaultLeft: initPos.left,
                defaultTop: initPos.top,
                defaultWidth: initPos.width,
                defaultHeight: initPos.height,
                reopenBtnText: '打开日志面板',
                reopenBtnTop: '50px',
                allowResize: true,
                onClose: () => this.logMessage('日志面板已关闭', 'info'),
                onMinimize: () => this.logMessage('日志面板已最小化', 'info'),
                onRestore: () => this.logMessage('日志面板已还原', 'info'),
                onFocus: () => this.logMessage('日志面板获得焦点', 'debug'),
                onOpen: () => this.logMessage('日志面板创建完成', 'debug')
            });

            // 顶部按钮：下载日志、清空日志、自动滚动、换行开关
            const btnDownload = BaseFloatingPanel.createPanelButton('DOWNLOAD_LOG', () => this.downloadLogs());
            const btnClear = BaseFloatingPanel.createPanelButton('CLEAR_LOGS', () => {
                inlineConfirm('确定要清空日志吗？此操作不可恢复。', () => {
                    this.clearLogs();
                    this.logMessage('已清空日志', 'warn');
                });
            });
            const btnAutoScroll = BaseFloatingPanel.createPanelButton('AUTO_SCROLL', () => {
                this.autoScroll = !this.autoScroll;
                this.logMessage(`自动滚动已切换为 ${this.autoScroll}`, 'info');
                btnAutoScroll.style.opacity = this.autoScroll ? '1' : '0.5';
            });
            btnAutoScroll.style.opacity = this.autoScroll ? '1' : '0.5';

            const btnWrap = BaseFloatingPanel.createPanelButton('WRAP_LINES', () => {
                this.wrapLines = !this.wrapLines;
                this.updateWrapMode();
                this.logMessage(`换行模式已切换为 ${this.wrapLines}`, 'info');
                btnWrap.style.opacity = this.wrapLines ? '1' : '0.5';
            });
            btnWrap.style.opacity = this.wrapLines ? '1' : '0.5';

            const fragTitle = document.createDocumentFragment();
            fragTitle.appendChild(btnDownload);
            fragTitle.appendChild(btnClear);
            fragTitle.appendChild(btnAutoScroll);
            fragTitle.appendChild(btnWrap);
            this.logPanel.titlebar.insertBefore(fragTitle, this.logPanel.btnMinimize);

            // 日志列表
            const ul = document.createElement('ul');
            ul.className = 'log-panel-list';
            this.logListEl = ul;
            this.logPanel.contentEl.appendChild(ul);

            // 加载旧日志
            this.logEntries.forEach(ent => {
                const level = this.getLogLevel(ent);
                ul.appendChild(this.createLogLi(ent, level));
            });
            this.scrollToBottomIfNeeded();
        },

        updateWrapMode() {
            if (!this.logListEl) return;
            if (this.wrapLines) {
                this.logListEl.classList.add('wrap-lines');
            } else {
                this.logListEl.classList.remove('wrap-lines');
            }
        },

        /**
         * 记录日志
         * @param {string} msg
         * @param {string} level debug/info/warn/error
         */
        logMessage(msg, level = 'info') {
            const timeStr = new Date().toLocaleTimeString();
            const line = `[${timeStr}][${level}] ${msg}`;
            this.logEntries.push(line);

            // 若超出最大限制，则移除最旧
            if (CONFIG.features.maxLogEntries > 0 && this.logEntries.length > CONFIG.features.maxLogEntries) {
                this.logEntries.splice(0, this.logEntries.length - CONFIG.features.maxLogEntries);
            }
            try {
                localStorage.setItem(CONFIG.logStorageKey, JSON.stringify(this.logEntries));
            } catch (e) {
            }

            if (this.logListEl) {
                const li = this.createLogLi(line, level);
                this.logListEl.appendChild(li);
                this.scrollToBottomIfNeeded();
            }
        },

        getLogLevel(line) {
            const re = /^\[.+?\]\[([^]+?)\]/;
            const m = line.match(re);
            if (m) return m[1];
            return 'info';
        },

        createLogLi(line, level = 'info') {
            const li = document.createElement('li');
            li.className = 'log-line';

            const themeName = UIManager?.globalSettings?.currentTheme || CONFIG.defaultTheme;
            const themeVars = CONFIG.themes[themeName] || CONFIG.themes.light;
            const multiColor = themeVars.logMultiColor !== false;

            if (multiColor) {
                // 拆分出时间、级别、消息
                const re = /^\[([^]+?)\]\[([^]+?)\]\s(.*)$/;
                const m = re.exec(line);
                if (m) {
                    const [_, timePart, lvlPart, msgPart] = m;
                    const timeSpan = document.createElement('span');
                    timeSpan.style.color = '#999';
                    timeSpan.textContent = `[${timePart}]`;

                    const lvlSpan = document.createElement('span');
                    const lvlCol = themeVars.logLevelColors[level] || '#000';
                    lvlSpan.style.color = lvlCol;
                    lvlSpan.textContent = `[${lvlPart}]`;

                    const msgSpan = document.createElement('span');
                    msgSpan.style.marginLeft = '4px';
                    msgSpan.textContent = msgPart;

                    li.appendChild(timeSpan);
                    li.appendChild(lvlSpan);
                    li.appendChild(msgSpan);
                } else {
                    li.textContent = line;
                }
            } else {
                li.textContent = line;
            }
            return li;
        },

        scrollToBottomIfNeeded() {
            if (!this.autoScroll || !this.logListEl) return;
            setTimeout(() => {
                this.logListEl.scrollTop = this.logListEl.scrollHeight;
            }, 0);
        },

        downloadLogs() {
            const t = document.title.replace(/[\\/:*?"<>|]/g, '_') || 'log';
            const now = new Date();
            const y = now.getFullYear();
            const M = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            const ss = String(now.getSeconds()).padStart(2, '0');
            const fn = `${t}-${y}${M}${d}-${hh}${mm}${ss}.log`;

            const txt = this.logEntries.join('\n');
            downloadFile(txt, fn, 'text/plain');
            this.logMessage(`日志已下载: ${fn}`, 'info');
        },

        clearLogs() {
            this.logEntries = [];
            try {
                localStorage.setItem(CONFIG.logStorageKey, '[]');
            } catch (e) {
            }
            if (this.logListEl) {
                this.logListEl.innerHTML = '';
            }
        }
    };

    // 请求拦截器
    const RequestInterceptor = {
        capturedRequests: [],
        starUuid: '',

        init() {
            this.overrideXHR();
            this.overrideFetch();
        },

        overrideXHR() {
            const origOpen = XMLHttpRequest.prototype.open;
            const origSend = XMLHttpRequest.prototype.send;

            XMLHttpRequest.prototype.open = function (method, url, ...rest) {
                this._requestMethod = method;
                this._requestUrl = url;
                return origOpen.apply(this, [method, url, ...rest]);
            };

            XMLHttpRequest.prototype.send = function (...args) {
                this.addEventListener('loadend', () => {
                    try {
                        const ct = this.getResponseHeader('content-type') || '';
                        if (RequestInterceptor.isJson(ct) && RequestInterceptor.shouldCapture(this._requestUrl)) {
                            const respText = this.responseText;
                            const status = this.status;
                            const cLen = this.getResponseHeader('Content-Length');
                            let headersObj = {};
                            if (cLen) headersObj['Content-Length'] = cLen;

                            RequestInterceptor.addCaptured(
                                this._requestUrl,
                                respText,
                                this._requestMethod,
                                status,
                                headersObj
                            );
                        }
                    } catch (e) {
                        UILogger.logMessage(`XHR抓取异常: ${e.message}`, 'error');
                    }
                });
                return origSend.apply(this, args);
            };
        },

        overrideFetch() {
            if (!window.fetch) return;
            const origFetch = window.fetch;
            window.fetch = async (input, init) => {
                const fetchP = origFetch(input, init);
                try {
                    const url = (typeof input === 'string') ? input : (input.url || '');
                    const resp = await fetchP;
                    const ct = resp.headers.get('content-type') || '';
                    const status = resp.status;

                    const cLen = resp.headers.get('content-length');
                    let headersObj = {};
                    if (cLen) headersObj['Content-Length'] = cLen;

                    if (this.isJson(ct) && this.shouldCapture(url)) {
                        const cloneResp = resp.clone();
                        const text = await cloneResp.text();
                        const method = (init && init.method) || 'GET';
                        this.addCaptured(url, text, method, status, headersObj);
                    }
                    return resp;
                } catch (e) {
                    UILogger.logMessage(`fetch抓取异常: ${e.message}`, 'error');
                    return fetchP;
                }
            };
        },

        isJson(ct) {
            return ct.toLowerCase().includes('application/json');
        },
        shouldCapture(url) {
            return !!url;
        },

        findCapturedItemByUrl(url) {
            return this.capturedRequests.find(it => it.url === url);
        },

        addCaptured(url, content, method, status, headersObj) {
            const sizeKB = content.length / 1024;
            if (CONFIG.features.maxJSONSizeKB > 0 && sizeKB > CONFIG.features.maxJSONSizeKB) {
                if (CONFIG.features.autoCleanupOnLarge) {
                    UILogger.logMessage(`过大JSON已跳过(自动丢弃): ${url}`, 'warn');
                    return;
                } else {
                    UILogger.logMessage(`捕获到过大JSON(${sizeKB.toFixed(2)}KB): ${url}`, 'warn');
                }
            }
            const existing = this.findCapturedItemByUrl(url);
            if (existing) {
                // 若已存在则按策略更新
                const policy = CONFIG.captureUpdatePolicy;
                if (policy === 'larger') {
                    if (content.length > existing.content.length) {
                        existing.content = content;
                        existing.sizeKB = sizeKB.toFixed(2);
                        existing.method = method;
                        existing.status = status;
                        existing.headersObj = headersObj;
                        UILogger.logMessage(`更新捕获(更大JSON): ${url}`, 'debug');
                    } else {
                        UILogger.logMessage(`已捕获且更小或相等,跳过: ${url}`, 'debug');
                    }
                } else if (policy === 'time') {
                    existing.content = content;
                    existing.sizeKB = sizeKB.toFixed(2);
                    existing.method = method;
                    existing.status = status;
                    existing.headersObj = headersObj;
                    UILogger.logMessage(`更新捕获(时间更新): ${url}`, 'debug');
                }
                return;
            }

            let fn = url.split('/').pop().split('?')[0] || 'download';
            try {
                fn = decodeURIComponent(fn);
            } catch (e) {
            }

            const kb = sizeKB.toFixed(2);
            let category = 'other';
            if (this.isStarUrl(url, fn)) {
                category = 'star';
            } else if (/\/backend-api\//i.test(url)) {
                category = 'backend';
            } else if (/^https?:\/\/[^/]*api\./i.test(url)) {
                category = 'api';
            } else if (/^https?:\/\/[^/]*public\./i.test(url)) {
                category = 'public';
            }

            const item = {
                url, content,
                filename: fn,
                sizeKB: kb,
                method, status,
                headersObj,
                category
            };
            this.capturedRequests.push(item);
            UILogger.logMessage(`捕获JSON (${method}) [${status || '--'}]: ${url}`, 'info');

            PoWParser.checkDifficulty(content);
            SpecialDataParser.parse(url, content);
            UIManager.updateLists();
        },

        isStarUrl(url, filename) {
            if (this.starUuid && url.toLowerCase().includes(this.starUuid.toLowerCase())) {
                return true;
            }
            for (const re of CONFIG.claudeListUrlPatterns) {
                if (re.test(url)) return true;
            }
            if (CONFIG.userStarKeywords && CONFIG.userStarKeywords.length > 0) {
                const lf = filename.toLowerCase();
                for (const kw of CONFIG.userStarKeywords) {
                    if (kw && lf.includes(kw.toLowerCase())) {
                        return true;
                    }
                }
            }
            return false;
        }
    };

    // PoW 解析示例(可根据需要定制)
    const PoWParser = {
        currentDifficulty: '',
        checkDifficulty(raw) {
            if (!CONFIG.showPoWDifficulty) return;
            try {
                const parsed = JSON.parse(raw);
                if (parsed.proofofwork && parsed.proofofwork.difficulty) {
                    this.currentDifficulty = parsed.proofofwork.difficulty;
                    UIManager.refreshJsonPanelTitle();
                }
            } catch (e) {
            }
        }
    };


    /************************************************************************
     * 8. SpecialDataParser(Claude/ChatGPT) - 特殊数据解析
     ************************************************************************/
    const SpecialDataParser = {
        claudeConvData: [],
        chatgptConvData: [],
        chatgptTasksData: [],

        parse(reqUrl, raw) {
            // 解析Claude列表
            for (const re of CONFIG.claudeListUrlPatterns) {
                if (re.test(reqUrl)) {
                    this.parseClaudeArray(reqUrl, raw);
                    UIManager.updateSpecialDataPanel();
                    return;
                }
            }
            // 解析ChatGPT对话列表
            if (/\/backend-api\/conversations\?/i.test(reqUrl)) {
                this.parseChatGPTList(raw);
                UIManager.updateSpecialDataPanel();
                return;
            }
            // 解析ChatGPT任务
            if (/\/backend-api\/tasks$/i.test(reqUrl)) {
                this.parseChatGPTTasks(raw);
                UIManager.updateSpecialDataPanel();
                return;
            }
        },

        parseClaudeArray(reqUrl, raw) {
            try {
                const parsed = JSON.parse(raw);
                const arr = Array.isArray(parsed) ? parsed : parsed.data;
                if (!Array.isArray(arr)) return;

                let orgUuid = '';
                const m = /\/api\/organizations\/([^/]+)/i.exec(reqUrl);
                if (m) orgUuid = m[1];

                arr.forEach(item => {
                    const {uuid, name, updated_at} = item;
                    const shTime = this.toShanghai(updated_at);
                    let convUrl = '';
                    if (orgUuid && uuid) {
                        convUrl = `/api/organizations/${orgUuid}/chat_conversations/${uuid}?tree=True&rendering_mode=messages&render_all_tools=true`;
                    }
                    this.claudeConvData.push({
                        uuid, name,
                        updated_at_shanghai: shTime,
                        convUrl
                    });
                });
                UILogger.logMessage(`解析Claude列表: 共${arr.length}条`, 'info');
            } catch (e) {
                UILogger.logMessage(`解析Claude异常: ${e.message}`, 'error');
            }
        },

        parseChatGPTList(raw) {
            try {
                const obj = JSON.parse(raw);
                if (!obj || !Array.isArray(obj.items)) return;
                obj.items.forEach(item => {
                    const {id, title, update_time} = item;
                    const shTime = this.toShanghai(update_time);
                    let convUrl = '';
                    if (id) {
                        convUrl = `https://chatgpt.com/backend-api/conversation/${id}`;
                    }
                    this.chatgptConvData.push({
                        id, title,
                        update_time_shanghai: shTime,
                        convUrl
                    });
                });
                UILogger.logMessage(`解析ChatGPT对话: 共${obj.items.length}条`, 'info');
            } catch (e) {
                UILogger.logMessage(`解析ChatGPT异常: ${e.message}`, 'error');
            }
        },

        parseChatGPTTasks(raw) {
            try {
                const obj = JSON.parse(raw);
                if (!obj || !Array.isArray(obj.tasks)) return;
                obj.tasks.forEach(task => {
                    this.chatgptTasksData.push({
                        title: task.title || '',
                        task_id: task.task_id || '',
                        updated_at_shanghai: this.toShanghai(task.updated_at),
                        conversation_id: task.conversation_id || '',
                        original_conversation_id: task.original_conversation_id || ''
                    });
                });
                UILogger.logMessage(`解析ChatGPT任务: 当前累计 ${this.chatgptTasksData.length} 条`, 'info');
            } catch (e) {
                UILogger.logMessage(`解析ChatGPT任务异常: ${e.message}`, 'error');
            }
        },

        toShanghai(iso) {
            if (!iso) return '';
            try {
                const d = new Date(iso);
                if (isNaN(d.getTime())) return iso;
                return d.toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'});
            } catch (e) {
                return iso;
            }
        },

        async downloadClaudeConversation(item) {
            if (!item || !item.convUrl) {
                UILogger.logMessage(`Claude对话下载失败: convUrl为空 => ${JSON.stringify(item)}`, 'error');
                throw new Error(`convUrl not found for item: ${item?.name || ''}`);
            }
            const {convUrl, name = '', uuid = ''} = item;
            UILogger.logMessage(`[Claude] 开始下载对话: name=${name}, uuid=${uuid}, url=${convUrl}`, 'debug');

            let resp;
            try {
                resp = await fetch(convUrl);
            } catch (fetchErr) {
                UILogger.logMessage(`[Claude] 对话请求异常: ${fetchErr.message}`, 'error');
                throw fetchErr;
            }
            if (!resp.ok) {
                UILogger.logMessage(`[Claude] 对话请求失败: HTTP ${resp.status} => ${convUrl}`, 'error');
                throw new Error(`Claude对话下载失败: HTTP ${resp.status} - ${name}-${uuid}`);
            }

            const txt = await resp.text();
            UILogger.logMessage(`[Claude] 对话下载成功: name=${name}, uuid=${uuid}, length=${txt.length}`, 'debug');

            let safeName = name.replace(/[\\/:*?"<>|]/g, '_') || 'claude-conv';
            if (uuid) safeName += '-' + uuid;
            if (!safeName.endsWith('.json')) safeName += '.json';
            downloadFile(txt, safeName);
        },

        async downloadChatGPTConversation(item) {
            if (!item || !item.convUrl) {
                UILogger.logMessage(`ChatGPT对话下载失败: convUrl为空 => ${JSON.stringify(item)}`, 'error');
                throw new Error(`convUrl not found for ChatGPT item: ${item?.title || ''}`);
            }
            const {convUrl, title = '', id = ''} = item;
            UILogger.logMessage(`[ChatGPT] 开始下载对话: title=${title}, id=${id}, url=${convUrl}`, 'debug');

            let resp;
            try {
                resp = await fetch(convUrl);
            } catch (err) {
                UILogger.logMessage(`[ChatGPT] 对话请求异常: ${err.message}`, 'error');
                throw err;
            }
            if (!resp.ok) {
                UILogger.logMessage(`[ChatGPT] 对话请求失败: HTTP ${resp.status} => ${convUrl}`, 'error');
                throw new Error(`ChatGPT对话下载失败: HTTP ${resp.status} - ${title}-${id}`);
            }

            const txt = await resp.text();
            UILogger.logMessage(`[ChatGPT] 对话下载成功: title=${title}, id=${id}, length=${txt.length}`, 'debug');

            let safeTitle = title.replace(/[\\/:*?"<>|]/g, '_') || 'chatgpt-conv';
            let fileName = safeTitle;
            if (id) fileName += '-' + id;
            if (!fileName.endsWith('.json')) fileName += '.json';
            downloadFile(txt, fileName);
        }
    };


    /************************************************************************
     * 9. UIManager: 生成 JSON面板 & 特殊数据面板
     ************************************************************************/
    const UIManager = {
        globalSettings: {useCategories: true, currentTheme: CONFIG.defaultTheme},
        currentSearchText: '',

        init() {
            try {
                const saved = localStorage.getItem(CONFIG.settingsStorageKey);
                if (saved) {
                    const obj = JSON.parse(saved);
                    if (obj) this.globalSettings = obj;
                }
            } catch (e) {
            }

            this.applyTheme(this.globalSettings.currentTheme);
            this.applyDimensionsAndEffects();
            this.createJsonPanel();
            this.createSpecialDataPanel();
        },

        saveGlobalSettings() {
            try {
                localStorage.setItem(CONFIG.settingsStorageKey, JSON.stringify(this.globalSettings));
            } catch (e) {
            }
        },

        /**
         * 应用主题
         * @param {string} themeName
         */
        applyTheme(themeName) {
            const themeObj = CONFIG.themes[themeName] || CONFIG.themes.light;
            const rootStyle = document.documentElement.style;
            // 将 themeObj 的 key => 转成 --xxx
            Object.entries(themeObj).forEach(([k, v]) => {
                rootStyle.setProperty(`--${k.replace(/([A-Z])/g, '-$1').toLowerCase()}`, v);
            });
            this.globalSettings.currentTheme = themeName;
            this.saveGlobalSettings();

            // 更新所有已存在面板的背景
            const panels = GlobalPanels.getAllPanels();
            for (const p of panels) {
                if (typeof p.updatePanelBackgroundByTheme === 'function') {
                    p.updatePanelBackgroundByTheme();
                }
            }
            UILogger.logMessage(`[UIManager] 已切换主题 => ${themeName}`, 'info');
        },

        /**
         * 将字号、间距、阴影等写入CSS变量
         */
        applyDimensionsAndEffects() {
            const rootStyle = document.documentElement.style;

            // 字号
            Object.entries(CONFIG.fontSizes).forEach(([key, val]) => {
                rootStyle.setProperty(`--font-size-${key}`, val);
            });

            // 图标尺寸
            Object.entries(CONFIG.iconSizes).forEach(([key, val]) => {
                rootStyle.setProperty(`--button-size-${key}`, val);
            });

            // 面板特效
            rootStyle.setProperty('--border-radius', CONFIG.panelEffects.borderRadius);
            rootStyle.setProperty('--box-shadow-default', CONFIG.panelEffects.defaultBoxShadow);
            rootStyle.setProperty('--box-shadow-hover', CONFIG.panelEffects.hoverBoxShadow);
            rootStyle.setProperty('--titlebar-bottom-border', CONFIG.panelEffects.titlebarBottomBorder);
            rootStyle.setProperty('--minimized-height', CONFIG.panelEffects.minimizedHeight);

            // 额外布局/间距
            rootStyle.setProperty('--drag-handle-size', CONFIG.layout.dragHandleSize);
            rootStyle.setProperty('--drag-handle-margin', CONFIG.layout.dragHandleMargin);
            rootStyle.setProperty('--inline-confirm-padding', CONFIG.layout.inlineConfirmPadding);
            rootStyle.setProperty('--inline-confirm-button-padding', CONFIG.layout.inlineConfirmButtonPadding);
            rootStyle.setProperty('--progress-bar-height', CONFIG.layout.progressBarHeight);
        },

        /**
         * 创建一个主题切换按钮
         */
        createThemeToggleButton() {
            return BaseFloatingPanel.createPanelButton('THEME_TOGGLE', () => {
                const newTheme = (this.globalSettings.currentTheme === 'light') ? 'dark' : 'light';
                this.applyTheme(newTheme);
            });
        },

        createJsonPanel() {
            const initPos = CONFIG.initialPanels.jsonPanel;
            this.jsonPanel = new BaseFloatingPanel({
                id: 'json-panel-container',
                title: 'JSON 抓取器',
                defaultLeft: initPos.left,
                defaultTop: initPos.top,
                defaultWidth: initPos.width,
                defaultHeight: initPos.height,
                reopenBtnText: '打开JSON抓取器',
                reopenBtnTop: '10px',
                allowResize: true,
                onClose: () => UILogger.logMessage('JSON面板已关闭', 'info'),
                onMinimize: () => UILogger.logMessage('JSON面板已最小化', 'info'),
                onRestore: () => UILogger.logMessage('JSON面板已还原', 'info'),
                onFocus: () => UILogger.logMessage('JSON面板获得焦点', 'debug'),
                onOpen: () => UILogger.logMessage('JSON面板创建完成', 'debug'),
                // 示例：可开启双击标题栏最大化/还原
                doubleClickTitleToToggleMaximize: true
            });

            // 主题切换按钮
            const btnTheme = this.createThemeToggleButton();
            // 分类显示切换
            const btnToggleCat = BaseFloatingPanel.createPanelButton('TOGGLE_CAT', () => {
                this.globalSettings.useCategories = !this.globalSettings.useCategories;
                this.saveGlobalSettings();
                this.rebuildJsonPanelContent();
                UILogger.logMessage(`切换分类显示: ${this.globalSettings.useCategories}`, 'info');
            });

            // 将两个新增按钮插到最小化按钮之前
            this.jsonPanel.titlebar.insertBefore(btnToggleCat, this.jsonPanel.btnMinimize);
            this.jsonPanel.titlebar.insertBefore(btnTheme, btnToggleCat);

            this.rebuildJsonPanelContent();
        },

        rebuildJsonPanelContent() {
            const contentWrap = this.jsonPanel.contentEl;
            contentWrap.innerHTML = '';

            // 搜索栏
            const searchWrap = document.createElement('div');
            searchWrap.className = 'json-panel-search-wrap';

            const lbl = document.createElement('label');
            lbl.textContent = '搜索:';

            const inp = document.createElement('input');
            inp.type = 'text';
            inp.className = 'json-panel-search-input';
            inp.placeholder = '按URL/filename过滤...';
            inp.value = this.currentSearchText;
            inp.addEventListener('input', () => {
                this.currentSearchText = inp.value.trim().toLowerCase();
                this.updateLists();
            });

            searchWrap.appendChild(lbl);
            searchWrap.appendChild(inp);
            contentWrap.appendChild(searchWrap);

            // 判断分类或不分类
            if (this.globalSettings.useCategories) {
                this.buildCategory('星标', 'star', contentWrap);
                this.buildCategory('Backend API', 'backend', contentWrap);
                this.buildCategory('Public API', 'public', contentWrap);
                this.buildCategory('API', 'api', contentWrap);
                this.buildCategory('其他', 'other', contentWrap);
            } else {
                this.buildCategory('所有请求', 'all', contentWrap);
            }
            this.updateLists();
        },

        buildCategory(title, catKey, parent) {
            const wrapper = document.createElement('div');
            wrapper.className = 'json-panel-category';
            wrapper.style.margin = CONFIG.layout.categoryMargin;

            const header = document.createElement('div');
            header.className = 'json-panel-category-header';
            header.style.padding = CONFIG.layout.categoryHeaderPadding;

            const titleSpan = document.createElement('span');
            titleSpan.className = 'title';
            titleSpan.textContent = title;

            const btnsWrap = document.createElement('div');

            // 批量下载
            const btnDownload = BaseFloatingPanel.createPanelButton('DOWNLOAD_ALL', () => {
                const list = this.getRequestsByCategory(catKey);
                if (!list.length) {
                    UILogger.logMessage(`【${title}】无可下载数据`, 'warn');
                    return;
                }
                list.forEach(item => this.downloadSingle(item));
                UILogger.logMessage(`批量下载完成,分类【${title}】共${list.length}个`, 'info');
            });
            btnDownload.title = `批量下载: ${title}`;

            // 清空此分类
            const btnClear = BaseFloatingPanel.createPanelButton('CLEAR_CATEGORY', () => {
                inlineConfirm(`确定要清空分类「${title}」吗？此操作不可恢复。`, () => {
                    if (catKey === 'all') {
                        RequestInterceptor.capturedRequests = [];
                    } else {
                        this.removeRequestsByCategory(catKey);
                    }
                    this.updateLists();
                    UILogger.logMessage(`已清空分类: ${title}`, 'warn');
                });
            });
            btnClear.title = `清空: ${title}`;

            // 按名称排序
            let sortNameAsc = true;
            const btnSortName = document.createElement('button');
            btnSortName.className = 'floating-panel-btn';
            btnSortName.textContent = BUTTON_MAP.SORT_ASC.icon;
            btnSortName.title = `按名称排序 - ${title}`;
            btnSortName.addEventListener('click', () => {
                this.sortCategory(catKey, 'name', sortNameAsc);
                sortNameAsc = !sortNameAsc;
                btnSortName.textContent = sortNameAsc ? BUTTON_MAP.SORT_ASC.icon : BUTTON_MAP.SORT_DESC.icon;
            });

            // 按大小排序
            let sortSizeAsc = true;
            const btnSortSize = document.createElement('button');
            btnSortSize.className = 'floating-panel-btn';
            btnSortSize.textContent = BUTTON_MAP.SORT_ASC.icon;
            btnSortSize.title = `按大小排序 - ${title}`;
            btnSortSize.addEventListener('click', () => {
                this.sortCategory(catKey, 'size', sortSizeAsc);
                sortSizeAsc = !sortSizeAsc;
                btnSortSize.textContent = sortSizeAsc ? BUTTON_MAP.SORT_ASC.icon : BUTTON_MAP.SORT_DESC.icon;
            });

            btnsWrap.appendChild(btnDownload);
            btnsWrap.appendChild(btnClear);
            btnsWrap.appendChild(btnSortName);
            btnsWrap.appendChild(btnSortSize);

            header.appendChild(titleSpan);
            header.appendChild(btnsWrap);

            const listEl = document.createElement('ul');
            listEl.className = 'json-panel-list';

            wrapper.appendChild(header);
            wrapper.appendChild(listEl);
            parent.appendChild(wrapper);

            // 保存引用
            switch (catKey) {
                case 'star':
                    this.starListEl = listEl;
                    break;
                case 'backend':
                    this.backendListEl = listEl;
                    break;
                case 'public':
                    this.publicListEl = listEl;
                    break;
                case 'api':
                    this.apiListEl = listEl;
                    break;
                case 'other':
                    this.otherListEl = listEl;
                    break;
                case 'all':
                    this.singleListEl = listEl;
                    break;
            }
        },

        updateLists() {
            if (!this.jsonPanel) return;

            if (this.globalSettings.useCategories) {
                if (this.starListEl) {
                    this.starListEl.innerHTML = '';
                    this.getRequestsByCategory('star').forEach(it => {
                        this.starListEl.appendChild(this.createRequestItem(it));
                    });
                }
                if (this.backendListEl) {
                    this.backendListEl.innerHTML = '';
                    this.getRequestsByCategory('backend').forEach(it => {
                        this.backendListEl.appendChild(this.createRequestItem(it));
                    });
                }
                if (this.publicListEl) {
                    this.publicListEl.innerHTML = '';
                    this.getRequestsByCategory('public').forEach(it => {
                        this.publicListEl.appendChild(this.createRequestItem(it));
                    });
                }
                if (this.apiListEl) {
                    this.apiListEl.innerHTML = '';
                    this.getRequestsByCategory('api').forEach(it => {
                        this.apiListEl.appendChild(this.createRequestItem(it));
                    });
                }
                if (this.otherListEl) {
                    this.otherListEl.innerHTML = '';
                    this.getRequestsByCategory('other').forEach(it => {
                        this.otherListEl.appendChild(this.createRequestItem(it));
                    });
                }
            } else {
                if (this.singleListEl) {
                    this.singleListEl.innerHTML = '';
                    this.getRequestsByCategory('all').forEach(it => {
                        this.singleListEl.appendChild(this.createRequestItem(it));
                    });
                }
            }
        },

        getRequestsByCategory(cat) {
            const arr = RequestInterceptor.capturedRequests;
            if (cat === 'all') {
                return this.filterBySearch(arr);
            } else {
                return this.filterBySearch(arr.filter(it => it.category === cat));
            }
        },

        filterBySearch(arr) {
            if (!this.currentSearchText) return arr;
            return arr.filter(it => {
                const urlLower = (it.url || '').toLowerCase();
                const fileLower = (it.filename || '').toLowerCase();
                return (urlLower.includes(this.currentSearchText) || fileLower.includes(this.currentSearchText));
            });
        },

        removeRequestsByCategory(cat) {
            RequestInterceptor.capturedRequests =
                RequestInterceptor.capturedRequests.filter(it => it.category !== cat);
        },

        sortCategory(cat, by, asc) {
            let arr = (cat === 'all')
                ? RequestInterceptor.capturedRequests
                : this.getRequestsByCategory(cat);

            if (by === 'name') {
                arr.sort((a, b) => asc
                    ? a.filename.localeCompare(b.filename)
                    : b.filename.localeCompare(a.filename));
            } else if (by === 'size') {
                arr.sort((a, b) => {
                    const sa = parseFloat(a.sizeKB);
                    const sb = parseFloat(b.sizeKB);
                    return asc ? (sa - sb) : (sb - sa);
                });
            }

            if (cat !== 'all') {
                // 移除此分类旧数据，再插入排好序的新数据
                this.removeRequestsByCategory(cat);
                arr.forEach(it => RequestInterceptor.capturedRequests.push(it));
            } else {
                RequestInterceptor.capturedRequests = arr;
            }
            this.updateLists();
        },

        createRequestItem(item) {
            const li = document.createElement('li');
            li.className = 'json-panel-item';
            li.style.padding = CONFIG.layout.itemPadding;

            // 复制
            const btnCopy = document.createElement('span');
            btnCopy.className = 'icon';
            btnCopy.textContent = BUTTON_MAP.COPY_JSON.icon;
            btnCopy.title = BUTTON_MAP.COPY_JSON.title;
            btnCopy.addEventListener('click', () => {
                copyText(item.content);
                UILogger.logMessage('复制JSON: ' + item.filename, 'info');
            });

            // 下载
            const btnDownload = document.createElement('span');
            btnDownload.className = 'icon';
            btnDownload.textContent = BUTTON_MAP.DOWNLOAD_JSON.icon;
            btnDownload.title = BUTTON_MAP.DOWNLOAD_JSON.title;
            btnDownload.addEventListener('click', () => {
                this.downloadSingle(item);
            });

            // 预览
            const btnPreview = document.createElement('span');
            btnPreview.className = 'icon';
            btnPreview.textContent = BUTTON_MAP.PREVIEW_JSON.icon;
            btnPreview.title = BUTTON_MAP.PREVIEW_JSON.title;
            btnPreview.addEventListener('click', () => {
                this.previewJson(item);
            });

            // 删除
            const btnRemoveItem = document.createElement('span');
            btnRemoveItem.className = 'icon';
            btnRemoveItem.textContent = BUTTON_MAP.REMOVE_ITEM.icon;
            btnRemoveItem.title = BUTTON_MAP.REMOVE_ITEM.title;
            btnRemoveItem.addEventListener('click', () => {
                inlineConfirm(`确定删除此记录？\n\nURL: ${item.url}`, () => {
                    const idx = RequestInterceptor.capturedRequests.indexOf(item);
                    if (idx >= 0) {
                        RequestInterceptor.capturedRequests.splice(idx, 1);
                        UILogger.logMessage(`删除抓取记录: ${item.filename} (URL: ${item.url})`, 'warn');
                        this.updateLists();
                    }
                });
            });

            const fileSpan = document.createElement('span');
            fileSpan.className = 'filename-span';
            fileSpan.textContent = item.filename;

            const urlSpan = document.createElement('span');
            urlSpan.className = 'url-span';
            urlSpan.textContent = item.url;
            urlSpan.title = item.url;

            const sizeSpan = document.createElement('span');
            sizeSpan.className = 'size-span';
            sizeSpan.textContent = item.sizeKB + 'KB';

            li.appendChild(btnCopy);
            li.appendChild(btnDownload);
            li.appendChild(btnPreview);
            li.appendChild(btnRemoveItem);
            li.appendChild(fileSpan);
            li.appendChild(urlSpan);
            li.appendChild(sizeSpan);
            return li;
        },

        previewJson(item) {
            if (!item || !item.content) {
                UILogger.logMessage('预览失败: JSON为空', 'warn');
                return;
            }
            BaseFloatingPanel.openPreviewPanel(item.filename, item.content);
        },

        downloadSingle(item) {
            if (!item || !item.content) {
                UILogger.logMessage('下载失败: JSON为空', 'warn');
                return;
            }
            let fn = item.filename || 'download';
            if (!fn.endsWith('.json')) fn += '.json';
            downloadFile(item.content, fn);
            UILogger.logMessage(`下载JSON: ${fn}`, 'info');
        },

        refreshJsonPanelTitle() {
            if (!this.jsonPanel) return;
            let t = 'JSON 抓取器';
            if (CONFIG.showPoWDifficulty && PoWParser.currentDifficulty) {
                t += ` (PoW难度: ${PoWParser.currentDifficulty})`;
            }
            this.jsonPanel.setTitle(t);
        },

        createSpecialDataPanel() {
            const initPos = CONFIG.initialPanels.specPanel;
            this.specialDataPanel = new BaseFloatingPanel({
                id: 'special-data-panel-container',
                title: '特殊数据解析',
                defaultLeft: initPos.left,
                defaultTop: initPos.top,
                defaultWidth: initPos.width,
                defaultHeight: initPos.height,
                reopenBtnText: '打开“特殊解析”面板',
                reopenBtnTop: '130px',
                allowResize: true,
                onClose: () => UILogger.logMessage('特殊数据解析面板已关闭', 'info'),
                onMinimize: () => UILogger.logMessage('特殊数据解析面板已最小化', 'info'),
                onRestore: () => UILogger.logMessage('特殊数据解析面板已还原', 'info'),
                onFocus: () => UILogger.logMessage('特殊数据解析面板获得焦点', 'debug'),
                onOpen: () => UILogger.logMessage('特殊数据解析面板创建完成', 'debug')
            });

            // 工具栏按钮：清空、导出CSV、折叠/展开全部
            const btnClear = BaseFloatingPanel.createPanelButton('TRASH', () => {
                inlineConfirm('确定清空全部解析数据吗？此操作不可恢复。', () => {
                    SpecialDataParser.claudeConvData.length = 0;
                    SpecialDataParser.chatgptConvData.length = 0;
                    SpecialDataParser.chatgptTasksData.length = 0;
                    this.updateSpecialDataPanel();
                    UILogger.logMessage('已清空特殊数据解析', 'warn');
                });
            });
            btnClear.title = '清空所有解析数据(Claude/ChatGPT)';

            const btnCSV = BaseFloatingPanel.createPanelButton('TO_CSV', () => this.downloadSpecialDataAsCSV());
            btnCSV.title = '导出所有解析数据为CSV';

            const btnFoldAll = BaseFloatingPanel.createPanelButton('FOLD_ALL', () => this.foldAllCategories(true));
            const btnUnfoldAll = BaseFloatingPanel.createPanelButton('UNFOLD_ALL', () => this.foldAllCategories(false));

            const fragBar = document.createDocumentFragment();
            fragBar.appendChild(btnClear);
            fragBar.appendChild(btnCSV);
            fragBar.appendChild(btnFoldAll);
            fragBar.appendChild(btnUnfoldAll);
            this.specialDataPanel.titlebar.insertBefore(fragBar, this.specialDataPanel.btnMinimize);

            this.buildSpecialDataPanelUI();
            this.updateSpecialDataPanel();
        },

        buildSpecialDataPanelUI() {
            const wrap = this.specialDataPanel.contentEl;
            wrap.innerHTML = '';

            // Claude分类
            this.claudeCat = this.createFoldableCategory('Claude对话');
            wrap.appendChild(this.claudeCat.wrapper);

            const topBar = document.createElement('div');
            topBar.style.display = 'inline-flex';
            topBar.style.gap = '6px';
            topBar.style.marginLeft = 'auto';

            CONFIG.claudeBatchButtons.forEach(cfg => {
                if (!cfg.enabled) return;
                const btn = document.createElement('button');
                btn.className = 'floating-panel-btn';
                btn.textContent = cfg.icon || cfg.label;
                btn.title = `下载${cfg.days === Infinity ? '全部' : '最近' + cfg.days + '天'}的Claude对话`;
                btn.addEventListener('click', () => {
                    if (cfg.days === Infinity) {
                        this.batchDownloadClaude(SpecialDataParser.claudeConvData, cfg.label);
                    } else {
                        this.batchDownloadClaudeWithinDays(cfg.days);
                    }
                });
                topBar.appendChild(btn);
            });
            this.claudeCat.header.appendChild(topBar);

            // 进度条容器
            const progressWrap = document.createElement('div');
            progressWrap.className = 'claude-progress-wrap';
            progressWrap.style.display = 'none';

            const progressBar = document.createElement('div');
            progressBar.className = 'claude-progress-bar';

            const progressText = document.createElement('div');
            progressText.className = 'claude-progress-text';
            progressText.textContent = '';

            progressWrap.appendChild(progressBar);
            progressWrap.appendChild(progressText);
            this.claudeCat.content.appendChild(progressWrap);
            this.claudeProgressWrap = progressWrap;
            this.claudeProgressBar = progressBar;
            this.claudeProgressText = progressText;

            const claudeUl = document.createElement('ul');
            claudeUl.className = 'special-data-list';
            this.claudeCat.content.appendChild(claudeUl);
            this.claudeListEl = claudeUl;

            // ChatGPT对话分类
            this.chatgptCat = this.createFoldableCategory('ChatGPT对话');
            wrap.appendChild(this.chatgptCat.wrapper);

            const chatgptUl = document.createElement('ul');
            chatgptUl.className = 'special-data-list';
            this.chatgptCat.content.appendChild(chatgptUl);
            this.chatgptListEl = chatgptUl;

            // ChatGPT任务分类
            this.chatgptTaskCat = this.createFoldableCategory('ChatGPT任务');
            wrap.appendChild(this.chatgptTaskCat.wrapper);

            const taskUl = document.createElement('ul');
            taskUl.className = 'special-data-list';
            this.chatgptTaskCat.content.appendChild(taskUl);
            this.chatgptTasksListEl = taskUl;
        },

        createFoldableCategory(title) {
            const wrapper = document.createElement('div');
            wrapper.className = 'special-data-category';
            wrapper.style.margin = CONFIG.layout.categoryMargin;

            const header = document.createElement('div');
            header.className = 'special-data-category-header';
            header.style.padding = CONFIG.layout.categoryHeaderPadding;

            const foldIcon = document.createElement('span');
            foldIcon.textContent = BUTTON_MAP.UNFOLD_ALL.icon; // 默认展开图标
            foldIcon.style.marginRight = '4px';
            foldIcon.style.cursor = 'pointer';
            foldIcon.style.color = 'var(--fold-icon-color)';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'title';
            titleSpan.textContent = title;

            header.appendChild(foldIcon);
            header.appendChild(titleSpan);

            const content = document.createElement('div');
            content.style.display = 'block';

            wrapper.appendChild(header);
            wrapper.appendChild(content);

            let folded = false;
            foldIcon.addEventListener('click', () => {
                folded = !folded;
                foldIcon.textContent = folded ? BUTTON_MAP.FOLD_ALL.icon : BUTTON_MAP.UNFOLD_ALL.icon;
                content.style.display = folded ? 'none' : 'block';
            });

            return {wrapper, header, content, foldIcon, folded};
        },

        foldAllCategories(fold) {
            [this.claudeCat, this.chatgptCat, this.chatgptTaskCat].forEach(catObj => {
                if (catObj) {
                    catObj.folded = fold;
                    catObj.foldIcon.textContent = fold ? BUTTON_MAP.FOLD_ALL.icon : BUTTON_MAP.UNFOLD_ALL.icon;
                    catObj.content.style.display = fold ? 'none' : 'block';
                }
            });
        },

        updateSpecialDataPanel() {
            // Claude
            if (this.claudeListEl) {
                this.claudeListEl.innerHTML = '';
                SpecialDataParser.claudeConvData.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'special-data-list-item';
                    li.style.padding = CONFIG.layout.itemPadding;

                    const line1 = document.createElement('div');
                    line1.className = 'special-data-item-line';
                    line1.style.display = 'flex';
                    line1.style.justifyContent = 'space-between';
                    line1.style.alignItems = 'center';
                    line1.style.marginBottom = '4px';

                    const leftSpan = document.createElement('span');
                    leftSpan.innerHTML = `<strong style="color:var(--special-title-color);">name:</strong>
                        <span style="color:var(--special-title-color);">${item.name || ''}</span>`;
                    line1.appendChild(leftSpan);

                    if (item.convUrl) {
                        const dlIcon = document.createElement('span');
                        dlIcon.textContent = BUTTON_MAP.DOWNLOAD_ALL.icon;
                        dlIcon.style.cursor = 'pointer';
                        dlIcon.title = '下载此对话';
                        dlIcon.addEventListener('click', () => {
                            SpecialDataParser.downloadClaudeConversation(item);
                        });
                        line1.appendChild(dlIcon);
                    }
                    li.appendChild(line1);

                    const line2 = document.createElement('div');
                    line2.className = 'special-data-item-line';
                    line2.innerHTML = `<strong style="color:var(--special-uuid-color);">uuid:</strong>
                        <span style="color:var(--special-uuid-color);">${item.uuid || ''}</span>`;

                    const line3 = document.createElement('div');
                    line3.className = 'special-data-item-line';
                    line3.innerHTML = `<strong style="color:var(--special-update-color);">updated_at:</strong>
                        <span style="color:var(--special-update-color);">${item.updated_at_shanghai || ''}</span>`;

                    li.appendChild(line2);
                    li.appendChild(line3);
                    this.claudeListEl.appendChild(li);
                });
            }

            // ChatGPT对话
            if (this.chatgptListEl) {
                this.chatgptListEl.innerHTML = '';
                SpecialDataParser.chatgptConvData.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'special-data-list-item';
                    li.style.padding = CONFIG.layout.itemPadding;

                    const line1 = document.createElement('div');
                    line1.className = 'special-data-item-line';
                    line1.style.display = 'flex';
                    line1.style.justifyContent = 'space-between';
                    line1.style.alignItems = 'center';
                    line1.style.marginBottom = '4px';

                    const leftSpan = document.createElement('span');
                    leftSpan.innerHTML = `<strong style="color:var(--special-title-color);">title:</strong>
                        <span style="color:var(--special-title-color);">${item.title || ''}</span>`;
                    line1.appendChild(leftSpan);

                    if (item.convUrl) {
                        const dlIcon = document.createElement('span');
                        dlIcon.textContent = BUTTON_MAP.DOWNLOAD_ALL.icon;
                        dlIcon.style.cursor = 'pointer';
                        dlIcon.title = '下载此对话';
                        dlIcon.addEventListener('click', () => {
                            SpecialDataParser.downloadChatGPTConversation(item);
                        });
                        line1.appendChild(dlIcon);
                    }
                    li.appendChild(line1);

                    const line2 = document.createElement('div');
                    line2.className = 'special-data-item-line';
                    line2.innerHTML = `<strong style="color:var(--special-uuid-color);">id:</strong>
                        <span style="color:var(--special-uuid-color);">${item.id || ''}</span>`;

                    const line3 = document.createElement('div');
                    line3.className = 'special-data-item-line';
                    line3.innerHTML = `<strong style="color:var(--special-update-color);">update_time:</strong>
                        <span style="color:var(--special-update-color);">${item.update_time_shanghai || ''}</span>`;

                    li.appendChild(line2);
                    li.appendChild(line3);
                    this.chatgptListEl.appendChild(li);
                });
            }

            // ChatGPT任务
            if (this.chatgptTasksListEl) {
                this.chatgptTasksListEl.innerHTML = '';
                SpecialDataParser.chatgptTasksData.forEach(task => {
                    const li = document.createElement('li');
                    li.className = 'special-data-list-item';
                    li.style.padding = CONFIG.layout.itemPadding;

                    const line1 = document.createElement('div');
                    line1.className = 'special-data-item-line';
                    line1.style.display = 'flex';
                    line1.style.justifyContent = 'space-between';
                    line1.style.alignItems = 'center';
                    line1.style.marginBottom = '4px';

                    const leftSpan = document.createElement('span');
                    leftSpan.innerHTML = `<strong style="color:var(--special-title-color);">title:</strong>
                        <span style="color:var(--special-title-color);">${task.title || ''}</span>`;
                    line1.appendChild(leftSpan);
                    li.appendChild(line1);

                    const line2 = document.createElement('div');
                    line2.className = 'special-data-item-line';
                    line2.innerHTML = `<strong style="color:var(--special-uuid-color);">task_id:</strong>
                        <span style="color:var(--special-uuid-color);">${task.task_id || ''}</span>`;

                    const line3 = document.createElement('div');
                    line3.className = 'special-data-item-line';
                    line3.innerHTML = `<strong style="color:var(--special-update-color);">updated_at:</strong>
                        <span style="color:var(--special-update-color);">${task.updated_at_shanghai || ''}</span>`;

                    const line4 = document.createElement('div');
                    line4.className = 'special-data-item-line';
                    line4.innerHTML = `<strong style="color:var(--special-task-color);">original_conversation_id:</strong>
                        <span style="color:var(--special-task-color);">${task.original_conversation_id || ''}</span>`;

                    const line5 = document.createElement('div');
                    line5.className = 'special-data-item-line';
                    line5.innerHTML = `<strong style="color:var(--special-task-color);">conversation_id:</strong>
                        <span style="color:var(--special-task-color);">${task.conversation_id || ''}</span>`;

                    li.appendChild(line2);
                    li.appendChild(line3);
                    li.appendChild(line4);
                    li.appendChild(line5);
                    this.chatgptTasksListEl.appendChild(li);
                });
            }
        },

        downloadSpecialDataAsCSV() {
            const domain = location.hostname.replace(/[\\/:*?"<>|]/g, '_') || 'site';
            const now = new Date();
            const y = now.getFullYear();
            const M = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            const ss = String(now.getSeconds()).padStart(2, '0');
            const fileTime = `${y}${M}${d}-${hh}${mm}${ss}`;
            const filename = `special-data-${domain}-${fileTime}.csv`;

            let lines = ['Type,TitleOrName,ID/ConvID,UpdateTime,TaskID,OriginalConvID'];

            // Claude
            SpecialDataParser.claudeConvData.forEach(it => {
                const type = 'Claude';
                const name = (it.name || '').replace(/"/g, '""');
                const id = (it.uuid || '').replace(/"/g, '""');
                const t = (it.updated_at_shanghai || '').replace(/"/g, '""');
                lines.push(`"${type}","${name}","${id}","${t}","",""`);
            });

            // ChatGPT
            SpecialDataParser.chatgptConvData.forEach(it => {
                const type = 'ChatGPT';
                const name = (it.title || '').replace(/"/g, '""');
                const id = (it.id || '').replace(/"/g, '""');
                const t = (it.update_time_shanghai || '').replace(/"/g, '""');
                lines.push(`"${type}","${name}","${id}","${t}","",""`);
            });

            // ChatGPT任务
            SpecialDataParser.chatgptTasksData.forEach(it => {
                const type = 'ChatGPT-Task';
                const name = (it.title || '').replace(/"/g, '""');
                const cid = (it.conversation_id || '').replace(/"/g, '""');
                const t = (it.updated_at_shanghai || '').replace(/"/g, '""');
                const tk = (it.task_id || '').replace(/"/g, '""');
                const org = (it.original_conversation_id || '').replace(/"/g, '""');
                lines.push(`"${type}","${name}","${cid}","${t}","${tk}","${org}"`);
            });

            const csvText = lines.join('\r\n');
            downloadFile(csvText, filename, 'text/csv');
            UILogger.logMessage(`特殊数据CSV已下载: ${filename}`, 'info');
        },

        showClaudeProgressBar(show) {
            if (!this.claudeProgressWrap) return;
            this.claudeProgressWrap.style.display = show ? 'block' : 'none';
            if (!show) {
                this.claudeProgressBar.style.width = '0%';
                this.claudeProgressText.textContent = '';
            }
        },

        updateClaudeProgress(current, total, label, errorMsg) {
            if (!this.claudeProgressBar || !this.claudeProgressText) return;
            const pct = Math.floor((current / total) * 100);
            this.claudeProgressBar.style.width = pct + '%';
            let text = `下载进度：${current}/${total}（${pct}%）`;
            if (errorMsg) {
                text += `\n错误: ${errorMsg}`;
            }
            this.claudeProgressText.textContent = text;
        },

        batchDownloadClaude(list, label) {
            if (!list || !list.length) {
                UILogger.logMessage(`Claude批量下载【${label}】无数据`, 'warn');
                return;
            }
            UILogger.logMessage(`开始批量下载Claude对话【${label}】，共${list.length}条`, 'info');
            this.setFoldState(this.claudeCat, false);
            this.showClaudeProgressBar(true);
            this.updateClaudeProgress(0, list.length, label);

            const dq = new DownloadQueue({
                maxConcurrent: CONFIG.downloadQueueOptions.maxConcurrent,
                maxRetry: CONFIG.downloadQueueOptions.maxRetry,
                retryDelay: CONFIG.downloadQueueOptions.retryDelay
            });
            list.forEach(item => {
                dq.addTask(item, async () => {
                    await SpecialDataParser.downloadClaudeConversation(item);
                });
            });

            dq.onProgress = (doneCount, totalCount, task) => {
                let errMsg = null;
                if (task.error) {
                    errMsg = task.error.message || String(task.error);
                    UILogger.logMessage(`[Claude下载进度] 出错: ${errMsg}`, 'error');
                }
                this.updateClaudeProgress(doneCount, totalCount, label, errMsg);
            };

            dq.onComplete = (successCount, failCount) => {
                this.showClaudeProgressBar(false);
                const msg = `Claude批量下载【${label}】完成：成功${successCount}，失败${failCount}`;
                UILogger.logMessage(msg, failCount > 0 ? 'warn' : 'info');
            };
            dq.start();
        },

        batchDownloadClaudeWithinDays(days) {
            const now = new Date();
            const filtered = SpecialDataParser.claudeConvData.filter(item => {
                if (!item.updated_at_shanghai) return false;
                const dt = new Date(item.updated_at_shanghai);
                if (isNaN(dt.getTime())) return false;
                const diffDays = (now - dt) / (1000 * 60 * 60 * 24);
                return diffDays <= days;
            });
            this.batchDownloadClaude(filtered, `最近${days}天`);
        },

        setFoldState(catObj, fold) {
            if (!catObj) return;
            catObj.folded = fold;
            catObj.foldIcon.textContent = fold ? BUTTON_MAP.FOLD_ALL.icon : BUTTON_MAP.UNFOLD_ALL.icon;
            catObj.content.style.display = fold ? 'none' : 'block';
        }
    };


    /************************************************************************
     * 10. 主入口(main) & 样式注入
     ************************************************************************/
    function findStarUuid() {
        // 如果URL中含 /c/xxxxxx 这样的UUID，就提取出来用于特殊标记
        const m = /\/c\/([0-9a-fA-F-]+)/.exec(location.href);
        if (m) RequestInterceptor.starUuid = m[1];
    }

    function main() {
        try {
            findStarUuid();
            UILogger.init();
            UIManager.init();
            RequestInterceptor.init();
            UILogger.logMessage('脚本已启动 - 面板已生成!', 'info');
        } catch (err) {
            logErrorWithStack(err, 'main');
        }
    }

    function waitForBody() {
        if (document.body) {
            main();
        } else {
            requestAnimationFrame(waitForBody);
        }
    }

    waitForBody();

    // 注入CSS（所有颜色/字号/尺寸都从CONFIG里映射为CSS变量）
    const cssText = `
/* =========================== 行内确认(InlineConfirm) =========================== */
.inline-confirm-container {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 999999999;
    background: var(--inline-confirm-bg);
    color: var(--inline-confirm-text);
    border: 1px solid var(--inline-confirm-border);
    padding: var(--inline-confirm-padding);
    border-radius: 6px;
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--font-size-inline-confirm);
    animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.inline-confirm-text {
    margin-right: 6px;
}

.inline-confirm-btn {
    border: 1px solid #ccc;
    background: var(--inline-confirm-btn-bg);
    color: inherit;
    border-radius: 4px;
    cursor: pointer;
    font-size: var(--font-size-inline-confirm);
    padding: var(--inline-confirm-button-padding);
    transition: background 0.2s ease;
}

.inline-confirm-btn:hover {
    background: var(--inline-confirm-btn-hover-bg);
}

.inline-confirm-yes {
    background: var(--inline-confirm-yes-bg);
    color: var(--inline-confirm-yes-text);
    margin-left: 6px;
}

.inline-confirm-no {
    background: var(--inline-confirm-no-bg);
    color: var(--inline-confirm-no-text);
}

/* ============================= 浮动面板基类 ============================= */
.floating-panel-container {
    position: fixed;
    backdrop-filter: blur(4px);
    background: var(--panel-content-bg);
    border: 1px solid var(--panel-border-color);
    border-radius: var(--border-radius);
    box-shadow: var(--box-shadow-default);
    display: flex;
    flex-direction: column;
    resize: both;
    overflow: hidden;
    transition: box-shadow 0.2s ease;
    z-index: 999999;
    font-family: system-ui, sans-serif;
}

.floating-panel-container:hover {
    box-shadow: var(--box-shadow-hover);
}

.floating-panel-container.minimized {
    overflow: hidden;
    resize: none;
    height: var(--minimized-height) !important;
}

.floating-panel-titlebar {
    flex-shrink: 0;
    background: var(--panel-title-bg-gradient);
    height: 36px;
    display: flex;
    align-items: center;
    padding: 0 4px;
    cursor: default;
    border-top-left-radius: var(--border-radius);
    border-top-right-radius: var(--border-radius);
    border-bottom: 1px solid var(--titlebar-bottom-border);
}

.floating-panel-drag-handle {
    width: var(--drag-handle-size);
    height: var(--drag-handle-size);
    margin: var(--drag-handle-margin);
    background-color: var(--panel-handle-color);
    border-radius: 4px;
    cursor: move;
    box-shadow: var(--drag-handle-inner-shadow);
}

.floating-panel-title {
    flex: 1;
    font-weight: 600;
    padding-left: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: text;
    font-size: var(--font-size-title);
    color: var(--panel-title-text-color);
}

.floating-panel-btn {
    cursor: pointer;
    border: none;
    background: transparent;
    margin: 0 1px;
    padding: 0 5px;
    border-radius: 4px;
    transition: background 0.2s ease;
    font-size: var(--button-size-titlebar);
    color: var(--panel-btn-text-color);
}

.floating-panel-btn:hover {
    background: var(--panel-btn-hover-bg);
}

/* 让最小化 & 关闭按钮真正跟随主题，不要被覆盖 */
.floating-panel-btn.minimize-btn {
    color: var(--panel-minimize-btn-color) !important;
}

.floating-panel-btn.close-btn {
    color: var(--panel-close-btn-color) !important;
}

.floating-reopen-btn {
    display: none;
    position: fixed;
    left: 10px;
    border: 1px solid var(--floating-reopen-btn-border);
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
    z-index: 999999999;
    color: var(--panel-btn-text-color);
    background: var(--panel-reopen-btn-bg);
    font-size: var(--font-size-content);
}

.floating-panel-content {
    flex: 1;
    overflow: auto;
    font-size: var(--font-size-content);
    color: var(--panel-btn-text-color);
}

/* =============================== 日志面板 =============================== */
.log-panel-list {
    list-style: none;
    margin: 0;
    padding: 0;
    font-family: monospace;
    font-size: var(--font-size-log);
    line-height: 1.2;
    color: var(--panel-log-font-color);
    white-space: pre;
}

.log-panel-list.wrap-lines {
    white-space: pre-wrap;
    word-wrap: break-word;
}

.log-line {
    margin: 2px 0;
}

/* ============================== JSON面板搜索 ============================== */
.json-panel-search-wrap {
    margin: 4px;
    display: flex;
    align-items: center;
}

.json-panel-search-wrap label {
    margin-right: 4px;
    color: var(--search-label-color);
}

.json-panel-search-input {
    flex: 1;
    border: 1px solid var(--search-input-border);
    border-radius: 4px;
    padding: 4px 6px;
    font-size: var(--font-size-content);
    background: transparent;
    color: var(--panel-btn-text-color);
}

/* ============================== JSON分类 ============================== */
.json-panel-category {
    border: 1px solid var(--category-border-color);
    border-radius: 6px;
    background: transparent;
    padding-bottom: 4px;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}

.json-panel-category-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--category-header-bg);
    border-bottom: 1px solid var(--category-border-color);
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
}

.json-panel-category-header .title {
    font-weight: bold;
    margin-right: 8px;
    color: var(--category-title-color);
    font-size: var(--font-size-category-title);
}

.json-panel-list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.json-panel-item {
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--item-divider-color);
    font-size: var(--font-size-category-item);
    color: var(--panel-btn-text-color);
}

.json-panel-item:hover {
    background: var(--item-hover-bg);
}

.json-panel-item .icon {
    cursor: pointer;
    margin-right: 6px;
    font-size: var(--button-size-category-item);
    color: var(--panel-btn-text-color);
}

.filename-span {
    margin-right: 6px;
    font-weight: bold;
}

.url-span {
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    margin-right: 6px;
    color: var(--json-url-color);
}

.size-span {
    color: var(--json-size-color);
}

/* =============================== JSON预览 =============================== */
.json-preview-content {
    background: rgba(246, 248, 250, 0.2);
    padding: 8px;
    overflow: auto;
    flex: 1;
}

.json-preview {
    font-family: Consolas, Monaco, monospace;
    font-size: var(--font-size-content);
    white-space: pre;
    line-height: 1.4em;
    color: #ccc;
}

.json-preview .string {
    color: var(--highlight-string-color);
}

.json-preview .number {
    color: var(--highlight-number-color);
}

.json-preview .boolean {
    color: var(--highlight-boolean-color);
}

.json-preview .null {
    color: var(--highlight-null-color);
}

.json-preview .key {
    color: var(--highlight-key-color);
}

/* ============================ 特殊数据面板 ============================ */
.special-data-category {
    border: 1px solid var(--category-border-color);
    border-radius: 6px;
    background: transparent;
    padding-bottom: 4px;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}

.special-data-category-header {
    display: flex;
    align-items: center;
    background: var(--category-header-bg);
    border-bottom: 1px solid var(--category-border-color);
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
}

.special-data-category-header .title {
    font-weight: bold;
    margin-right: 6px;
    color: var(--category-title-color);
    font-size: var(--font-size-category-title);
}

.special-data-list {
    list-style: none;
    margin: 0;
    padding: 0;
}

.special-data-list-item {
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid var(--item-divider-color);
    font-size: var(--font-size-category-item);
    color: var(--panel-btn-text-color);
}

.special-data-list-item:hover {
    background: var(--item-hover-bg);
}

.special-data-item-line {
    margin: 2px 0;
    font-size: var(--font-size-category-item);
}

/* ============================ Claude进度条 ============================ */
.claude-progress-wrap {
    margin: 8px;
    border: 1px solid var(--panel-border-color);
    border-radius: 4px;
    height: var(--progress-bar-height);
    position: relative;
    background: var(--progress-wrap-bg);
    overflow: hidden;
}

.claude-progress-bar {
    position: absolute;
    left: 0;
    top: 0;
    width: 0%;
    height: 100%;
    background: var(--progress-bar-bg);
    transition: width 0.2s ease;
}

.claude-progress-text {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    text-align: center;
    line-height: var(--progress-bar-height);
    font-size: var(--font-size-content);
    color: var(--progress-bar-text-color);
    pointer-events: none;
    white-space: pre-wrap;
}
`;

    const styleEl = document.createElement('style');
    styleEl.textContent = cssText;
    document.head.appendChild(styleEl);
})();
