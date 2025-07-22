/**
 * 主应用程序
 */
class ETHGridBacktestApp {
    constructor() {
        this.engine = new BacktestEngine();
        this.currentResults = null;
        
        this.initializeUI();
        this.bindEvents();
    }

    /**
     * 初始化用户界面
     */
    initializeUI() {
        // 初始化滑块显示（只有杠杆倍数使用滑块）
        this.updateSliderDisplay('leverage', 'leverageValue', 'x');
        
        // 设置默认值
        document.getElementById('initialCapital').value = 1000000;
        document.getElementById('lowerBound').value = -10;
        document.getElementById('upperBound').value = 10;
        document.getElementById('gridCount').value = 25;
        document.getElementById('gridType').value = 'arithmetic';
        document.getElementById('leverage').value = 2;
        document.getElementById('feeRate').value = 0.02;
        document.getElementById('timeframe').value = '1h';
        document.getElementById('backtestPeriod').value = 'recent30';
        
        // 初始化网格预览
        this.updateGridPreview();
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 杠杆滑块事件
        document.getElementById('leverage').addEventListener('input', (e) => {
            this.updateSliderDisplay('leverage', 'leverageValue', 'x');
            this.updateGridPreview();
        });

        // 开始回测按钮
        document.getElementById('startBacktest').addEventListener('click', () => {
            this.startBacktest();
        });

        // 表单验证和网格预览更新
        document.getElementById('initialCapital').addEventListener('input', () => {
            this.validateInputs();
            this.updateGridPreview();
        });
        document.getElementById('lowerBound').addEventListener('input', () => {
            this.validateInputs();
            this.updateGridPreview();
        });
        document.getElementById('upperBound').addEventListener('input', () => {
            this.validateInputs();
            this.updateGridPreview();
        });
        document.getElementById('gridCount').addEventListener('input', () => {
            this.validateInputs();
            this.updateGridPreview();
        });
        document.getElementById('gridType').addEventListener('change', () => {
            this.updateGridPreview();
        });
        document.getElementById('backtestPeriod').addEventListener('change', () => {
            this.validateTimeRange();
        });
        document.getElementById('feeRate').addEventListener('input', () => {
            this.validateInputs();
            this.updateGridPreview();
        });
    }

    /**
     * 更新滑块显示值
     * @param {string} sliderId - 滑块ID
     * @param {string} displayId - 显示元素ID
     * @param {string} suffix - 后缀
     */
    updateSliderDisplay(sliderId, displayId, suffix = '') {
        const slider = document.getElementById(sliderId);
        const display = document.getElementById(displayId);
        if (slider && display) {
            display.textContent = slider.value + suffix;
        }
    }

    /**
     * 验证输入参数
     */
    validateInputs() {
        const lowerBound = parseFloat(document.getElementById('lowerBound').value);
        const upperBound = parseFloat(document.getElementById('upperBound').value);
        const initialCapital = parseFloat(document.getElementById('initialCapital').value);

        let isValid = true;
        let errors = [];

        // 验证价格区间
        if (lowerBound >= upperBound) {
            errors.push('下边界必须小于上边界');
            isValid = false;
        }

        if (Math.abs(upperBound - lowerBound) < 2) {
            errors.push('价格区间不能小于2%');
            isValid = false;
        }

        // 验证资金
        if (initialCapital < 10000) {
            errors.push('初始资金不能少于10,000 USDT');
            isValid = false;
        }

        // 验证网格数量
        const gridCount = parseInt(document.getElementById('gridCount').value);
        if (gridCount < 10 || gridCount > 500 || isNaN(gridCount)) {
            errors.push('网格数量必须在10-500之间');
            isValid = false;
        }

        // 验证手续费率
        const feeRate = parseFloat(document.getElementById('feeRate').value);
        if (feeRate < 0 || feeRate > 1 || isNaN(feeRate)) {
            errors.push('交易手续费率必须在0-1%之间');
            isValid = false;
        }

        // 验证杠杆倍数 - 重要的风险控制
        const leverage = parseFloat(document.getElementById('leverage').value);
        if (leverage < 1 || leverage > 20 || isNaN(leverage)) {
            errors.push('杠杆倍数必须在1-20倍之间');
            isValid = false;
        }

        // 显示错误
        this.showValidationErrors(errors);
        
        // 更新按钮状态
        document.getElementById('startBacktest').disabled = !isValid;

        return isValid;
    }

    /**
     * 显示验证错误
     * @param {Array} errors - 错误信息数组
     */
    showValidationErrors(errors) {
        // 清除之前的错误显示
        const existingError = document.querySelector('.validation-errors');
        if (existingError) {
            existingError.remove();
        }

        if (errors.length > 0) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'validation-errors';
            errorDiv.style.cssText = 'color: #dc3545; font-size: 14px; margin-top: 10px;';
            errorDiv.innerHTML = errors.map(error => `• ${error}`).join('<br>');
            
            document.querySelector('.config-panel').appendChild(errorDiv);
        }
    }

    /**
     * 开始回测
     */
    async startBacktest() {
        if (!this.validateInputs()) {
            return;
        }

        // 收集配置参数
        const config = this.collectConfig();
        
        // 显示加载状态
        this.showLoading();
        
        // 禁用开始按钮
        document.getElementById('startBacktest').disabled = true;

        try {
            console.log('开始回测，配置:', config);
            
            // 执行回测
            this.currentResults = await this.engine.runBacktest(config);
            
            console.log('回测完成，结果:', this.currentResults);
            
            // 显示结果
            this.displayResults(this.currentResults);
            
        } catch (error) {
            console.error('回测失败:', error);
            this.showError(error.message);
        } finally {
            // 隐藏加载状态
            this.hideLoading();
            
            // 重新启用按钮
            document.getElementById('startBacktest').disabled = false;
        }
    }

    /**
     * 收集配置参数
     * @returns {Object} 配置对象
     */
    collectConfig() {
        return {
            initialCapital: parseFloat(document.getElementById('initialCapital').value),
            lowerBound: parseFloat(document.getElementById('lowerBound').value),
            upperBound: parseFloat(document.getElementById('upperBound').value),
            gridCount: parseInt(document.getElementById('gridCount').value),
            gridType: document.getElementById('gridType').value,
            leverage: parseFloat(document.getElementById('leverage').value),
            timeframe: document.getElementById('timeframe').value,
            backtestPeriod: document.getElementById('backtestPeriod').value,
            feeRate: parseFloat(document.getElementById('feeRate').value) / 100 // 转换为小数
        };
    }

    /**
     * 显示加载状态
     */
    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('metricsCards').style.display = 'none';
        document.getElementById('suggestionsPanel').style.display = 'none';
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    /**
     * 显示回测结果
     * @param {Object} results - 回测结果
     */
    displayResults(results) {
        console.log('=== displayResults 开始 ===');
        console.log('接收到的results:', results);
        console.log('results.metrics:', results.metrics);
        console.log('results.profitBreakdown:', results.profitBreakdown);
        
        
        // 显示利润分解
        this.displayProfitBreakdown(results.profitBreakdown);
        
        // 显示关键指标
        this.displayMetrics(results.metrics);
        
        // 图表已移除
        
        // 显示优化建议
        this.displaySuggestions(results.analysis);
        
        // 显示所有结果面板
        document.getElementById('profitBreakdown').style.display = 'block';
        document.getElementById('metricsCards').style.display = 'grid';
        document.getElementById('suggestionsPanel').style.display = 'block';
    }

    /**
     * 显示关键指标
     * @param {Object} metrics - 策略指标
     */
    displayMetrics(metrics) {
        const formatters = {
            totalReturn: (value) => this.formatPercent(value),
            annualizedReturn: (value) => this.formatPercent(value),
            totalTrades: (value) => value.toString(),
            maxDrawdown: (value) => this.formatPercent(value),
            sharpeRatio: (value) => value.toFixed(2)
        };

        const colorClasses = {
            totalReturn: (value) => value > 0 ? 'positive' : (value < 0 ? 'negative' : 'neutral'),
            annualizedReturn: (value) => value > 0 ? 'positive' : (value < 0 ? 'negative' : 'neutral'),
            maxDrawdown: (value) => value < 0.1 ? 'positive' : (value > 0.2 ? 'negative' : 'neutral'),
            sharpeRatio: (value) => value > 1 ? 'positive' : (value < 0.5 ? 'negative' : 'neutral')
        };

        Object.keys(formatters).forEach(key => {
            const element = document.getElementById(key);
            if (element && metrics[key] !== undefined) {
                const value = metrics[key];
                
                // 调试输出 - 检查每个指标的原始值
                console.log(`指标 ${key}: 原始值=${value}, 格式化值=${formatters[key](value)}`);
                
                element.textContent = formatters[key](value);
                
                // 添加颜色类
                element.className = 'metric-value';
                if (colorClasses[key]) {
                    const colorClass = colorClasses[key](value);
                    console.log(`指标 ${key}: 颜色类=${colorClass} (基于值=${value})`);
                    element.classList.add(colorClass);
                }
            }
        });
    }

    // 图表功能已移除

    /**
     * 显示优化建议
     * @param {Object} analysis - 分析结果
     */
    displaySuggestions(analysis) {
        const suggestionsContainer = document.getElementById('suggestions');
        if (!suggestionsContainer || !analysis) return;

        let html = '';

        // 策略总结
        if (analysis.summary) {
            html += this.generateSummaryHTML(analysis.summary);
        }

        // 数据来源信息
        if (analysis && this.currentResults && this.currentResults.dataInfo) {
            const dataInfo = this.currentResults.dataInfo;
            html += '<h4>📊 数据来源验证</h4>';
            html += `
                <div class="suggestion-item" style="border-left-color: #28a745;">
                    <strong>✅ 数据来源确认</strong>
                    <p><strong>数据源：</strong>${dataInfo.dataSource}</p>
                    <p><strong>API端点：</strong>${dataInfo.dataIntegrity.apiEndpoint}</p>
                    <p><strong>时间范围：</strong>${dataInfo.startDate} 至 ${dataInfo.endDate}</p>
                    <p><strong>数据点数：</strong>${dataInfo.totalPoints} 条真实K线数据</p>
                    <p><strong>价格区间：</strong>$${dataInfo.priceRange.start.toFixed(2)} - $${dataInfo.priceRange.end.toFixed(2)}</p>
                    <p><strong>手续费率：</strong>0.008% (已计入成本)</p>
                    <p><strong>获取时间：</strong>${new Date(dataInfo.dataIntegrity.requestTime).toLocaleString()}</p>
                </div>
            `;
        }

        // 优化建议
        if (analysis.suggestions && analysis.suggestions.length > 0) {
            html += '<h4>🎯 优化建议</h4>';
            analysis.suggestions.forEach(suggestion => {
                const priorityColor = suggestion.priority === 'high' ? '#dc3545' : 
                                    suggestion.priority === 'medium' ? '#ffc107' : '#28a745';
                html += `
                    <div class="suggestion-item" style="border-left-color: ${priorityColor};">
                        <strong>${suggestion.title}</strong>
                        <p>${suggestion.content}</p>
                    </div>
                `;
            });
        }

        // 参数优化建议
        if (analysis.optimization) {
            html += '<h4>⚙️ 参数优化建议</h4>';
            Object.keys(analysis.optimization).forEach(param => {
                const opt = analysis.optimization[param];
                if (opt.current !== opt.recommended) {
                    html += `
                        <div class="suggestion-item">
                            <strong>${this.getParamDisplayName(param)}</strong>
                            <p>当前: ${this.formatParamValue(param, opt.current)} → 建议: ${this.formatParamValue(param, opt.recommended)}</p>
                            <p><em>${opt.reason}</em></p>
                        </div>
                    `;
                }
            });
        }

        // 风险提示
        if (analysis.riskAssessment) {
            html += this.generateRiskAssessmentHTML(analysis.riskAssessment);
        }

        suggestionsContainer.innerHTML = html || '<p>当前参数配置较为合理，继续保持。</p>';
    }

    /**
     * 生成策略总结HTML
     * @param {Object} summary - 策略总结
     * @returns {string} HTML字符串
     */
    generateSummaryHTML(summary) {
        const performanceText = {
            excellent: '优秀',
            good: '良好', 
            fair: '一般',
            poor: '较差',
            loss: '亏损'
        };

        const riskText = {
            low: '低风险',
            medium: '中等风险',
            high: '高风险',
            very_high: '极高风险'
        };

        return `
            <h4>📊 策略表现总结</h4>
            <div class="suggestion-item">
                <p><strong>表现等级:</strong> ${performanceText[summary.performance] || summary.performance}</p>
                <p><strong>风险等级:</strong> ${riskText[summary.riskLevel] || summary.riskLevel}</p>
                <p><strong>市场适应性:</strong> ${this.formatSuitability(summary.suitability)}</p>
                <p><strong>交易频率:</strong> ${this.formatTradingFrequency(summary.tradingFrequency)}</p>
            </div>
        `;
    }

    /**
     * 生成风险评估HTML
     * @param {Object} riskAssessment - 风险评估
     * @returns {string} HTML字符串
     */
    generateRiskAssessmentHTML(riskAssessment) {
        let html = '<h4>⚠️ 风险控制建议</h4>';
        
        if (riskAssessment.recommendations) {
            riskAssessment.recommendations.forEach(rec => {
                html += `
                    <div class="suggestion-item">
                        <p>${rec}</p>
                    </div>
                `;
            });
        }

        return html;
    }

    /**
     * 获取参数显示名称
     * @param {string} param - 参数名
     * @returns {string} 显示名称
     */
    getParamDisplayName(param) {
        const names = {
            gridCount: '网格数量',
            priceRange: '价格区间',
            leverage: '杠杆倍数',
            gridType: '网格类型'
        };
        return names[param] || param;
    }

    /**
     * 格式化参数值
     * @param {string} param - 参数名
     * @param {any} value - 参数值
     * @returns {string} 格式化后的值
     */
    formatParamValue(param, value) {
        switch (param) {
            case 'gridCount':
                return value + '个';
            case 'leverage':
                return value + 'x';
            case 'priceRange':
                return `${value.lower}% ~ ${value.upper}%`;
            case 'gridType':
                return value === 'arithmetic' ? '等差网格' : '等比网格';
            default:
                return value.toString();
        }
    }

    /**
     * 格式化百分比
     * @param {number} value - 数值
     * @returns {string} 格式化后的百分比
     */
    formatPercent(value) {
        return (value * 100).toFixed(2) + '%';
    }

    /**
     * 格式化适用性
     * @param {string} suitability - 适用性
     * @returns {string} 格式化后的适用性
     */
    formatSuitability(suitability) {
        const suitabilityText = {
            highly_suitable: '非常适合',
            suitable: '适合',
            moderately_suitable: '较为适合',
            not_suitable: '不适合'
        };
        return suitabilityText[suitability] || suitability;
    }

    /**
     * 格式化交易频率
     * @param {string} frequency - 交易频率
     * @returns {string} 格式化后的交易频率
     */
    formatTradingFrequency(frequency) {
        const frequencyText = {
            high: '高频交易',
            medium: '中频交易',
            low: '低频交易'
        };
        return frequencyText[frequency] || frequency;
    }

    /**
     * 显示错误信息
     * @param {string} message - 错误消息
     */
    showError(message) {
        // 清除现有结果
        document.getElementById('profitBreakdown').style.display = 'none';
        document.getElementById('metricsCards').style.display = 'none';
        document.getElementById('suggestionsPanel').style.display = 'none';
        
        // 显示错误信息
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid #f5c6cb;
        `;
        errorDiv.innerHTML = `
            <h4>回测执行失败</h4>
            <p>${message}</p>
            <p><small>请检查网络连接或稍后重试</small></p>
        `;
        
        // 插入到结果面板开头
        const resultsPanel = document.querySelector('.results-panel');
        const firstChild = resultsPanel.querySelector('h2').nextSibling;
        resultsPanel.insertBefore(errorDiv, firstChild);
        
        // 5秒后自动移除错误信息
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    /**
     * 导出结果为JSON
     */
    exportResults() {
        if (!this.currentResults) {
            alert('没有可导出的结果');
            return;
        }

        const dataStr = JSON.stringify(this.currentResults, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `eth-grid-backtest-${Date.now()}.json`;
        link.click();
    }

    /**
     * 重置应用状态
     */
    reset() {
        // 清除结果
        this.currentResults = null;
        this.engine.clearResults();
        
        // 隐藏结果面板
        document.getElementById('profitBreakdown').style.display = 'none';
        document.getElementById('metricsCards').style.display = 'none';
        document.getElementById('suggestionsPanel').style.display = 'none';
        
        // 重置表单
        this.initializeUI();
        
        // 清除错误信息
        const errors = document.querySelectorAll('.validation-errors, .error-message');
        errors.forEach(error => error.remove());
        
        console.log('应用状态已重置');
    }

    /**
     * 显示利润分解
     * @param {Object} profitBreakdown - 利润分解数据
     */
    displayProfitBreakdown(profitBreakdown) {
        if (!profitBreakdown) return;

        // 网格交易利润
        const gridProfitElement = document.getElementById('gridTradingProfit');
        const gridProfitPctElement = document.getElementById('gridTradingProfitPct');
        
        gridProfitElement.textContent = this.formatCurrency(profitBreakdown.gridTradingProfit);
        gridProfitPctElement.textContent = profitBreakdown.gridTradingProfitPct.toFixed(2) + '%';
        
        // 设置颜色
        gridProfitElement.className = 'profit-amount ' + 
            (profitBreakdown.gridTradingProfit > 0 ? 'positive' : 
             profitBreakdown.gridTradingProfit < 0 ? 'negative' : '');

        // 持仓浮盈浮亏
        const holdingProfitElement = document.getElementById('holdingProfit');
        const holdingProfitPctElement = document.getElementById('holdingProfitPct');
        
        holdingProfitElement.textContent = this.formatCurrency(profitBreakdown.holdingProfit);
        holdingProfitPctElement.textContent = profitBreakdown.holdingProfitPct.toFixed(2) + '%';
        
        // 设置颜色
        holdingProfitElement.className = 'profit-amount ' + 
            (profitBreakdown.holdingProfit > 0 ? 'positive' : 
             profitBreakdown.holdingProfit < 0 ? 'negative' : '');

        // 总利润
        const totalProfitElement = document.getElementById('totalProfitAmount');
        const totalProfitPctElement = document.getElementById('totalProfitPct');
        
        totalProfitElement.textContent = this.formatCurrency(profitBreakdown.totalProfit);
        totalProfitPctElement.textContent = profitBreakdown.totalProfitPct.toFixed(2) + '%';
        
        // 设置颜色
        totalProfitElement.className = 'profit-amount ' + 
            (profitBreakdown.totalProfit > 0 ? 'positive' : 
             profitBreakdown.totalProfit < 0 ? 'negative' : '');

        // 验证数据一致性
        if (this.currentResults && this.currentResults.metrics) {
            const metrics = this.currentResults.metrics;
            console.log('=== 数据一致性验证 ===');
            console.log('完整的metrics对象:', metrics);
            console.log('metrics.totalProfit:', metrics.totalProfit);
            console.log('profitBreakdown.totalProfit:', profitBreakdown.totalProfit);
            console.log('metrics.totalReturn:', metrics.totalReturn);
            console.log('profitBreakdown.totalProfitPct/100:', profitBreakdown.totalProfitPct / 100);
            console.log('metrics.finalValue:', metrics.finalValue);
            console.log('metrics.initialValue:', metrics.initialValue);
            console.log('profitBreakdown.breakdown:', profitBreakdown.breakdown);
            
            // 检查不一致
            const profitDiff = Math.abs(metrics.totalProfit - profitBreakdown.totalProfit);
            const returnDiff = Math.abs(metrics.totalReturn - profitBreakdown.totalProfitPct / 100);
            
            if (profitDiff > 1) {
                console.warn('⚠️ 总利润数据不一致!', {
                    metrics: metrics.totalProfit,
                    breakdown: profitBreakdown.totalProfit,
                    difference: profitDiff
                });
            }
            
            if (returnDiff > 0.001) {
                console.warn('⚠️ 收益率数据不一致!', {
                    metrics: metrics.totalReturn,
                    breakdown: profitBreakdown.totalProfitPct / 100,
                    difference: returnDiff
                });
            }
        }
        
        console.log('利润分解数据:', profitBreakdown);
    }


    /**
     * 格式化货币显示
     * @param {number} amount - 金额
     * @returns {string} 格式化后的货币字符串
     */
    formatCurrency(amount) {
        const absAmount = Math.abs(amount);
        const sign = amount < 0 ? '-' : amount > 0 ? '+' : '';
        
        if (absAmount >= 1000000) {
            return sign + '$' + (absAmount / 1000000).toFixed(2) + 'M';
        } else if (absAmount >= 1000) {
            return sign + '$' + (absAmount / 1000).toFixed(1) + 'K';
        } else {
            return sign + '$' + absAmount.toFixed(2);
        }
    }

    /**
     * 验证时间范围选择
     */
    validateTimeRange() {
        const backtestPeriod = document.getElementById('backtestPeriod').value;
        const now = new Date();
        
        if (backtestPeriod.match(/^\d{4}-\d{2}$/)) {
            const [year, month] = backtestPeriod.split('-').map(Number);
            const selectedDate = new Date(year, month - 1, 1);
            
            // 检查是否为未来月份
            if (selectedDate.getFullYear() > now.getFullYear() || 
                (selectedDate.getFullYear() === now.getFullYear() && selectedDate.getMonth() > now.getMonth())) {
                
                this.showValidationErrors(['所选月份尚未到来，请选择已完成的月份']);
                document.getElementById('startBacktest').disabled = true;
                return false;
            }
            
            // 检查是否为2025年之前（币安数据可用性）
            if (year < 2025) {
                this.showValidationErrors(['暂不支持2025年之前的数据回测']);
                document.getElementById('startBacktest').disabled = true;
                return false;
            }
        }
        
        // 如果时间范围有效，重新验证所有输入
        return this.validateInputs();
    }

    /**
     * 更新网格配置预览
     */
    updateGridPreview() {
        try {
            const initialCapital = parseFloat(document.getElementById('initialCapital').value) || 1000000;
            const lowerBound = parseFloat(document.getElementById('lowerBound').value) || -10;
            const upperBound = parseFloat(document.getElementById('upperBound').value) || 10;
            const gridCount = parseInt(document.getElementById('gridCount').value) || 25;
            const gridType = document.getElementById('gridType').value || 'arithmetic';
            const leverage = parseFloat(document.getElementById('leverage').value) || 2;
            const feeRate = (parseFloat(document.getElementById('feeRate').value) || 0.02) / 100; // 转换为小数

            // 验证输入是否有效
            if (isNaN(initialCapital) || isNaN(lowerBound) || isNaN(upperBound) || 
                isNaN(gridCount) || isNaN(leverage) || 
                lowerBound >= upperBound || gridCount < 10 || gridCount > 500) {
                document.getElementById('gridPreview').style.display = 'none';
                return;
            }

            // 假设ETH当前价格为3000 USDT（用于计算展示）
            const assumedETHPrice = 3000;
            const lowerPrice = assumedETHPrice * (1 + lowerBound / 100);
            const upperPrice = assumedETHPrice * (1 + upperBound / 100);

            // 计算网格间距
            let gridSpacing;
            if (gridType === 'arithmetic') {
                gridSpacing = (upperPrice - lowerPrice) / (gridCount - 1);
            } else {
                const ratio = Math.pow(upperPrice / lowerPrice, 1 / (gridCount - 1));
                gridSpacing = lowerPrice * (ratio - 1); // 第一个间距
            }

            // 计算单笔投资金额
            const investmentPerGrid = (initialCapital / gridCount) * leverage;

            // 计算单格利润（假设买在当前价格，卖在上一个网格价格）
            const avgPrice = (lowerPrice + upperPrice) / 2;
            let profitPerGrid;
            
            if (gridType === 'arithmetic') {
                // 等差网格：利润 = 网格间距 * 数量 - 手续费
                const quantity = investmentPerGrid / avgPrice;
                const sellPrice = avgPrice + gridSpacing;
                const grossProfit = quantity * gridSpacing;
                const buyFee = investmentPerGrid * feeRate;
                const sellFee = (quantity * sellPrice) * feeRate;
                profitPerGrid = grossProfit - buyFee - sellFee;
            } else {
                // 等比网格：按比例计算利润
                const ratio = Math.pow(upperPrice / lowerPrice, 1 / (gridCount - 1));
                const quantity = investmentPerGrid / avgPrice;
                const sellPrice = avgPrice * ratio;
                const grossProfit = quantity * (sellPrice - avgPrice);
                const buyFee = investmentPerGrid * feeRate;
                const sellFee = (quantity * sellPrice) * feeRate;
                profitPerGrid = grossProfit - buyFee - sellFee;
            }

            // 计算单次手续费（买入+卖出）
            const feePerTrade = (investmentPerGrid * feeRate) + (investmentPerGrid * (1 + (profitPerGrid / investmentPerGrid)) * feeRate);
            
            // 净利润率（扣除手续费后）
            const netProfitRate = (profitPerGrid / investmentPerGrid) * 100;

            // 更新显示
            document.getElementById('investmentPerGrid').textContent = 
                '$' + investmentPerGrid.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            
            document.getElementById('profitPerGrid').textContent = 
                '$' + profitPerGrid.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) +
                ' (' + netProfitRate.toFixed(3) + '%)';
            
            document.getElementById('gridSpacing').textContent = 
                '$' + gridSpacing.toFixed(2) + ' (' + ((gridSpacing / avgPrice) * 100).toFixed(3) + '%)';

            document.getElementById('feePerTrade').textContent = 
                '$' + feePerTrade.toFixed(2) + ' (' + (feeRate * 100).toFixed(3) + '% × 2)';

            document.getElementById('netProfitRate').textContent = 
                netProfitRate.toFixed(3) + '% (已扣除手续费)';

            // 显示预览面板
            document.getElementById('gridPreview').style.display = 'block';

        } catch (error) {
            console.error('更新网格预览失败:', error);
            document.getElementById('gridPreview').style.display = 'none';
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ETHGridBacktestApp();
    console.log('ETH网格交易策略回测系统已启动');
});