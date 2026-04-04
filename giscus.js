/**
 * Giscus 评论系统通用模块（开源）
 * @version 1.0.0
 * @author zym2013
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' 
        ? module.exports = factory() 
        : typeof define === 'function' && define.amd 
            ? define(factory) 
            : (global.Giscus = factory());
}(this, (function () {
    'use strict';

    // ============ 默认配置 ============
    const DEFAULT_CONFIG = {
        repo: 'Snow-Domain-Smart-Fox/Smart-Blog',
        repoId: 'R_kgDORZ9cTQ',
        category: 'General',
        categoryId: 'DIC_kwDORZ9cTc4C6AND',
        mapping: 'pathname',
        strict: '0',
        reactionsEnabled: '1',
        emitMetadata: '0',
        inputPosition: 'top',
        theme: 'preferred_color_scheme',
        lang: 'zh-CN',
        loading: 'lazy'
    };

    // ============ 内部状态 ============
    let _initialized = false;
    let _container = null;
    let _config = { ...DEFAULT_CONFIG };
    let _iframe = null;

    // ============ 工具函数 ============
    function $(selector, ctx = document) {
        return ctx.querySelector(selector);
    }

    function getTheme() {
        // 优先读取 data-theme 属性
        const attr = document.documentElement.getAttribute('data-theme');
        if (attr === 'dark') return 'noborder_dark';
        if (attr === 'light') return 'noborder_light';
        // auto 模式：跟随系统
        return window.matchMedia('(prefers-color-scheme: dark)').matches 
            ? 'noborder_dark' 
            : 'noborder_light';
    }

    function buildScriptUrl(config, pageUrl, pageTitle) {
        const params = new URLSearchParams({
            'repo': config.repo,
            'repo-id': config.repoId,
            'category': config.category,
            'category-id': config.categoryId,
            'mapping': config.mapping,
            'strict': config.strict,
            'reactions-enabled': config.reactionsEnabled,
            'emit-metadata': config.emitMetadata,
            'input-position': config.inputPosition,
            'theme': config.theme === 'preferred_color_scheme' ? getTheme() : config.theme,
            'lang': config.lang,
            'loading': config.loading
        });

        // mapping='specific' 时附加页面信息
        if (config.mapping === 'specific' && pageUrl) {
            params.append('page-url', pageUrl);
            params.append('page-title', pageTitle || document.title);
        }

        return `https://giscus.app/client.js?${params.toString()}`;
    }

    function injectScript(src, container) {
        // 移除旧的 script
        const old = container.querySelector('script[src*="giscus.app"]');
        if (old) old.remove();

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.crossOrigin = 'anonymous';
        container.appendChild(script);
        return script;
    }

    function showLoading(container) {
        container.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;color:var(--text-sub, #64748b)">
                <div style="width:24px;height:24px;border:2px solid var(--border-color, #e2e8f0);border-top-color:var(--primary-color, #6366f1);border-radius:50%;animation:spin 1s linear infinite;margin-bottom:1rem"></div>
                <span>评论加载中...</span>
            </div>
            <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
        `;
    }

    // ============ 公共 API ============
    const Giscus = {
        /**
         * 初始化评论组件
         * @param {Object} options - 配置选项
         * @param {string} [options.container='#giscus-thread'] - 容器选择器
         * @param {Object} [options.config] - 覆盖默认配置
         * @param {string} [options.pageUrl] - 页面URL（mapping='specific' 时需要）
         * @param {string} [options.pageTitle] - 页面标题（mapping='specific' 时需要）
         */
        init(options = {}) {
            if (_initialized) return;

            const {
                container = '#giscus-thread',
                config = {},
                pageUrl = null,
                pageTitle = null
            } = options;

            // 合并配置
            _config = { ...DEFAULT_CONFIG, ...config };
            _container = typeof container === 'string' ? $(container) : container;
            
            if (!_container) {
                console.warn('[Giscus] Container not found:', container);
                return;
            }

            // 显示加载状态
            showLoading(_container);

            // 构建并注入 script
            const src = buildScriptUrl(_config, pageUrl, pageTitle);
            injectScript(src, _container);

            // 监听 iframe 加载完成
            const observer = new MutationObserver(() => {
                _iframe = _container.querySelector('iframe');
                if (_iframe) {
                    _initialized = true;
                    observer.disconnect();
                }
            });
            observer.observe(_container, { childList: true, subtree: true });

            // 绑定主题监听
            this.bindThemeSync();
        },

        /**
         * 手动同步主题（主题切换时调用）
         */
        syncTheme() {
            if (!_iframe || !_iframe.contentWindow) return;
            
            const theme = _config.theme === 'preferred_color_scheme' ? getTheme() : _config.theme;
            _iframe.contentWindow.postMessage({
                giscus: { setConfig: { theme } }
            }, 'https://giscus.app');
        },

        /**
         * 重新加载评论（切换页面/路由时调用）
         * @param {Object} options - 同 init()
         */
        reload(options = {}) {
            _initialized = false;
            _iframe = null;
            this.init(options);
        },

        /**
         * 绑定主题切换事件（自动调用，无需手动执行）
         */
        bindThemeSync() {
            // 监听自定义主题切换事件
            document.addEventListener('themeChanged', () => {
                setTimeout(() => this.syncTheme(), 200);
            });

            // 监听特定按钮点击（适配你的主题切换逻辑）
            const themeToggle = document.getElementById('themeToggle');
            if (themeToggle) {
                themeToggle.addEventListener('click', () => {
                    setTimeout(() => this.syncTheme(), 300);
                });
            }

            // 监听系统主题变化（auto 模式）
            if (window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                    if (_config.theme === 'preferred_color_scheme') {
                        this.syncTheme();
                    }
                });
            }
        },

        /**
         * 获取当前配置（只读）
         */
        getConfig() {
            return { ..._config };
        },

        /**
         * 更新配置（需配合 reload 使用）
         * @param {Object} newConfig - 新配置项
         */
        updateConfig(newConfig) {
            _config = { ..._config, ...newConfig };
        }
    };

    // ============ 自动初始化（可选） ============
    // 如果页面存在 #giscus-thread 容器，且未手动调用 init()，则自动初始化
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            const autoContainer = $('#giscus-thread');
            if (autoContainer && !_initialized) {
                // 尝试从 data 属性读取自定义配置
                const dataConfig = {};
                Object.keys(DEFAULT_CONFIG).forEach(key => {
                    const dataKey = `data-giscus-${key.toLowerCase()}`;
                    if (autoContainer.dataset[key] || autoContainer.dataset[dataKey]) {
                        dataConfig[key] = autoContainer.dataset[key] || autoContainer.dataset[dataKey];
                    }
                });

                Giscus.init({
                    config: dataConfig,
                    pageUrl: autoContainer.dataset.pageUrl || window.location.href.split('#')[0],
                    pageTitle: autoContainer.dataset.pageTitle || document.title
                });
            }
        });
    }

    return Giscus;
})));
