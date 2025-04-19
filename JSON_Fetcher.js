// ==UserScript==
// @name         JSON Fetcher Ultimate (Advanced InlineConfirm Edition, EphemeralPreview Fixed)
// @namespace    https://github.com/alicewish/
// @version      2.0.20250419
// @description  满足各种改动需求，月薪十万美元水平的高阶版，行内确认，无弹窗，支持临时预览面板（已优化修正）
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
            snapThreshold: 15,         // 吸附像素范围
            enableBackdropBlur: false  // 如果关闭，则强制不透明背景(主题透明度失效)
        },

        // 额外功能限制或特性选项
        features: {
            enableInlineConfirm: true, // 是否启用行内确认(替代系统confirm)
            maxLogEntries: 1000,  // 日志最多保留多少条，超过后丢弃最旧的
            maxJSONSizeKB: 0,     // 如需提醒过大JSON，可设置 >0 (单位KB)，0不限制
            autoCleanupOnLarge: false  // 若为true, 超限的JSON直接丢弃
        },

        // 是否在 JSON 面板标题中显示 PoW 难度(仅示例用)
        showPoWDifficulty: true,

        // 星标关键字(如 "VIP"、"myFav")
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

        // 图标文本
        ICONS: {
            downloadAll: '⬇️',
            downloadLog: '📥',
            trash: '🗑️',
            scrollTop: '↥',
            scrollBottom: '↧',
            minimize: '➖',
            restore: '▔',
            close: '✖️',
            copy: '📋',
            preview: '👁️',
            gear: '⚙',
            table: '⬇️表格',
            fold: '⏵',
            unfold: '⏷',
            themeSwitch: '🌗',
            removeItem: '✂️',
            confirmCheck: '✔️',
            confirmCancel: '✖️'
        },

        // 字号相关 (不受主题影响)
        fontSizes: {
            title: '16px',        // 面板标题字号
            content: '13px',      // 面板正文字号
            categoryTitle: '16px',// 分类标题字号(加大)
            categoryItem: '13px', // 分类子项字号
            log: '12px',          // 日志面板
            inlineConfirm: '14px' // 行内确认提示
        },

        // 图标按钮尺寸相关 (不受主题影响)
        iconSizes: {
            titlebarButton: '14px',  // 标题栏按钮
            panelButton: '12px',
            categoryTitleButton: '14px',
            categoryItemButton: '12px'
        },

        // 面板外观特效 (不受主题影响)
        panelEffects: {
            borderRadius: '8px',
            defaultBoxShadow: '0 5px 16px rgba(0,0,0,0.3)',
            hoverBoxShadow: '0 5px 24px rgba(0,0,0,0.4)',
            titlebarBottomBorder: 'rgba(68,68,68,0.07)',
            minimizedHeight: '36px'
        },

        // 主题颜色配置
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
                panelMinimizeBtnColor: '#333',
                panelCloseBtnColor: '#c00',
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
                // 行内确认按钮对错颜色
                inlineConfirmYesBg: '#4caf50',  // 绿色
                inlineConfirmYesText: '#fff',
                inlineConfirmNoBg: '#f44336',   // 红色
                inlineConfirmNoText: '#fff'
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
                panelMinimizeBtnColor: '#fff',
                panelCloseBtnColor: '#ff5555',
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
                // 行内确认按钮对错颜色
                inlineConfirmYesBg: '#4caf50',
                inlineConfirmYesText: '#fff',
                inlineConfirmNoBg: '#f44336',
                inlineConfirmNoText: '#fff'
            }
        },

        // 默认主题
        defaultTheme: 'light',

        // 已存在相同 URL 时的更新策略: 'larger' 或 'time'
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
    /**
     * 行内确认面板出现在屏幕右下角, 主题颜色和字号都从 CONFIG 中获取.
     * - 若未启用行内确认, 直接执行 onYes.
     * - 超时后自动消失, 不阻塞JS.
     */
    function inlineConfirm(question, onYes, onNo, timeoutMs = 5000) {
        if (!CONFIG.features.enableInlineConfirm) {
            if (onYes) onYes();
            return;
        }
        // 创建行内确认容器
        const container = document.createElement('div');
        container.className = 'inline-confirm-container';
        container.innerHTML = `
            <div class="inline-confirm-text">${question}</div>
            <button class="inline-confirm-btn inline-confirm-yes">${CONFIG.ICONS.confirmCheck}</button>
            <button class="inline-confirm-btn inline-confirm-no">${CONFIG.ICONS.confirmCancel}</button>
        `;
        document.body.appendChild(container);

        const yesBtn = container.querySelector('.inline-confirm-yes');
        if (yesBtn) {
            yesBtn.addEventListener('click', () => {
                if (onYes) onYes();
                cleanup();
            });
        }
        const noBtn = container.querySelector('.inline-confirm-no');
        if (noBtn) {
            noBtn.addEventListener('click', () => {
                if (onNo) onNo();
                cleanup();
            });
        }

        const timer = setTimeout(() => {
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
        } catch (e) {
            UILogger.logMessage(`复制到剪贴板失败: ${e.message}`, 'error');
        }
    }

    /************************************************************************
     * 4. ZIndex & GlobalPanels 管理
     ************************************************************************/
    const ZIndexManager = {
        currentZIndex: 999999,
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
     ************************************************************************/
    class BaseFloatingPanel {
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
                destroyOnClose = false, // 额外：预览面板时用
                onClose = () => {
                },
                onMinimize = () => {
                },
                onRestore = () => {
                }
            } = options;

            this.id = id;
            this.title = title;
            this.showReopenBtn = showReopenBtn;
            this.reopenBtnText = reopenBtnText;
            this.reopenBtnTop = reopenBtnTop;
            this.onClose = onClose;
            this.onMinimize = onMinimize;
            this.onRestore = onRestore;
            this.allowResize = allowResize;
            this.destroyOnClose = destroyOnClose; // 新增

            this.panelState = {
                minimized: false,
                closed: false,
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
                this.initEvents();
                this.initResizeObserver();
                this.updatePanelBackgroundByTheme();
            } catch (err) {
                logErrorWithStack(err, 'BaseFloatingPanel constructor');
            }
        }

        static createPanelButton({text = '', title = '', onClick = null}) {
            const btn = document.createElement('button');
            btn.className = 'floating-panel-btn';
            btn.textContent = text;
            if (title) btn.title = title;
            if (onClick) btn.addEventListener('click', onClick);
            return btn;
        }

        initDOM(defaultHeight) {
            this.container = document.createElement('div');
            this.container.classList.add('floating-panel-container', 'floating-panel');
            if (this.id) this.container.id = this.id;

            this.container.style.left = this.panelState.left;
            this.container.style.top = this.panelState.top;
            this.container.style.width = this.panelState.width;
            this.container.style.height = this.panelState.height;
            this.container.style.opacity = String(CONFIG.panelLimit.defaultPanelOpacity);

            if (!CONFIG.panelLimit.enableBackdropBlur) {
                // 强制不透明背景
                const theme = UIManager?.globalSettings?.currentTheme || CONFIG.defaultTheme;
                const themeVars = CONFIG.themes[theme] || CONFIG.themes.light;
                const forcedBg = themeVars.panelContentBg.replace(/(\d+,\s*\d+,\s*\d+),\s*([\d\.]+)/, '$1,1');
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

            // 最小化按钮图标(默认状态)
            this.currentMinimizeIcon = CONFIG.ICONS.minimize;

            // 滚动顶部按钮
            this.btnScrollTop = BaseFloatingPanel.createPanelButton({
                text: CONFIG.ICONS.scrollTop,
                title: '滚动到顶部',
                onClick: () => this.scrollToTop()
            });

            // 滚动底部按钮
            this.btnScrollBottom = BaseFloatingPanel.createPanelButton({
                text: CONFIG.ICONS.scrollBottom,
                title: '滚动到底部',
                onClick: () => this.scrollToBottom()
            });

            // 最小化按钮
            this.btnMinimize = BaseFloatingPanel.createPanelButton({
                text: this.currentMinimizeIcon,
                title: '最小化或还原',
                onClick: () => this.toggleMinimize()
            });
            this.btnMinimize.classList.add('minimize-btn');

            // 关闭按钮
            this.btnClose = BaseFloatingPanel.createPanelButton({
                text: CONFIG.ICONS.close,
                title: '关闭面板',
                onClick: () => this.close()
            });
            this.btnClose.classList.add('close-btn');

            // 将按钮依次插入标题栏
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

            this.container.appendChild(this.titlebar);
            this.container.appendChild(this.contentEl);
            document.body.appendChild(this.container);

            // 重新打开按钮(默认隐藏)
            this.reopenBtn = document.createElement('button');
            this.reopenBtn.className = 'floating-reopen-btn';
            this.reopenBtn.textContent = this.reopenBtnText;
            this.reopenBtn.style.top = this.reopenBtnTop;
            // 默认不显示，只有当close()时才显示（前提是showReopenBtn=true）
            this.reopenBtn.style.display = 'none';
            document.body.appendChild(this.reopenBtn);
            this.reopenBtn.addEventListener('click', () => this.reopen());
        }

        updatePanelBackgroundByTheme() {
            try {
                const theme = UIManager?.globalSettings?.currentTheme || CONFIG.defaultTheme;
                const themeVars = CONFIG.themes[theme] || CONFIG.themes.light;
                this.container.style.backdropFilter = CONFIG.panelLimit.enableBackdropBlur ? 'blur(4px)' : 'none';
                let bg = themeVars.panelContentBg;
                if (!CONFIG.panelLimit.enableBackdropBlur) {
                    bg = bg.replace(/(\d+,\s*\d+,\s*\d+),\s*([\d\.]+)/, '$1,1');
                }
                this.container.style.background = bg;
            } catch (err) {
                logErrorWithStack(err, 'updatePanelBackgroundByTheme');
            }
        }

        initEvents() {
            let offsetX = 0, offsetY = 0;
            const onMove = (e) => {
                if (!this.dragging) return;
                this.container.style.left = (e.clientX - offsetX) + 'px';
                this.container.style.top = (e.clientY - offsetY) + 'px';
            };
            const onUp = () => {
                this.dragging = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                this.snapToEdges();
                this.saveState();
            };

            this.dragHandle.addEventListener('mousedown', e => {
                e.preventDefault();
                ZIndexManager.bringToFront(this.container);
                const rect = this.container.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                this.dragging = true;
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });

            this.container.addEventListener('mousedown', () => {
                ZIndexManager.bringToFront(this.container);
            });
        }

        initResizeObserver() {
            if (!this.allowResize) return;
            if (typeof ResizeObserver !== 'function') return;
            try {
                this.resizeObserver = new ResizeObserver(() => {
                    if (!this.panelState.minimized) {
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

        snapToEdges() {
            try {
                const rect = this.container.getBoundingClientRect();
                let left = rect.left;
                let top = rect.top;
                const sw = window.innerWidth;
                const sh = window.innerHeight;
                const t = CONFIG.panelLimit.snapThreshold;

                if (left < t) left = 0;
                else if (sw - (left + rect.width) < t) left = sw - rect.width;
                if (top < t) top = 0;
                else if (sh - (top + rect.height) < t) top = sh - rect.height;

                const panels = GlobalPanels.getAllPanels();
                for (const p of panels) {
                    if (p === this || p.panelState.closed) continue;
                    const r2 = p.container.getBoundingClientRect();
                    const dxLeft = Math.abs(left - r2.right);
                    const dxRight = Math.abs((left + rect.width) - r2.left);
                    const dyTop = Math.abs(top - r2.bottom);
                    const dyBottom = Math.abs((top + rect.height) - r2.top);
                    if (dxLeft < t && (top + rect.height >= r2.top && top <= r2.bottom)) {
                        left = r2.right;
                    }
                    if (dxRight < t && (top + rect.height >= r2.top && top <= r2.bottom)) {
                        left = r2.left - rect.width;
                    }
                    if (dyTop < t && (left + rect.width >= r2.left && left <= r2.right)) {
                        top = r2.bottom;
                    }
                    if (dyBottom < t && (left + rect.width >= r2.left && left <= r2.right)) {
                        top = r2.top - rect.height;
                    }
                }
                this.container.style.left = left + 'px';
                this.container.style.top = top + 'px';
            } catch (err) {
                logErrorWithStack(err, 'snapToEdges');
            }
        }

        loadState(defaultHeight) {
            if (!this.id) return;
            try {
                const key = CONFIG.panelStatePrefix + this.id;
                const saved = localStorage.getItem(key);
                if (!saved) return;
                const st = JSON.parse(saved);
                if (!st) return;
                Object.assign(this.panelState, st);

                if (!this.panelState.restoredHeight || parseInt(this.panelState.restoredHeight) < 10) {
                    this.panelState.restoredHeight = defaultHeight + 'px';
                }
                const {minimized, closed, left, top, width, height, restoredHeight} = this.panelState;
                this.container.style.left = left;
                this.container.style.top = top;
                this.container.style.width = width;
                this.container.style.height = minimized
                    ? CONFIG.panelEffects.minimizedHeight
                    : (restoredHeight || height);

                if (minimized) {
                    this.container.classList.add('minimized');
                    this.contentEl.style.display = 'none';
                    this.currentMinimizeIcon = CONFIG.ICONS.restore;
                    this.btnMinimize.textContent = this.currentMinimizeIcon;
                }
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

        saveState() {
            if (!this.id) return;
            try {
                const rect = this.container.getBoundingClientRect();
                this.panelState.left = this.container.style.left || (rect.left + 'px');
                this.panelState.top = this.container.style.top || (rect.top + 'px');
                this.panelState.width = this.container.style.width || (rect.width + 'px');
                if (!this.panelState.minimized) {
                    this.panelState.restoredHeight = this.container.style.height || (rect.height + 'px');
                }
                this.panelState.height = this.container.style.height || (rect.height + 'px');
                localStorage.setItem(CONFIG.panelStatePrefix + this.id, JSON.stringify(this.panelState));
            } catch (err) {
                logErrorWithStack(err, 'BaseFloatingPanel saveState');
            }
        }

        setTitle(newTitle) {
            this.titleSpan.textContent = newTitle;
        }

        toggleMinimize() {
            const willMinimize = !this.panelState.minimized;
            if (willMinimize) {
                const rect = this.container.getBoundingClientRect();
                if (rect.height > 40) {
                    this.panelState.restoredHeight = rect.height + 'px';
                }
            }
            this.panelState.minimized = willMinimize;
            if (willMinimize) {
                this.container.classList.add('minimized');
                this.container.style.height = CONFIG.panelEffects.minimizedHeight;
                this.contentEl.style.display = 'none';
                this.currentMinimizeIcon = CONFIG.ICONS.restore;
                this.btnMinimize.textContent = this.currentMinimizeIcon;
                this.onMinimize();
            } else {
                this.container.classList.remove('minimized');
                const rh = this.panelState.restoredHeight || '200px';
                this.container.style.height = rh;
                this.contentEl.style.display = 'block';
                this.currentMinimizeIcon = CONFIG.ICONS.minimize;
                this.btnMinimize.textContent = this.currentMinimizeIcon;
                this.onRestore();
            }
            this.saveState();
        }

        close() {
            // 如果是“destroyOnClose”模式(例如临时预览面板), 直接destroy, 不出现reopen按钮
            if (this.destroyOnClose) {
                // 调用 onClose 回调
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
            this.onClose();
            this.saveState();
        }

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
                this.currentMinimizeIcon = CONFIG.ICONS.restore;
            } else {
                this.container.classList.remove('minimized');
                this.contentEl.style.display = 'block';
                this.currentMinimizeIcon = CONFIG.ICONS.minimize;
                this.container.style.height = this.panelState.restoredHeight;
            }
            this.btnMinimize.textContent = this.currentMinimizeIcon;
            this.updatePanelBackgroundByTheme();
            this.saveState();
        }

        destroy() {
            this.container.remove();
            GlobalPanels.unregister(this);
            if (this.reopenBtn) {
                this.reopenBtn.remove();
            }
        }

        scrollToTop() {
            this.contentEl.scrollTop = 0;
        }

        scrollToBottom() {
            this.contentEl.scrollTop = this.contentEl.scrollHeight;
        }

        static openPreviewPanel(title, jsonString) {
            // 这里的 this 是类本身
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
                showReopenBtn: false,  // 关键：不需要“打开面板”按钮
                destroyOnClose: true,  // 关键：关闭后直接销毁
                onClose: () => {
                    // 关闭时把全局引用清空
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
                // 如果 parse 失败，就保持原字符串
            }
            const html = `<div class="json-preview">${highlightJson(pretty)}</div>`;

            ephemeralPanel.contentEl.innerHTML = `
        <div class="json-preview-content" style="flex:1;overflow:auto;padding:8px;">${html}</div>
    `;
            ephemeralPanel.updatePanelBackgroundByTheme();
            ephemeralPanel.container.style.zIndex = String(ZIndexManager.currentZIndex + 1);
            window.__globalEphemeralPanel = ephemeralPanel;
        }
    }

    /************************************************************************
     * 6. 并发下载队列(DownloadQueue) - 附加日志
     ************************************************************************/
    class DownloadQueue {
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
            this.next();
        }

        next() {
            if (this.queue.length === 0 && this.activeCount === 0) {
                const successCount = this.results.filter(r => r.success).length;
                const failCount = this.results.length - successCount;
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
                    UILogger.logMessage(`DownloadQueue任务失败, 重试(${task.retryCount}): ${err.message}`, 'warn');
                    setTimeout(() => {
                        this.activeCount--;
                        this.queue.unshift(task);
                        this.next();
                    }, this.retryDelay);
                } else {
                    UILogger.logMessage(`DownloadQueue任务彻底失败: ${err.message}`, 'error');
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
     * 7. 日志系统、请求拦截器、PoW 解析
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
                onRestore: () => this.logMessage('日志面板已还原', 'info')
            });

            const btnDownload = BaseFloatingPanel.createPanelButton({
                text: CONFIG.ICONS.downloadLog,
                title: '下载日志文件到本地',
                onClick: () => this.downloadLogs()
            });
            const btnClear = BaseFloatingPanel.createPanelButton({
                text: CONFIG.ICONS.trash,
                title: '清空全部日志记录',
                onClick: () => {
                    inlineConfirm('确定要清空日志吗？此操作不可恢复。', () => {
                        this.clearLogs();
                        this.logMessage('已清空日志', 'warn');
                    });
                }
            });
            const btnAutoScroll = BaseFloatingPanel.createPanelButton({
                text: '⤵️',
                title: '自动滚动到最新日志开关',
                onClick: () => {
                    this.autoScroll = !this.autoScroll;
                    this.logMessage(`自动滚动已切换为 ${this.autoScroll}`, 'info');
                    btnAutoScroll.style.opacity = this.autoScroll ? '1' : '0.5';
                }
            });
            btnAutoScroll.style.opacity = this.autoScroll ? '1' : '0.5';

            const btnWrap = BaseFloatingPanel.createPanelButton({
                text: '↩️',
                title: '换行显示日志开关',
                onClick: () => {
                    this.wrapLines = !this.wrapLines;
                    this.updateWrapMode();
                    this.logMessage(`换行模式已切换为 ${this.wrapLines}`, 'info');
                    btnWrap.style.opacity = this.wrapLines ? '1' : '0.5';
                }
            });
            btnWrap.style.opacity = this.wrapLines ? '1' : '0.5';

            const fragTitle = document.createDocumentFragment();
            fragTitle.appendChild(btnDownload);
            fragTitle.appendChild(btnClear);
            fragTitle.appendChild(btnAutoScroll);
            fragTitle.appendChild(btnWrap);
            this.logPanel.titlebar.insertBefore(fragTitle, this.logPanel.btnMinimize);

            const ul = document.createElement('ul');
            ul.className = 'log-panel-list';
            this.logListEl = ul;
            this.logPanel.contentEl.appendChild(ul);

            // 加载旧日志
            this.logEntries.forEach(ent => {
                ul.appendChild(this.createLogLi(ent));
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

        logMessage(msg, level = 'info') {
            const timeStr = new Date().toLocaleTimeString();
            const line = `[${timeStr}][${level}] ${msg}`;
            this.logEntries.push(line);

            // 若超出最大限制,移除最旧
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

        createLogLi(line, level = 'info') {
            const li = document.createElement('li');
            const themeName = UIManager?.globalSettings?.currentTheme || CONFIG.defaultTheme;
            const themeVars = CONFIG.themes[themeName] || CONFIG.themes.light;
            const multiColor = themeVars.logMultiColor !== false;
            if (multiColor) {
                const re = /^\[([^]+?)\]\[([^]+?)\]\s(.*)$/;
                const m = re.exec(line);
                if (m) {
                    const timePart = m[1];
                    const lvlPart = m[2];
                    const msgPart = m[3];

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

    // 请求拦截
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
            // 根据配置检查大小
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
            if (this.isStarUrl(url, fn)) category = 'star';
            else if (/\/backend-api\//i.test(url)) category = 'backend';
            else if (/^https?:\/\/[^/]*api\./i.test(url)) category = 'api';
            else if (/^https?:\/\/[^/]*public\./i.test(url)) category = 'public';

            const item = {
                url, content, filename: fn,
                sizeKB: kb, method, status,
                headersObj, category
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
            for (const re of CONFIG.claudeListUrlPatterns) {
                if (re.test(reqUrl)) {
                    this.parseClaudeArray(reqUrl, raw);
                    UIManager.updateSpecialDataPanel();
                    return;
                }
            }
            if (/\/backend-api\/conversations\?/i.test(reqUrl)) {
                this.parseChatGPTList(raw);
                UIManager.updateSpecialDataPanel();
                return;
            }
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

        applyTheme(themeName) {
            const themeObj = CONFIG.themes[themeName] || CONFIG.themes.light;
            const rootStyle = document.documentElement.style;
            // 逐条写入CSS变量
            Object.entries(themeObj).forEach(([k, v]) => {
                rootStyle.setProperty(`--${k.replace(/([A-Z])/g, '-$1').toLowerCase()}`, v);
            });
            this.globalSettings.currentTheme = themeName;
            this.saveGlobalSettings();
            // 更新所有面板背景
            const panels = GlobalPanels.getAllPanels();
            for (const p of panels) {
                if (typeof p.updatePanelBackgroundByTheme === 'function') {
                    p.updatePanelBackgroundByTheme();
                }
            }
        },

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
            // 额外写入最小化高度
            document.documentElement.style.setProperty('--minimized-height', CONFIG.panelEffects.minimizedHeight);
        },

        createThemeToggleButton() {
            return BaseFloatingPanel.createPanelButton({
                text: CONFIG.ICONS.themeSwitch,
                title: '切换亮/暗主题',
                onClick: () => {
                    const newTheme = (this.globalSettings.currentTheme === 'light') ? 'dark' : 'light';
                    this.applyTheme(newTheme);
                    UILogger.logMessage(`已切换为 ${newTheme} 主题`, 'info');
                }
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
                onRestore: () => UILogger.logMessage('JSON面板已还原', 'info')
            });

            const btnTheme = this.createThemeToggleButton();
            const btnToggleCat = BaseFloatingPanel.createPanelButton({
                text: CONFIG.ICONS.gear,
                title: '按分类显示或不分类',
                onClick: () => {
                    this.globalSettings.useCategories = !this.globalSettings.useCategories;
                    this.saveGlobalSettings();
                    this.rebuildJsonPanelContent();
                    UILogger.logMessage(`切换分类显示: ${this.globalSettings.useCategories}`, 'info');
                }
            });
            this.jsonPanel.titlebar.insertBefore(btnToggleCat, this.jsonPanel.btnMinimize);
            this.jsonPanel.titlebar.insertBefore(btnTheme, btnToggleCat);
            this.rebuildJsonPanelContent();
        },

        rebuildJsonPanelContent() {
            const contentWrap = this.jsonPanel.contentEl;
            contentWrap.innerHTML = '';

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

            const header = document.createElement('div');
            header.className = 'json-panel-category-header';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'title';
            titleSpan.textContent = title;

            const btnsWrap = document.createElement('div');

            const btnDownload = BaseFloatingPanel.createPanelButton({
                text: CONFIG.ICONS.downloadAll,
                title: `批量下载: ${title}`,
                onClick: () => {
                    const list = this.getRequestsByCategory(catKey);
                    if (!list.length) {
                        UILogger.logMessage(`【${title}】无可下载数据`, 'warn');
                        return;
                    }
                    list.forEach(item => this.downloadSingle(item));
                    UILogger.logMessage(`批量下载完成,分类【${title}】共${list.length}个`, 'info');
                }
            });

            const btnClear = BaseFloatingPanel.createPanelButton({
                text: CONFIG.ICONS.trash,
                title: `清空: ${title}`,
                onClick: () => {
                    inlineConfirm(`确定要清空分类「${title}」吗？此操作不可恢复。`, () => {
                        if (catKey === 'all') {
                            RequestInterceptor.capturedRequests = [];
                        } else {
                            this.removeRequestsByCategory(catKey);
                        }
                        this.updateLists();
                        UILogger.logMessage(`已清空分类: ${title}`, 'warn');
                    });
                }
            });

            let sortNameAsc = true;
            const btnSortName = BaseFloatingPanel.createPanelButton({
                text: '🔼',
                title: `按名称排序 - ${title}`,
                onClick: () => {
                    this.sortCategory(catKey, 'name', sortNameAsc);
                    sortNameAsc = !sortNameAsc;
                    btnSortName.textContent = sortNameAsc ? '🔼' : '🔽';
                }
            });

            let sortSizeAsc = true;
            const btnSortSize = BaseFloatingPanel.createPanelButton({
                text: '🔼',
                title: `按大小排序 - ${title}`,
                onClick: () => {
                    this.sortCategory(catKey, 'size', sortSizeAsc);
                    sortSizeAsc = !sortSizeAsc;
                    btnSortSize.textContent = sortSizeAsc ? '🔼' : '🔽';
                }
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
                // 先移除这个分类的，再把排好序的插回去
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

            // 复制
            const btnCopy = document.createElement('span');
            btnCopy.className = 'icon';
            btnCopy.textContent = CONFIG.ICONS.copy;
            btnCopy.title = '复制此JSON到剪贴板';
            btnCopy.addEventListener('click', () => {
                copyText(item.content);
                UILogger.logMessage('复制JSON: ' + item.filename, 'info');
            });

            // 下载
            const btnDownload = document.createElement('span');
            btnDownload.className = 'icon';
            btnDownload.textContent = CONFIG.ICONS.downloadAll;
            btnDownload.title = '下载此JSON文件';
            btnDownload.addEventListener('click', () => {
                this.downloadSingle(item);
            });

            // 预览
            const btnPreview = document.createElement('span');
            btnPreview.className = 'icon';
            btnPreview.textContent = CONFIG.ICONS.preview;
            btnPreview.title = '预览此JSON';
            btnPreview.addEventListener('click', () => {
                this.previewJson(item);
            });

            // 删除
            const btnRemoveItem = document.createElement('span');
            btnRemoveItem.className = 'icon';
            btnRemoveItem.textContent = CONFIG.ICONS.removeItem;
            btnRemoveItem.title = '删除此条抓取记录';
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
                onRestore: () => UILogger.logMessage('特殊数据解析面板已还原', 'info')
            });

            const btnClear = BaseFloatingPanel.createPanelButton({
                text: CONFIG.ICONS.trash,
                title: '清空所有解析数据(Claude/ChatGPT)',
                onClick: () => {
                    inlineConfirm('确定清空全部解析数据吗？此操作不可恢复。', () => {
                        SpecialDataParser.claudeConvData.length = 0;
                        SpecialDataParser.chatgptConvData.length = 0;
                        SpecialDataParser.chatgptTasksData.length = 0;
                        this.updateSpecialDataPanel();
                        UILogger.logMessage('已清空特殊数据解析', 'warn');
                    });
                }
            });
            const btnCSV = BaseFloatingPanel.createPanelButton({
                text: CONFIG.ICONS.table,
                title: '导出所有解析数据为CSV',
                onClick: () => this.downloadSpecialDataAsCSV()
            });
            const btnFoldAll = BaseFloatingPanel.createPanelButton({
                text: CONFIG.ICONS.fold,
                title: '折叠所有分类',
                onClick: () => this.foldAllCategories(true)
            });
            const btnUnfoldAll = BaseFloatingPanel.createPanelButton({
                text: CONFIG.ICONS.unfold,
                title: '展开所有分类',
                onClick: () => this.foldAllCategories(false)
            });

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

            // Claude
            this.claudeCat = this.createFoldableCategory('Claude对话');
            wrap.appendChild(this.claudeCat.wrapper);

            const topBar = document.createElement('div');
            topBar.style.display = 'inline-flex';
            topBar.style.gap = '6px';
            topBar.style.marginLeft = 'auto';

            CONFIG.claudeBatchButtons.forEach(cfg => {
                if (!cfg.enabled) return;
                const btn = BaseFloatingPanel.createPanelButton({
                    text: cfg.icon || cfg.label,
                    title: `下载${cfg.days === Infinity ? '全部' : '最近' + cfg.days + '天'}的Claude对话`,
                    onClick: () => {
                        if (cfg.days === Infinity) {
                            this.batchDownloadClaude(SpecialDataParser.claudeConvData, cfg.label);
                        } else {
                            this.batchDownloadClaudeWithinDays(cfg.days);
                        }
                    }
                });
                topBar.appendChild(btn);
            });
            this.claudeCat.header.appendChild(topBar);

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

            // ChatGPT
            this.chatgptCat = this.createFoldableCategory('ChatGPT对话');
            wrap.appendChild(this.chatgptCat.wrapper);

            const chatgptUl = document.createElement('ul');
            chatgptUl.className = 'special-data-list';
            this.chatgptCat.content.appendChild(chatgptUl);
            this.chatgptListEl = chatgptUl;

            // ChatGPT任务
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

            const header = document.createElement('div');
            header.className = 'special-data-category-header';

            const foldIcon = document.createElement('span');
            foldIcon.textContent = CONFIG.ICONS.unfold;
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
                foldIcon.textContent = folded ? CONFIG.ICONS.fold : CONFIG.ICONS.unfold;
                content.style.display = folded ? 'none' : 'block';
            });

            return {wrapper, header, content, foldIcon, folded};
        },

        foldAllCategories(fold) {
            [this.claudeCat, this.chatgptCat, this.chatgptTaskCat].forEach(catObj => {
                if (catObj) {
                    catObj.folded = fold;
                    catObj.foldIcon.textContent = fold ? CONFIG.ICONS.fold : CONFIG.ICONS.unfold;
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
                        dlIcon.textContent = CONFIG.ICONS.downloadAll;
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
                        dlIcon.textContent = CONFIG.ICONS.downloadAll;
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
            catObj.foldIcon.textContent = fold ? CONFIG.ICONS.fold : CONFIG.ICONS.unfold;
            catObj.content.style.display = fold ? 'none' : 'block';
        }
    };

    /************************************************************************
     * 10. 主入口(main) & 样式注入
     ************************************************************************/
    function findStarUuid() {
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

    // 注入CSS(单文件,不引用外部资源)
    const cssText = `
/* 行内确认(InlineConfirm) - 颜色/字号从主题及CONFIG.fontSizes获取 */
.inline-confirm-container {
    position: fixed;
    right: 16px;
    bottom: 16px;
    z-index: 999999999;
    background: var(--inline-confirm-bg);
    color: var(--inline-confirm-text);
    border: 1px solid var(--inline-confirm-border);
    padding: 8px 12px;
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
    background: #fff1;
    color: inherit;
    border-radius: 4px;
    cursor: pointer;
    font-size: var(--font-size-inline-confirm);
    padding: 2px 6px;
}

.inline-confirm-btn:hover {
    background: #fff2;
}

.inline-confirm-yes {
    /* 对号 - 绿色背景 */
    background: var(--inline-confirm-yes-bg);
    color: var(--inline-confirm-yes-text);
    margin-left: 6px;
}

.inline-confirm-no {
    /* 错号 - 红色背景 */
    background: var(--inline-confirm-no-bg);
    color: var(--inline-confirm-no-text);
}

/* 通用面板样式 */
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
    height: var(--minimized-height, 36px) !important;
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
    width: 18px;
    height: 18px;
    margin: 0 4px;
    background-color: var(--panel-handle-color);
    border-radius: 4px;
    cursor: move;
    box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.4);
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
    color: var(--panel-btn-text-color);
    font-size: var(--button-size-titlebar);
}

.floating-panel-btn:hover {
    background: rgba(0, 0, 0, 0.1);
}

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
    border: 1px solid #999;
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
    padding: 4px;
    font-size: var(--font-size-content);
    color: var(--panel-btn-text-color);
}

/* 日志面板 */
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

/* JSON面板搜索 */
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

/* 分类 */
.json-panel-category {
    margin: 8px;
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
    padding: 4px 8px;
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
    padding: 4px 8px;
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
    color: #666;
}

.size-span {
    color: #999;
}

/* JSON预览面板 */
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

/* 特殊数据面板 */
.special-data-category {
    margin: 8px;
    border: 1px solid var(--category-border-color);
    border-radius: 6px;
    background: transparent;
    padding-bottom: 4px;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
}

.special-data-category-header {
    display: flex;
    align-items: center;
    padding: 4px 8px;
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
    padding: 4px 8px;
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

/* Claude进度条 */
.claude-progress-wrap {
    margin: 8px;
    border: 1px solid var(--panel-border-color);
    border-radius: 4px;
    height: 28px;
    position: relative;
    background: #f8f8f899;
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
    line-height: 28px;
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
