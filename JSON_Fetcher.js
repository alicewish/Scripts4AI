// ==UserScript==
// @name         JSON Fetcher (Enhanced)
// @name:zh-CN   JSON请求抓取 (增强版)
// @namespace    https://github.com/alicewish/
// @version      1.2
// @author       Alicewish
// @description  Claude对话单个&批量下载(含会话名称)、ChatGPT对话单个下载；所有浮动面板支持一键到顶部/一键到底部；Claude支持1天/一周/一月内筛选+进度条；日志可下载；特殊数据解析可下载为表格。增强版：可配置面板初始位置/尺寸、图标更准确、日志字体更小、更紧凑、窗体半透明、特殊数据标题字号更大&下载按钮同行右侧
// @match        *://yiyan.baidu.com/*
// @match        *://*.chatgpt.com/*
// @match        *://*.claude.ai/*
// @match        *://*.poe.com/*
// @license      MIT
// @grant        none
// @run-at       document-start
// ==/UserScript==
(function () {
    'use strict';

    /************************************************************************
     * 1) 可修改的常量 - 初始位置尺寸 & 透明度 & 图标
     ************************************************************************/
    // 三个主要面板的初始位置、大小(可根据需求自行调整)
    const INITIAL_LOG_PANEL = {
            left: 'calc(50% - 300px)', // 日志面板初始X位置
            top: '100px',              // 日志面板初始Y位置
            width: 400,               // 宽度
            height: 300               // 高度
        };

    const INITIAL_JSON_PANEL = {
        left: 'calc(50% - 600px)', // JSON面板初始X位置
        top: '100px',              // JSON面板初始Y位置
        width: 400,                // 宽度
        height: 500                // 高度
    };

    const INITIAL_SPEC_PANEL = {
        left: 'calc(50% + 200px)', // 特殊数据解析面板初始X位置
        top: '100px',              // 初始Y位置
        width: 420,                // 宽度
        height: 320                // 高度
    };

    // 所有浮动窗体(含JSON预览)统一半透明度
    const PANEL_OPACITY = 0.92;

    // 新图标：更准确表达含义
    const ICONS = {
        downloadAll: '⬇️',       // 批量下载
        downloadLog: '📥',       // 下载日志
        trash: '🗑️',            // 清空
        scrollTop: '↥',         // 滚动到顶部
        scrollBottom: '↧',      // 滚动到底部
        minimize: '➖',          // 最小化
        close: '✖️',            // 关闭
        copy: '📋',             // 复制
        preview: '👁️',          // 预览
        gear: '⚙',              // 设置
        day: '⬇️一天',           // 下载最近1天
        week: '⬇️一周',
        month: '⬇️一月',
        table: '⬇️表格'         // 下载表格
    };

    /************************************************************************
     * [RequestInterceptor] - 负责抓取 Xhr/Fetch, 进行分类、去重
     ************************************************************************/
    const RequestInterceptor = {
        capturedRequests: [],
        starUuid: '',

        init() {
            this.overrideXHR();
            this.overrideFetch();
        },

        overrideXHR() {
            const originOpen = XMLHttpRequest.prototype.open;
            const originSend = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.open = function (method, url, ...rest) {
                this._requestMethod = method;
                this._requestUrl = url;
                return originOpen.apply(this, [method, url, ...rest]);
            };
            XMLHttpRequest.prototype.send = function (...args) {
                this.addEventListener('loadend', () => {
                    try {
                        const ct = this.getResponseHeader('content-type') || '';
                        if (RequestInterceptor.isJson(ct) && RequestInterceptor.shouldCapture(this._requestUrl)) {
                            const respText = this.responseText;
                            const status = this.status;
                            let headersObj = {};
                            const cLen = this.getResponseHeader('Content-Length');
                            if (cLen) headersObj['Content-Length'] = cLen;

                            RequestInterceptor.addCaptured(this._requestUrl, respText, this._requestMethod, status, headersObj);
                        }
                    } catch (err) {
                        UILogger.logMessage(`XHR抓取错误: ${err.message}`);
                        console.warn('[TM XHR Error]', err);
                    }
                });
                return originSend.apply(this, args);
            };
        },

        overrideFetch() {
            if (!window.fetch) return;
            const originFetch = window.fetch;
            window.fetch = async function (input, init) {
                const fetchPromise = originFetch(input, init);
                try {
                    const url = (typeof input === 'string') ? input : (input.url || '');
                    const resp = await fetchPromise;
                    const ct = resp.headers.get('content-type') || '';
                    const status = resp.status;
                    let headersObj = {};
                    const cLen = resp.headers.get('content-length');
                    if (cLen) headersObj['Content-Length'] = cLen;

                    if (RequestInterceptor.isJson(ct) && RequestInterceptor.shouldCapture(url)) {
                        const cloneResp = resp.clone();
                        const text = await cloneResp.text();
                        const method = (init && init.method) || 'GET';
                        RequestInterceptor.addCaptured(url, text, method, status, headersObj);
                    }
                    return resp;
                } catch (err) {
                    UILogger.logMessage(`fetch抓取错误: ${err.message}`);
                    console.warn('[TM fetch Error]', err);
                    return fetchPromise;
                }
            };
        },

        isJson(ct) {
            return ct.toLowerCase().includes('application/json');
        },
        shouldCapture(url) {
            // 如果想排除某些url，可在此处添加逻辑
            return !!url;
        },

        // star -> backend -> public -> api -> other
        CATEGORY_RULES: [
            {
                key: 'star',
                label: '星标',
                match: (lowerUrl) => RequestInterceptor.starUuid && lowerUrl.includes(RequestInterceptor.starUuid.toLowerCase())
            },
            {
                key: 'backend',
                label: 'Backend API',
                match: (lowerUrl) => lowerUrl.includes('backend-api')
            },
            {
                key: 'public',
                label: 'Public API',
                match: (lowerUrl) => lowerUrl.includes('public-api')
            },
            {
                key: 'api',
                label: 'API',
                match: (lowerUrl) => lowerUrl.includes('/api/')
            }
        ],

        isDuplicateUrl(url) {
            return this.capturedRequests.some(it => it.url === url);
        },

        addCaptured(url, content, method, status, headersObj) {
            // 跳过重复
            if (this.isDuplicateUrl(url)) {
                UILogger.logMessage(`重复请求，跳过: ${url}`);
                return;
            }

            let filename = url.split('/').pop().split('?')[0] || 'download';
            try {
                filename = decodeURIComponent(filename);
            } catch (e) {
            }

            const sizeKB = (content.length / 1024).toFixed(2);

            let category = 'other';
            const lowerUrl = url.toLowerCase();
            for (const rule of this.CATEGORY_RULES) {
                if (rule.match(lowerUrl)) {
                    category = rule.key;
                    break;
                }
            }

            const item = {url, content, filename, sizeKB, method, category, status, headersObj};
            this.capturedRequests.push(item);

            UILogger.logMessage(`捕获JSON (${method}) [${status || '--'}]: ${url}`);

            PoWParser.checkDifficulty(content);
            SpecialDataParser.parse(url, content);
            UIManager.updateLists();
        }
    };

    /************************************************************************
     * [UILogger] - 日志面板 (等宽字体 + 下载功能, 字体更小/紧凑)
     ************************************************************************/
    const LOG_STORAGE_KEY = 'JSONInterceptorLogs';
    const UILogger = {
        logEntries: [],
        logPanel: null,
        logListEl: null,

        init() {
            try {
                const saved = localStorage.getItem(LOG_STORAGE_KEY);
                if (saved) {
                    const arr = JSON.parse(saved);
                    if (Array.isArray(arr)) {
                        this.logEntries.push(...arr);
                    }
                }
            } catch (e) {
                console.warn('日志读取失败', e);
            }
            this.initLogPanel();
        },

        initLogPanel() {
            this.logPanel = new FloatingPanel({
                id: 'log-panel-container',
                title: '操作日志',
                defaultLeft: INITIAL_LOG_PANEL.left,
                defaultTop: INITIAL_LOG_PANEL.top,
                defaultWidth: INITIAL_LOG_PANEL.width,
                defaultHeight: INITIAL_LOG_PANEL.height,
                reopenBtnText: '打开日志面板',
                reopenBtnTop: '50px',
                onClose: () => this.logMessage('日志面板已关闭'),
                onMinimize: () => this.logMessage('日志面板已最小化'),
                onRestore: () => this.logMessage('日志面板已还原')
            });

            // 下载日志按钮
            const btnDownloadLog = createPanelButton({
                text: ICONS.downloadLog,
                title: '下载日志文件',
                onClick: () => {
                    this.downloadLogs();
                }
            });
            // 清空日志
            const btnClear = createPanelButton({
                text: ICONS.trash,
                title: '清空日志',
                onClick: () => {
                    this.clearLogs();
                    this.logMessage('已清空日志');
                }
            });
            this.logPanel.titlebar.insertBefore(btnDownloadLog, this.logPanel.btnMinimize);
            this.logPanel.titlebar.insertBefore(btnClear, this.logPanel.btnMinimize);

            const ul = document.createElement('ul');
            ul.id = 'log-panel-list';
            // 字体更小、更紧凑
            ul.style.fontSize = '11px';
            ul.style.lineHeight = '1.2';
            ul.style.margin = 0;
            ul.style.padding = 0;
            ul.style.fontFamily = 'monospace';
            ul.style.whiteSpace = 'pre';

            this.logListEl = ul;
            this.logPanel.contentEl.appendChild(ul);

            // 加载历史日志
            this.logEntries.forEach(entry => {
                const li = document.createElement('li');
                li.textContent = entry;
                ul.appendChild(li);
            });
            ul.scrollTop = ul.scrollHeight;
        },

        downloadLogs() {
            const title = document.title.replace(/[\\/:*?"<>|]/g, '_') || 'log';
            const now = new Date();
            const y = now.getFullYear();
            const M = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            const ss = String(now.getSeconds()).padStart(2, '0');
            const filename = `${title}-${y}${M}${d}-${hh}${mm}${ss}.log`;

            const text = this.logEntries.join('\n');
            const blob = new Blob([text], {type: 'text/plain'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.logMessage(`日志已下载: ${filename}`);
        },

        logMessage(msg) {
            const timeStr = new Date().toLocaleTimeString();
            const line = `[${timeStr}] ${msg}`;
            this.logEntries.push(line);
            try {
                localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logEntries));
            } catch (e) {
            }
            if (this.logListEl) {
                const li = document.createElement('li');
                li.textContent = line;
                this.logListEl.appendChild(li);
                this.logListEl.scrollTop = this.logListEl.scrollHeight;
            }
        },

        clearLogs() {
            this.logEntries.length = 0;
            try {
                localStorage.setItem(LOG_STORAGE_KEY, '[]');
            } catch (e) {
            }
            if (this.logListEl) {
                this.logListEl.innerHTML = '';
            }
        }
    };


    /************************************************************************
     * [FloatingPanel] - 通用面板(标题栏固定 + 半透明 + 一键到顶/底 + snapEdges)
     ************************************************************************/
    class FloatingPanel {
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

            // 统一半透明
            this.panelOpacity = PANEL_OPACITY;

            this.panelState = {
                minimized: false,
                closed: false,
                left: defaultLeft,
                top: defaultTop,
                width: defaultWidth + 'px',
                height: defaultHeight + 'px'
            };

            this.dragging = false;

            this.initDom();
            this.loadState();
            this.initEvents();
            this.initResizeObserver();
        }

        initDom() {
            // 创建容器
            this.container = document.createElement('div');
            this.container.classList.add('floating-panel');
            if (this.id) {
                this.container.id = this.id;
            }

            // 设置初始位置 & 半透明
            this.container.style.left = this.panelState.left;
            this.container.style.top = this.panelState.top;
            this.container.style.width = this.panelState.width;
            this.container.style.height = this.panelState.height;
            this.container.style.opacity = this.panelOpacity;

            // 标题栏
            this.titlebar = document.createElement('div');
            this.titlebar.className = 'floating-panel-titlebar';

            this.dragHandle = document.createElement('div');
            this.dragHandle.className = 'floating-panel-drag-handle';

            this.titleSpan = document.createElement('span');
            this.titleSpan.className = 'floating-panel-title';
            this.titleSpan.textContent = this.title;

            // 上下滚
            this.btnScrollTop = createPanelButton({
                text: ICONS.scrollTop,
                title: '滚动到顶部',
                onClick: () => this.scrollToTop()
            });
            this.btnScrollBottom = createPanelButton({
                text: ICONS.scrollBottom,
                title: '滚动到底部',
                onClick: () => this.scrollToBottom()
            });

            // 最小化、关闭
            this.btnMinimize = createPanelButton({
                text: ICONS.minimize,
                title: '最小化/还原',
                onClick: () => this.toggleMinimize()
            });
            this.btnClose = createPanelButton({
                text: ICONS.close,
                title: '关闭面板',
                onClick: () => this.close()
            });

            // 标题栏组装
            this.titlebar.appendChild(this.dragHandle);
            this.titlebar.appendChild(this.titleSpan);
            this.titlebar.appendChild(this.btnScrollTop);
            this.titlebar.appendChild(this.btnScrollBottom);
            this.titlebar.appendChild(this.btnMinimize);
            this.titlebar.appendChild(this.btnClose);

            // 内容区
            this.contentEl = document.createElement('div');
            this.contentEl.className = 'floating-panel-content';

            // 完整组装
            this.container.appendChild(this.titlebar);
            this.container.appendChild(this.contentEl);
            document.body.appendChild(this.container);

            // 重新打开按钮
            this.reopenBtn = document.createElement('button');
            this.reopenBtn.className = 'floating-reopen-btn';
            this.reopenBtn.textContent = this.reopenBtnText;
            this.reopenBtn.style.top = this.reopenBtnTop;
            document.body.appendChild(this.reopenBtn);
            this.reopenBtn.addEventListener('click', () => {
                this.reopen();
            });
        }

        initEvents() {
            let offsetX = 0, offsetY = 0;
            const onMouseMove = e => {
                if (!this.dragging) return;
                this.container.style.left = (e.clientX - offsetX) + 'px';
                this.container.style.top = (e.clientY - offsetY) + 'px';
            };
            const onMouseUp = () => {
                this.dragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                this.snapEdges();
                this.saveState();
            };

            this.dragHandle.addEventListener('mousedown', e => {
                e.preventDefault();
                ZIndexManager.bringToFront(this.container);
                const rect = this.container.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                this.dragging = true;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            // 点击面板时置顶
            this.container.addEventListener('mousedown', () => {
                ZIndexManager.bringToFront(this.container);
            });
        }

        initResizeObserver() {
            if (typeof ResizeObserver !== 'function') return;
            this.resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    if (entry.target === this.container && !this.dragging) {
                        this.saveState();
                    }
                }
            });
            this.resizeObserver.observe(this.container);
        }

        snapEdges() {
            const threshold = 20;
            const rect = this.container.getBoundingClientRect();
            const sw = window.innerWidth;
            const sh = window.innerHeight;
            let left = rect.left, top = rect.top;
            if (left < threshold) left = 0;
            else if (sw - (left + rect.width) < threshold) left = sw - rect.width;
            if (top < threshold) top = 0;
            else if (sh - (top + rect.height) < threshold) top = sh - rect.height;
            this.container.style.left = left + 'px';
            this.container.style.top = top + 'px';
        }

        loadState() {
            if (!this.id) return;
            const key = 'FloatingPanelState_' + this.id;
            const saved = localStorage.getItem(key);
            if (!saved) return;
            let st;
            try {
                st = JSON.parse(saved);
            } catch (e) {
                return;
            }
            if (!st) return;

            Object.assign(this.panelState, st);
            const {minimized, closed, left, top, width, height} = this.panelState;
            this.container.style.left = left;
            this.container.style.top = top;
            this.container.style.width = width;
            if (!minimized && height) {
                this.container.style.height = height;
            }
            if (minimized) {
                this.container.classList.add('minimized');
                this.contentEl.style.display = 'none';
            }
            if (closed) {
                this.container.style.display = 'none';
                if (this.showReopenBtn) {
                    this.reopenBtn.style.display = 'block';
                }
            }
        }

        saveState() {
            if (!this.id) return;
            const rect = this.container.getBoundingClientRect();
            this.panelState.left = this.container.style.left || (rect.left + 'px');
            this.panelState.top = this.container.style.top || (rect.top + 'px');
            this.panelState.width = this.container.style.width || (rect.width + 'px');
            if (!this.panelState.minimized) {
                this.panelState.height = this.container.style.height || (rect.height + 'px');
            }
            const key = 'FloatingPanelState_' + this.id;
            localStorage.setItem(key, JSON.stringify(this.panelState));
        }

        setTitle(newTitle) {
            this.titleSpan.textContent = newTitle;
        }

        toggleMinimize() {
            const minimized = !this.panelState.minimized;
            this.panelState.minimized = minimized;
            if (minimized) {
                this.container.classList.add('minimized');
                this._prevHeight = this.container.style.height;
                this.container.style.height = '36px';
                this.contentEl.style.display = 'none';
                this.onMinimize();
            } else {
                this.container.classList.remove('minimized');
                if (this._prevHeight) {
                    this.container.style.height = this._prevHeight;
                }
                this.contentEl.style.display = 'block';
                this.onRestore();
            }
            this.saveState();
        }

        close() {
            this.panelState.closed = true;
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
            this.container.classList.remove('minimized');
            if (this.panelState.minimized) {
                this.panelState.minimized = false;
                this.contentEl.style.display = 'block';
            }
            this.reopenBtn.style.display = 'none';
            this.saveState();
        }

        scrollToTop() {
            this.contentEl.scrollTop = 0;
        }

        scrollToBottom() {
            this.contentEl.scrollTop = this.contentEl.scrollHeight;
        }
    }

    /************************************************************************
     * [ZIndexManager] - 用于管理面板层级
     ************************************************************************/
    const ZIndexManager = {
        currentZIndex: 999999,
        bringToFront(el) {
            this.currentZIndex++;
            el.style.zIndex = this.currentZIndex;
        }
    };


    /************************************************************************
     * [PoWParser] - 检测 PoW 难度
     ************************************************************************/
    const PoWParser = {
        currentDifficulty: '',
        checkDifficulty(raw) {
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
     * [SpecialDataParser] - 解析Claude/ChatGPT并支持单个/批量下载
     ************************************************************************/
    const SpecialDataParser = {
        claudeData: [],
        chatgptData: [],

        parse(reqUrl, raw) {
            // 1) Claude array
            const reClaudeList = /\/api\/organizations\/([^/]+)\/chat_conversations$/i;
            if (reClaudeList.test(reqUrl) && !reqUrl.includes('?')) {
                this.parseClaudeArray(reqUrl, raw);
            }
            // 2) ChatGPT
            const reChatgptList = /\/backend-api\/conversations\?/i;
            if (reChatgptList.test(reqUrl)) {
                this.parseChatGPTList(raw);
            }
            UIManager.updateSpecialDataPanel();
        },

        parseClaudeArray(reqUrl, raw) {
            try {
                const arr = JSON.parse(raw);
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
                    this.claudeData.push({
                        uuid,
                        name,
                        updated_at_shanghai: shTime,
                        convUrl
                    });
                });
            } catch (e) {
                UILogger.logMessage(`解析Claude数据出错: ${e.message}`);
            }
        },

        parseChatGPTList(raw) {
            try {
                const obj = JSON.parse(raw);
                if (!obj || !Array.isArray(obj.items)) return;
                // chatgpt.com/backend-api/conversation/<id>
                obj.items.forEach(item => {
                    const {id, title, update_time} = item;
                    const shTime = this.toShanghai(update_time);
                    let convUrl = '';
                    if (id) {
                        convUrl = `https://chatgpt.com/backend-api/conversation/${id}`;
                    }
                    this.chatgptData.push({id, title, update_time_shanghai: shTime, convUrl});
                });
            } catch (e) {
                UILogger.logMessage(`解析ChatGPT数据出错: ${e.message}`);
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

        async downloadClaudeConversation(claudeItem) {
            if (!claudeItem || !claudeItem.convUrl) {
                UILogger.logMessage('Claude对话下载跳过：无有效链接');
                return;
            }
            const {convUrl, name = '', uuid = ''} = claudeItem;
            try {
                const resp = await fetch(convUrl);
                if (!resp.ok) {
                    UILogger.logMessage(`Claude对话下载失败: HTTP ${resp.status} - ${name}-${uuid}`);
                    return;
                }
                const txt = await resp.text();
                let safeName = name.replace(/[\\/:*?"<>|]/g, '_');
                let fileName = safeName || 'claude-conv';
                if (uuid) fileName += '-' + uuid;
                if (!fileName.endsWith('.json')) {
                    fileName += '.json';
                }
                const blob = new Blob([txt], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                UILogger.logMessage(`Claude对话已下载：${fileName}`);
            } catch (e) {
                UILogger.logMessage(`下载Claude对话出错：${e.message} - ${name}-${uuid}`);
            }
        },

        async downloadChatGPTConversation(convUrl) {
            if (!convUrl) {
                UILogger.logMessage('ChatGPT对话下载跳过：无有效链接');
                return;
            }
            try {
                const resp = await fetch(convUrl);
                if (!resp.ok) {
                    UILogger.logMessage(`ChatGPT对话下载失败: HTTP ${resp.status}`);
                    return;
                }
                const txt = await resp.text();
                let fileName = convUrl.split('/').pop().split('?')[0] || 'chatgpt-conv';
                if (!fileName.endsWith('.json')) fileName += '.json';

                const blob = new Blob([txt], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                UILogger.logMessage(`ChatGPT对话已下载：${fileName}`);
            } catch (e) {
                UILogger.logMessage(`下载ChatGPT对话出错：${e.message}`);
            }
        }
    };


    /************************************************************************
     * [UIManager] - JSON面板 & 特殊数据解析面板
     ************************************************************************/
    const SETTINGS_KEY = 'JSONInterceptorSettings';

    const UIManager = {
        globalSettings: {useCategories: true},
        currentSearchText: '',

        // JSON面板
        jsonPanel: null,
        starListEl: null,
        backendListEl: null,
        publicListEl: null,
        apiListEl: null,
        otherListEl: null,
        singleListEl: null,

        // 特殊数据解析面板
        specialDataPanel: null,
        claudeListEl: null,
        chatgptListEl: null,

        // Claude 批量下载进度
        claudeProgressWrap: null,
        claudeProgressBar: null,
        claudeProgressText: null,

        init() {
            try {
                const savedStr = localStorage.getItem(SETTINGS_KEY);
                if (savedStr) {
                    const obj = JSON.parse(savedStr);
                    if (obj) this.globalSettings = obj;
                }
            } catch (e) {
            }

            this.initJsonPanel();
            this.initSpecialDataPanel();
        },

        initJsonPanel() {
            this.jsonPanel = new FloatingPanel({
                id: 'json-panel-container',
                title: 'JSON 抓取器',
                defaultLeft: INITIAL_JSON_PANEL.left,
                defaultTop: INITIAL_JSON_PANEL.top,
                defaultWidth: INITIAL_JSON_PANEL.width,
                defaultHeight: INITIAL_JSON_PANEL.height,
                reopenBtnText: '打开JSON抓取器',
                reopenBtnTop: '10px',
                onClose: () => UILogger.logMessage('JSON面板已关闭'),
                onMinimize: () => UILogger.logMessage('JSON面板已最小化'),
                onRestore: () => UILogger.logMessage('JSON面板已还原')
            });

            // 插入一个“切换分类”按钮
            const btnSettings = createPanelButton({
                text: ICONS.gear,
                title: '切换是否使用分类',
                onClick: () => {
                    this.globalSettings.useCategories = !this.globalSettings.useCategories;
                    this.saveGlobalSettings();
                    this.rebuildJsonPanelContent();
                    UILogger.logMessage('切换 useCategories=' + this.globalSettings.useCategories);
                }
            });
            this.jsonPanel.titlebar.insertBefore(btnSettings, this.jsonPanel.btnMinimize);

            this.rebuildJsonPanelContent();
        },

        rebuildJsonPanelContent() {
            if (!this.jsonPanel) return;
            const contentWrap = this.jsonPanel.contentEl;
            contentWrap.innerHTML = '';

            // 搜索区
            const searchWrap = document.createElement('div');
            searchWrap.className = 'json-panel-search-wrap';
            const lbl = document.createElement('label');
            lbl.textContent = '搜索:';
            const inp = document.createElement('input');
            inp.type = 'text';
            inp.className = 'json-panel-search-input';
            inp.placeholder = '按 URL/filename 过滤...';
            inp.value = this.currentSearchText;
            inp.addEventListener('input', () => {
                this.currentSearchText = inp.value.trim().toLowerCase();
                this.updateLists();
            });
            searchWrap.appendChild(lbl);
            searchWrap.appendChild(inp);
            contentWrap.appendChild(searchWrap);

            if (this.globalSettings.useCategories) {
                // star
                const starCat = this.createCategorySection('星标',
                    () => this.downloadAll(this.getRequestsByCategory('star')),
                    () => {
                        this.removeRequestsByCategory('star');
                        this.updateLists();
                    },
                    'star'
                );
                this.starListEl = starCat.listEl;
                contentWrap.appendChild(starCat.wrapper);

                // backend
                const backendCat = this.createCategorySection('Backend API',
                    () => this.downloadAll(this.getRequestsByCategory('backend')),
                    () => {
                        this.removeRequestsByCategory('backend');
                        this.updateLists();
                    },
                    'backend'
                );
                this.backendListEl = backendCat.listEl;
                contentWrap.appendChild(backendCat.wrapper);

                // public
                const publicCat = this.createCategorySection('Public API',
                    () => this.downloadAll(this.getRequestsByCategory('public')),
                    () => {
                        this.removeRequestsByCategory('public');
                        this.updateLists();
                    },
                    'public'
                );
                this.publicListEl = publicCat.listEl;
                contentWrap.appendChild(publicCat.wrapper);

                // api
                const apiCat = this.createCategorySection('API',
                    () => this.downloadAll(this.getRequestsByCategory('api')),
                    () => {
                        this.removeRequestsByCategory('api');
                        this.updateLists();
                    },
                    'api'
                );
                this.apiListEl = apiCat.listEl;
                contentWrap.appendChild(apiCat.wrapper);

                // other
                const otherCat = this.createCategorySection('其他',
                    () => this.downloadAll(this.getRequestsByCategory('other')),
                    () => {
                        this.removeRequestsByCategory('other');
                        this.updateLists();
                    },
                    'other'
                );
                this.otherListEl = otherCat.listEl;
                contentWrap.appendChild(otherCat.wrapper);

            } else {
                // 单列表(all)
                const allCat = this.createCategorySection('所有请求',
                    () => this.downloadAll(RequestInterceptor.capturedRequests),
                    () => {
                        RequestInterceptor.capturedRequests.length = 0;
                        this.updateLists();
                    },
                    'all'
                );
                this.singleListEl = allCat.listEl;
                contentWrap.appendChild(allCat.wrapper);
            }

            this.updateLists();
        },

        createCategorySection(title, onDownloadAll, onClearAll, cat) {
            const wrapper = document.createElement('div');
            wrapper.className = 'json-panel-category';

            const header = document.createElement('div');
            header.className = 'json-panel-category-header';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'title';
            titleSpan.textContent = title;

            const btnsWrap = document.createElement('div');

            const btnDownload = createPanelButton({
                text: ICONS.downloadAll,
                title: `批量下载 - ${title}`,
                onClick: onDownloadAll
            });
            const btnClear = createPanelButton({
                text: ICONS.trash,
                title: `清空 - ${title}`,
                onClick: onClearAll
            });

            let sortNameAsc = true;
            const btnSortName = createPanelButton({
                text: '🔼',
                title: `按名称排序 - ${title}`,
                onClick: () => {
                    this.sortCategory(cat, 'name', sortNameAsc);
                    sortNameAsc = !sortNameAsc;
                    btnSortName.textContent = sortNameAsc ? '🔼' : '🔽';
                }
            });

            let sortSizeAsc = true;
            const btnSortSize = createPanelButton({
                text: '🔼',
                title: `按大小排序 - ${title}`,
                onClick: () => {
                    this.sortCategory(cat, 'size', sortSizeAsc);
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

            return {wrapper, listEl};
        },

        getRequestsByCategory(cat) {
            if (cat === 'all') {
                return this.filterBySearch(RequestInterceptor.capturedRequests);
            }
            const arr = RequestInterceptor.capturedRequests.filter(it => it.category === cat);
            return this.filterBySearch(arr);
        },
        filterBySearch(arr) {
            if (!this.currentSearchText) return arr;
            return arr.filter(it => {
                const u = (it.url || '').toLowerCase();
                const f = (it.filename || '').toLowerCase();
                return u.includes(this.currentSearchText) || f.includes(this.currentSearchText);
            });
        },
        removeRequestsByCategory(cat) {
            if (cat === 'all') {
                RequestInterceptor.capturedRequests = [];
            } else {
                RequestInterceptor.capturedRequests = RequestInterceptor.capturedRequests.filter(it => it.category !== cat);
            }
        },
        sortCategory(cat, sortBy, asc) {
            let arr;
            if (cat === 'all') {
                arr = RequestInterceptor.capturedRequests;
            } else {
                arr = this.getRequestsByCategory(cat);
            }
            if (sortBy === 'name') {
                arr.sort((a, b) => asc ? a.filename.localeCompare(b.filename) : b.filename.localeCompare(a.filename));
            } else {
                arr.sort((a, b) => {
                    const sa = parseFloat(a.sizeKB);
                    const sb = parseFloat(b.sizeKB);
                    return asc ? (sa - sb) : (sb - sa);
                });
            }
            if (cat !== 'all') {
                RequestInterceptor.capturedRequests = RequestInterceptor.capturedRequests.filter(it => it.category !== cat);
                RequestInterceptor.capturedRequests.push(...arr);
            }
            this.updateLists();
        },

        updateLists() {
            if (!this.jsonPanel) return;
            if (this.globalSettings.useCategories) {
                if (this.starListEl) {
                    this.starListEl.innerHTML = '';
                    this.getRequestsByCategory('star').forEach(it => {
                        this.starListEl.appendChild(this.createListItem(it));
                    });
                }
                if (this.backendListEl) {
                    this.backendListEl.innerHTML = '';
                    this.getRequestsByCategory('backend').forEach(it => {
                        this.backendListEl.appendChild(this.createListItem(it));
                    });
                }
                if (this.publicListEl) {
                    this.publicListEl.innerHTML = '';
                    this.getRequestsByCategory('public').forEach(it => {
                        this.publicListEl.appendChild(this.createListItem(it));
                    });
                }
                if (this.apiListEl) {
                    this.apiListEl.innerHTML = '';
                    this.getRequestsByCategory('api').forEach(it => {
                        this.apiListEl.appendChild(this.createListItem(it));
                    });
                }
                if (this.otherListEl) {
                    this.otherListEl.innerHTML = '';
                    this.getRequestsByCategory('other').forEach(it => {
                        this.otherListEl.appendChild(this.createListItem(it));
                    });
                }
            } else {
                if (this.singleListEl) {
                    this.singleListEl.innerHTML = '';
                    this.getRequestsByCategory('all').forEach(it => {
                        this.singleListEl.appendChild(this.createListItem(it));
                    });
                }
            }
        },

        createListItem(item) {
            const li = document.createElement('li');
            li.className = 'json-panel-item';

            // 复制
            const btnCopy = document.createElement('span');
            btnCopy.className = 'icon';
            btnCopy.textContent = ICONS.copy;
            btnCopy.title = '复制JSON到剪贴板';
            btnCopy.addEventListener('click', () => {
                this.copyToClipboard(item.content);
                UILogger.logMessage('复制JSON: ' + item.filename);
            });

            // 下载
            const btnDownload = document.createElement('span');
            btnDownload.className = 'icon';
            btnDownload.textContent = ICONS.downloadAll;
            btnDownload.title = '下载此请求的JSON';
            btnDownload.addEventListener('click', () => {
                this.downloadSingle(item);
                UILogger.logMessage('下载JSON: ' + item.filename);
            });

            // 预览
            const btnPreview = document.createElement('span');
            btnPreview.className = 'icon';
            btnPreview.textContent = ICONS.preview;
            btnPreview.title = '预览JSON内容';
            btnPreview.addEventListener('click', () => {
                this.previewItem(item);
                UILogger.logMessage('预览JSON: ' + item.filename);
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
            li.appendChild(fileSpan);
            li.appendChild(urlSpan);
            li.appendChild(sizeSpan);
            return li;
        },

        copyToClipboard(text) {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        },

        downloadSingle(item) {
            if (!item || !item.content) {
                alert('无内容可下载');
                return;
            }
            let fn = item.filename || 'download';
            if (!fn.endsWith('.json')) fn += '.json';
            const blob = new Blob([item.content], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fn;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        downloadAll(arr) {
            if (!arr || !arr.length) {
                alert('此分类暂无JSON可下载');
                return;
            }
            arr.forEach((itm, idx) => {
                setTimeout(() => this.downloadSingle(itm), idx * 250);
            });
        },

        previewItem(item) {
            if (!item || !item.content) {
                alert('无可预览的JSON');
                return;
            }
            const container = document.createElement('div');
            container.className = 'floating-panel json-preview-container';
            // 半透明
            container.style.opacity = PANEL_OPACITY;

            // 标题栏
            const titlebar = document.createElement('div');
            titlebar.className = 'floating-panel-titlebar';

            const dragHandle = document.createElement('div');
            dragHandle.className = 'floating-panel-drag-handle';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'floating-panel-title';
            titleSpan.textContent = 'JSON 预览: ' + item.filename;

            // 滚动到顶部
            const btnScrollTop = createPanelButton({
                text: ICONS.scrollTop,
                title: '滚动到顶部',
                onClick: () => {
                    contentEl.scrollTop = 0;
                }
            });
            // 滚动到底部
            const btnScrollBottom = createPanelButton({
                text: ICONS.scrollBottom,
                title: '滚动到底部',
                onClick: () => {
                    contentEl.scrollTop = contentEl.scrollHeight;
                }
            });

            const btnMin = createPanelButton({text: ICONS.minimize, title: '最小化'});
            const btnClose = createPanelButton({text: ICONS.close, title: '关闭'});

            // 内容
            const contentEl = document.createElement('div');
            contentEl.className = 'floating-panel-content json-preview-content';

            let pretty = item.content;
            try {
                const parsed = JSON.parse(item.content);
                pretty = JSON.stringify(parsed, null, 2);
            } catch (e) {
            }

            const highlighted = this.highlightJson(pretty);

            const metaDiv = document.createElement('div');
            metaDiv.style.marginBottom = '8px';
            metaDiv.style.fontSize = '12px';
            metaDiv.style.color = '#555';
            if (item.status) {
                metaDiv.innerHTML += `<div>HTTP 状态: ${item.status}</div>`;
            }
            if (item.headersObj) {
                metaDiv.innerHTML += `<div>响应头: ${JSON.stringify(item.headersObj)}</div>`;
            }

            const preEl = document.createElement('div');
            preEl.className = 'json-preview';
            preEl.innerHTML = highlighted;

            contentEl.appendChild(metaDiv);
            contentEl.appendChild(preEl);

            titlebar.appendChild(dragHandle);
            titlebar.appendChild(titleSpan);
            titlebar.appendChild(btnScrollTop);
            titlebar.appendChild(btnScrollBottom);
            titlebar.appendChild(btnMin);
            titlebar.appendChild(btnClose);

            container.appendChild(titlebar);
            container.appendChild(contentEl);
            document.body.appendChild(container);

            ZIndexManager.bringToFront(container);

            // 拖拽
            let dragging = false, offsetX = 0, offsetY = 0;
            const onMove = e => {
                if (!dragging) return;
                container.style.left = (e.clientX - offsetX) + 'px';
                container.style.top = (e.clientY - offsetY) + 'px';
            };
            const onUp = () => {
                dragging = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };
            dragHandle.addEventListener('mousedown', e => {
                e.preventDefault();
                ZIndexManager.bringToFront(container);
                const rect = container.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                dragging = true;
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
            container.addEventListener('mousedown', () => {
                ZIndexManager.bringToFront(container);
            });

            // 最小化
            let minimized = false;
            let oldHeight = container.offsetHeight;
            btnMin.addEventListener('click', () => {
                minimized = !minimized;
                if (minimized) {
                    oldHeight = container.style.height;
                    container.classList.add('minimized');
                    container.style.height = '36px';
                    contentEl.style.display = 'none';
                } else {
                    container.classList.remove('minimized');
                    container.style.height = oldHeight;
                    contentEl.style.display = 'block';
                }
            });

            btnClose.addEventListener('click', () => {
                document.body.removeChild(container);
            });
        },

        highlightJson(str) {
            str = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
        },

        saveGlobalSettings() {
            try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.globalSettings));
            } catch (e) {
            }
        },

        refreshJsonPanelTitle() {
            if (!this.jsonPanel) return;
            let t = 'JSON 抓取器';
            if (PoWParser.currentDifficulty) {
                t += ` (PoW难度: ${PoWParser.currentDifficulty})`;
            }
            this.jsonPanel.setTitle(t);
        },

        initSpecialDataPanel() {
            this.specialDataPanel = new FloatingPanel({
                id: 'special-data-panel-container',
                title: '特殊数据解析',
                defaultLeft: INITIAL_SPEC_PANEL.left,
                defaultTop: INITIAL_SPEC_PANEL.top,
                defaultWidth: INITIAL_SPEC_PANEL.width,
                defaultHeight: INITIAL_SPEC_PANEL.height,
                reopenBtnText: '打开“特殊解析”面板',
                reopenBtnTop: '130px',
                onClose: () => UILogger.logMessage('特殊数据解析面板已关闭'),
                onMinimize: () => UILogger.logMessage('特殊数据解析面板已最小化'),
                onRestore: () => UILogger.logMessage('特殊数据解析面板已还原')
            });

            // 清空解析数据
            const btnClear = createPanelButton({
                text: ICONS.trash,
                title: '清空所有解析数据',
                onClick: () => {
                    SpecialDataParser.claudeData.length = 0;
                    SpecialDataParser.chatgptData.length = 0;
                    this.updateSpecialDataPanel();
                    UILogger.logMessage('已清空特殊数据解析');
                }
            });
            this.specialDataPanel.titlebar.insertBefore(btnClear, this.specialDataPanel.btnMinimize);

            // 下载表格CSV
            const btnTable = createPanelButton({
                text: ICONS.table,
                title: '导出当前解析数据为表格CSV',
                onClick: () => this.downloadSpecialDataAsCSV()
            });
            this.specialDataPanel.titlebar.insertBefore(btnTable, this.specialDataPanel.btnMinimize);

            // 内容区
            const wrap = this.specialDataPanel.contentEl;
            wrap.innerHTML = '';

            // Claude区块
            const claudeBlock = document.createElement('div');
            claudeBlock.className = 'special-data-category';

            const claudeHeader = document.createElement('div');
            claudeHeader.className = 'special-data-category-header';

            const claudeTitle = document.createElement('span');
            claudeTitle.className = 'title';
            claudeTitle.textContent = 'Claude Conversations';
            claudeHeader.appendChild(claudeTitle);

            // 批量下载(全部)
            const claudeBatchBtn = createPanelButton({
                text: '⇩全部',
                title: '批量下载全部Claude对话',
                onClick: () => this.batchDownloadClaude() // 不过滤
            });
            claudeHeader.appendChild(claudeBatchBtn);

            // 1天
            const claudeDayBtn = createPanelButton({
                text: ICONS.day,
                title: '下载最近一天的Claude对话',
                onClick: () => this.batchDownloadClaudeWithinDays(1)
            });
            claudeHeader.appendChild(claudeDayBtn);

            // 1周
            const claudeWeekBtn = createPanelButton({
                text: ICONS.week,
                title: '下载最近一周的Claude对话',
                onClick: () => this.batchDownloadClaudeWithinDays(7)
            });
            claudeHeader.appendChild(claudeWeekBtn);

            // 1月
            const claudeMonthBtn = createPanelButton({
                text: ICONS.month,
                title: '下载最近一个月的Claude对话',
                onClick: () => this.batchDownloadClaudeWithinDays(30)
            });
            claudeHeader.appendChild(claudeMonthBtn);

            claudeBlock.appendChild(claudeHeader);

            // 进度条
            const progressWrap = document.createElement('div');
            progressWrap.className = 'claude-progress-wrap';
            progressWrap.style.display = 'none';
            const progressBar = document.createElement('div');
            progressBar.className = 'claude-progress-bar';
            progressWrap.appendChild(progressBar);

            const progressText = document.createElement('div');
            progressText.className = 'claude-progress-text';
            progressText.textContent = '';
            progressWrap.appendChild(progressText);

            claudeBlock.appendChild(progressWrap);

            this.claudeProgressWrap = progressWrap;
            this.claudeProgressBar = progressBar;
            this.claudeProgressText = progressText;

            const claudeUl = document.createElement('ul');
            claudeUl.className = 'special-data-list';
            claudeBlock.appendChild(claudeUl);
            this.claudeListEl = claudeUl;

            // ChatGPT区块
            const chatgptBlock = document.createElement('div');
            chatgptBlock.className = 'special-data-category';

            const chatgptHeader = document.createElement('div');
            chatgptHeader.className = 'special-data-category-header';

            const chatgptTitle = document.createElement('span');
            chatgptTitle.className = 'title';
            chatgptTitle.textContent = 'ChatGPT Conversations';
            chatgptHeader.appendChild(chatgptTitle);

            const chatgptBatchBtn = createPanelButton({
                text: ICONS.downloadAll,
                title: '批量下载全部ChatGPT对话',
                onClick: () => this.batchDownloadChatGPT()
            });
            chatgptHeader.appendChild(chatgptBatchBtn);

            chatgptBlock.appendChild(chatgptHeader);

            const chatgptUl = document.createElement('ul');
            chatgptUl.className = 'special-data-list';
            chatgptBlock.appendChild(chatgptUl);
            this.chatgptListEl = chatgptUl;

            wrap.appendChild(claudeBlock);
            wrap.appendChild(chatgptBlock);

            this.updateSpecialDataPanel();
        },

        updateSpecialDataPanel() {
            // Claude
            if (this.claudeListEl) {
                this.claudeListEl.innerHTML = '';
                SpecialDataParser.claudeData.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'special-data-list-item';

                    // 标题行(大字 + 下载按钮同行右侧)
                    const line1 = document.createElement('div');
                    line1.className = 'special-data-item-line';
                    // 样式
                    line1.style.fontSize = '14px'; // 字号稍大
                    line1.style.marginBottom = '4px';
                    line1.style.display = 'flex';
                    line1.style.justifyContent = 'space-between';
                    line1.style.alignItems = 'center';

                    const leftSpan = document.createElement('span');
                    leftSpan.innerHTML = `<strong style="color:#1f6feb;">name:</strong> <span style="color:#1f6feb;">${item.name || ''}</span>`;

                    line1.appendChild(leftSpan);

                    if (item.convUrl) {
                        const dlIcon = document.createElement('span');
                        dlIcon.textContent = ICONS.downloadAll;
                        dlIcon.style.cursor = 'pointer';
                        dlIcon.title = '下载此对话';
                        dlIcon.addEventListener('click', () => {
                            SpecialDataParser.downloadClaudeConversation(item);
                        });
                        line1.appendChild(dlIcon);
                    }
                    li.appendChild(line1);

                    // uuid(紫色)
                    const line2 = document.createElement('div');
                    line2.className = 'special-data-item-line';
                    line2.innerHTML = `<strong style="color:#c678dd;">uuid:</strong> <span style="color:#c678dd;">${item.uuid || ''}</span>`;

                    // 时间(灰)
                    const line3 = document.createElement('div');
                    line3.className = 'special-data-item-line';
                    line3.innerHTML = `<strong style="color:#999;">updated_at:</strong> <span style="color:#999;">${item.updated_at_shanghai || ''}</span>`;

                    li.appendChild(line2);
                    li.appendChild(line3);

                    this.claudeListEl.appendChild(li);
                });
            }

            // ChatGPT
            if (this.chatgptListEl) {
                this.chatgptListEl.innerHTML = '';
                SpecialDataParser.chatgptData.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'special-data-list-item';

                    // 标题行(大字 + 下载按钮同行右侧)
                    const line1 = document.createElement('div');
                    line1.className = 'special-data-item-line';
                    line1.style.fontSize = '14px';
                    line1.style.marginBottom = '4px';
                    line1.style.display = 'flex';
                    line1.style.justifyContent = 'space-between';
                    line1.style.alignItems = 'center';

                    const leftSpan = document.createElement('span');
                    leftSpan.innerHTML = `<strong style="color:#1f6feb;">title:</strong> <span style="color:#1f6feb;">${item.title || ''}</span>`;
                    line1.appendChild(leftSpan);

                    if (item.convUrl) {
                        const dlIcon = document.createElement('span');
                        dlIcon.textContent = ICONS.downloadAll;
                        dlIcon.style.cursor = 'pointer';
                        dlIcon.title = '下载此对话';
                        dlIcon.addEventListener('click', () => {
                            SpecialDataParser.downloadChatGPTConversation(item.convUrl);
                        });
                        line1.appendChild(dlIcon);
                    }
                    li.appendChild(line1);

                    // id
                    const line2 = document.createElement('div');
                    line2.className = 'special-data-item-line';
                    line2.innerHTML = `<strong style="color:#c678dd;">id:</strong> <span style="color:#c678dd;">${item.id || ''}</span>`;

                    // 时间
                    const line3 = document.createElement('div');
                    line3.className = 'special-data-item-line';
                    line3.innerHTML = `<strong style="color:#999;">update_time:</strong> <span style="color:#999;">${item.update_time_shanghai || ''}</span>`;

                    li.appendChild(line2);
                    li.appendChild(line3);

                    this.chatgptListEl.appendChild(li);
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
            const filename = `special-data-${domain}-${y}${M}${d}-${hh}${mm}${ss}.csv`;

            let lines = ['Type,NameOrTitle,ID,UpdateTime'];
            // Claude
            SpecialDataParser.claudeData.forEach(it => {
                const type = 'Claude';
                const name = (it.name || '').replace(/"/g, '""');
                const id = (it.uuid || '').replace(/"/g, '""');
                const t = (it.updated_at_shanghai || '').replace(/"/g, '""');
                lines.push(`"${type}","${name}","${id}","${t}"`);
            });
            // ChatGPT
            SpecialDataParser.chatgptData.forEach(it => {
                const type = 'ChatGPT';
                const name = (it.title || '').replace(/"/g, '""');
                const id = (it.id || '').replace(/"/g, '""');
                const t = (it.update_time_shanghai || '').replace(/"/g, '""');
                lines.push(`"${type}","${name}","${id}","${t}"`);
            });

            const csvText = lines.join('\r\n');
            const blob = new Blob([csvText], {type: 'text/csv'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            UILogger.logMessage(`特殊数据CSV已下载: ${filename}`);
        },

        batchDownloadClaude() {
            this.batchDownloadClaudeItems(SpecialDataParser.claudeData, '全部');
        },
        batchDownloadClaudeWithinDays(days) {
            const now = new Date();
            const filtered = SpecialDataParser.claudeData.filter(item => {
                if (!item.updated_at_shanghai) return false;
                const dt = new Date(item.updated_at_shanghai);
                if (isNaN(dt.getTime())) return false;
                const diffMs = now - dt;
                const diffDays = diffMs / (1000 * 60 * 60 * 24);
                return diffDays <= days;
            });
            this.batchDownloadClaudeItems(filtered, `最近${days}天`);
        },
        batchDownloadClaudeItems(list, label) {
            if (!list || !list.length) {
                alert(`没有可下载的 Claude 对话（${label}）`);
                UILogger.logMessage(`Claude批量下载【${label}】无数据`);
                return;
            }
            UILogger.logMessage(`开始批量下载 Claude 对话（${label}），共${list.length}个。`);

            this.showClaudeProgressBar(true);
            this.updateClaudeProgress(0, list.length, label);

            let successCount = 0;
            let finishedCount = 0;
            list.forEach((item, idx) => {
                setTimeout(async () => {
                    await SpecialDataParser.downloadClaudeConversation(item);
                    finishedCount++;
                    successCount++;

                    this.updateClaudeProgress(finishedCount, list.length, label);

                    if (finishedCount === list.length) {
                        this.showClaudeProgressBar(false);
                        UILogger.logMessage(`Claude批量下载【${label}】完成：成功${successCount}/${list.length}`);
                    }
                }, idx * 350);
            });
        },
        showClaudeProgressBar(show) {
            if (!this.claudeProgressWrap) return;
            this.claudeProgressWrap.style.display = show ? 'block' : 'none';
            if (!show) {
                this.claudeProgressBar.style.width = '0%';
                this.claudeProgressText.textContent = '';
            }
        },
        updateClaudeProgress(current, total, label) {
            if (!this.claudeProgressBar || !this.claudeProgressText) return;
            const pct = Math.floor(current / total * 100);
            this.claudeProgressBar.style.width = pct + '%';
            this.claudeProgressText.textContent = `${label}：${current} / ${total}`;
        },

        batchDownloadChatGPT() {
            if (!SpecialDataParser.chatgptData || !SpecialDataParser.chatgptData.length) {
                alert('无ChatGPT对话可下载');
                return;
            }
            let count = 0;
            SpecialDataParser.chatgptData.forEach((item, idx) => {
                if (item.convUrl) {
                    setTimeout(() => {
                        SpecialDataParser.downloadChatGPTConversation(item.convUrl);
                    }, idx * 300);
                    count++;
                }
            });
            UILogger.logMessage('开始批量下载 ' + count + ' 个ChatGPT对话');
        }
    };

    /************************************************************************
     * 辅助函数
     ************************************************************************/
    function createPanelButton({text = '', title = '', onClick = null}) {
        const btn = document.createElement('button');
        btn.className = 'floating-panel-btn';
        btn.textContent = text;
        if (title) btn.title = title;
        if (onClick) {
            btn.addEventListener('click', onClick);
        }
        return btn;
    }


    /************************************************************************
     * 脚本入口
     ************************************************************************/
    function findStarUuid() {
        let m = /\/c\/([0-9a-fA-F-]+)/.exec(location.href);
        if (!m) {
            m = /\/chat\/([0-9a-fA-F-]+)/.exec(location.href);
        }
        if (m) {
            RequestInterceptor.starUuid = m[1];
        }
    }

    function onBodyReady() {
        findStarUuid();
        UILogger.init();      // 日志面板
        UIManager.init();     // JSON面板 & 特殊数据解析面板
        RequestInterceptor.init(); // XHR & Fetch抓取
        UILogger.logMessage('脚本已启动 - 面板已生成。');
    }

    function waitForBody() {
        if (document.body) {
            onBodyReady();
        } else {
            requestAnimationFrame(waitForBody);
        }
    }

    waitForBody();


    /************************************************************************
     * 样式 - 保持单文件，不引用外部资源
     ************************************************************************/
    const cssText = `
    /* 浮动窗体：4) 所有半透明 (在JS中也赋值了 .style.opacity ) */
    .floating-panel {
      position: fixed;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.25);
      font-family: sans-serif;
      color: #333;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      resize: both;
    }
    .floating-panel.minimized {
      overflow: hidden;
      resize: none;
      height: 36px !important;
    }
    .floating-panel-titlebar {
      flex-shrink: 0;
      background: #ddd;
      height: 36px;
      display: flex;
      align-items: center;
      border-bottom: 1px solid #bbb;
      padding: 0 4px;
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
      user-select: text;
    }
    .floating-panel-drag-handle {
      width: 14px;
      height: 14px;
      margin: 0 4px;
      background-color: #666;
      border-radius: 50%;
      cursor: move;
    }
    .floating-panel-title {
      flex: 1;
      font-weight: bold;
      user-select: text;
    }
    .floating-panel-btn {
      cursor: pointer;
      border: none;
      background: transparent;
      font-size: 14px;
      margin: 0 1px;
      padding: 0 3px;
      user-select: none;
    }
    .floating-panel-content {
      flex: 1;
      background: #fafafa;
      overflow: auto;
    }
    .floating-reopen-btn {
      display: none;
      position: fixed;
      left: 10px;
      border: none;
      background: #eee;
      border-radius: 4px;
      padding: 6px 12px;
      cursor: pointer;
      font-size: 14px;
      z-index: 999999999;
    }

    /* 日志面板(3)字体更小更紧凑, 见JS中也设置了fontSize=11px, lineHeight=1.2 */
    #log-panel-container {
    }

    #log-panel-list {
      list-style: none;
      margin: 0;
      padding: 0;
      font-family: monospace;
      white-space: pre;
    }

    /* JSON面板 */
    #json-panel-container {
    }

    .json-panel-search-wrap {
      margin: 8px;
      display: flex;
      align-items: center;
    }
    .json-panel-search-wrap label {
      margin-right: 4px;
    }
    .json-panel-search-input {
      flex: 1;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 4px 6px;
      font-size: 13px;
    }
    .json-panel-category {
      margin: 8px;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: #fff;
      padding-bottom: 4px;
    }
    .json-panel-category-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px;
      background: #eee;
      border-bottom: 1px solid #ddd;
      border-top-left-radius: 6px;
      border-top-right-radius: 6px;
    }
    .json-panel-category-header .title {
      font-weight: bold;
      margin-right: 8px;
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
      border-bottom: 1px solid #eee;
      font-size: 13px;
    }
    .json-panel-item:hover {
      background: #f0f0f0;
    }
    .json-panel-item .icon {
      cursor: pointer;
      margin-right: 6px;
      font-size: 16px;
    }
    .filename-span {
      margin-right: 6px;
      color: #444;
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

    /* JSON预览 */
    .json-preview-container {
      width: 600px;
      height: 400px;
      top: 100px;
      left: 100px;
      position: fixed;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.25);
      display: flex;
      flex-direction: column;
      resize: both;
      overflow: hidden;
    }
    .json-preview-content {
      background: #f6f8fa;
      padding: 8px;
      overflow: auto;
      flex:1;
    }
    .json-preview {
      font-size: 12px;
      font-family: monospace;
      white-space: pre;
      line-height: 1.4em;
      color: #333;
    }
    .json-preview .string  { color: #ce9178; }
    .json-preview .number  { color: #b5cea8; }
    .json-preview .boolean { color: #569cd6; }
    .json-preview .null    { color: #569cd6; }
    .json-preview .key     { color: #9cdcfe; }

    /* 特殊数据面板 */
    #special-data-panel-container {
    }
    .special-data-category {
      margin: 8px;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: #fff;
      padding-bottom: 4px;
    }
    .special-data-category-header {
      display: flex;
      align-items: center;
      padding: 4px 8px;
      background: #eee;
      border-bottom: 1px solid #ddd;
      border-top-left-radius: 6px;
      border-top-right-radius: 6px;
    }
    .special-data-category-header .title {
      font-weight: bold;
      margin-right: 6px;
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
      border-bottom: 1px solid #eee;
      font-size: 12px;
    }
    .special-data-list-item:hover {
      background: #f0f0f0;
    }
    .special-data-item-line {
      margin: 2px 0;
    }

    /* 第5点: 标题行字号稍大, 下载按钮同行右侧(见JS) */

    /* Claude 进度条 */
    .claude-progress-wrap {
      margin: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
      height: 28px;
      position: relative;
      background: #f8f8f8;
      overflow: hidden;
    }
    .claude-progress-bar {
      position: absolute;
      left: 0;
      top: 0;
      width: 0%;
      height: 100%;
      background: #4caf50; /* 绿色进度 */
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
      font-size: 12px;
      color: #333;
      pointer-events: none;
    }
    `;
    const styleEl = document.createElement('style');
    styleEl.textContent = cssText;
    document.head.appendChild(styleEl);

})();
