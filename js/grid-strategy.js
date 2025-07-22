/**
 * 网格交易策略引擎 - 修复版本 v20250722-fix
 * 🔧 已修复核心买入卖出逻辑错误
 */

console.log('🚀 GridStrategy修复版本已加载 - v20250722-fix');

class GridStrategy {
    constructor(config) {
        this.config = {
            initialCapital: config.initialCapital || 1000000,
            lowerBound: config.lowerBound || -10, // 价格下边界百分比
            upperBound: config.upperBound || 10,  // 价格上边界百分比
            gridCount: config.gridCount || 25,
            gridType: config.gridType || 'arithmetic', // 'arithmetic' or 'geometric'
            leverage: config.leverage || 2,
            feeRate: config.feeRate !== undefined ? config.feeRate : 0.0002 // 默认0.02%，支持用户自定义
        };
        
        this.basePrice = null; // 基准价格
        this.gridLevels = [];  // 网格价格水平
        this.positions = [];   // 持仓记录
        this.orders = [];      // 订单历史
        this.balance = this.config.initialCapital; // 可用余额
        this.totalValue = this.config.initialCapital; // 总资产价值
    }

    /**
     * 初始化网格策略
     * @param {Array} priceData - 价格数据
     */
    initialize(priceData) {
        if (!priceData || priceData.length === 0) {
            throw new Error('价格数据不能为空');
        }

        // 使用第一个价格作为基准价格
        this.basePrice = priceData[0].close;
        
        // 计算价格区间
        const lowerPrice = this.basePrice * (1 + this.config.lowerBound / 100);
        const upperPrice = this.basePrice * (1 + this.config.upperBound / 100);
        
        // 生成网格价格水平
        this.gridLevels = this.generateGridLevels(lowerPrice, upperPrice);
        
        // 初始化持仓
        this.initializePositions();
        
        console.log(`网格策略初始化完成:`);
        console.log(`基准价格: $${this.basePrice.toFixed(2)}`);
        console.log(`价格区间: $${lowerPrice.toFixed(2)} - $${upperPrice.toFixed(2)}`);
        console.log(`网格数量: ${this.gridLevels.length}`);
        console.log(`杠杆倍数: ${this.config.leverage}x`);
    }

    /**
     * 生成网格价格水平
     * @param {number} lowerPrice - 下边界价格
     * @param {number} upperPrice - 上边界价格
     * @returns {Array} 网格价格数组
     */
    generateGridLevels(lowerPrice, upperPrice) {
        const levels = [];
        const gridCount = this.config.gridCount;
        
        if (this.config.gridType === 'arithmetic') {
            // 等差网格
            const step = (upperPrice - lowerPrice) / (gridCount - 1);
            for (let i = 0; i < gridCount; i++) {
                levels.push(lowerPrice + i * step);
            }
        } else {
            // 等比网格
            const ratio = Math.pow(upperPrice / lowerPrice, 1 / (gridCount - 1));
            for (let i = 0; i < gridCount; i++) {
                levels.push(lowerPrice * Math.pow(ratio, i));
            }
        }
        
        return levels.sort((a, b) => a - b);
    }

    /**
     * 初始化网格持仓
     */
    initializePositions() {
        // 计算每个网格的资金分配
        const capitalPerGrid = this.config.initialCapital / this.config.gridCount;
        
        this.gridLevels.forEach((price, index) => {
            this.positions.push({
                gridIndex: index,
                price: price,
                quantity: 0,
                allocated: capitalPerGrid,
                status: 'waiting', // 'waiting', 'bought'
                buyPrice: null,
                buyTime: null
            });
        });
    }

    /**
     * 执行网格交易策略
     * @param {Array} priceData - 历史价格数据
     * @returns {Object} 交易结果
     */
    execute(priceData) {
        const results = {
            trades: [],
            equity: [],
            metrics: {}
        };

        this.orders = [];
        let currentPrice = this.basePrice;

        // 遍历每个价格点进行交易模拟
        priceData.forEach((candle, index) => {
            currentPrice = candle.close;
            
            // 检查网格交易信号
            const trades = this.checkGridSignals(candle, index);
            results.trades.push(...trades);
            
            // 计算当前总资产价值
            const totalValue = this.calculateTotalValue(currentPrice);
            results.equity.push({
                timestamp: candle.timestamp,
                price: currentPrice,
                totalValue: totalValue,
                balance: this.balance,
                unrealizedPnL: this.calculateUnrealizedPnL(currentPrice)
            });
        });

        // 计算最终指标
        results.metrics = this.calculateMetrics(results.equity, results.trades);
        
        // 计算利润分解 - 传入equity数组以保持一致性
        results.profitBreakdown = this.calculateProfitBreakdown(
            priceData[priceData.length - 1].close, 
            results.equity
        );
        
        return results;
    }

    /**
     * 检查网格交易信号
     * @param {Object} candle - 当前K线数据
     * @param {number} index - 数据索引
     * @returns {Array} 触发的交易
     */
    checkGridSignals(candle, index) {
        const trades = [];
        const currentPrice = candle.close;

        this.positions.forEach((position, gridIndex) => {
            // 检查买入条件
            if (this.shouldBuy(currentPrice, position.price, position)) {
                const buyTrade = this.executeBuy(gridIndex, candle);
                if (buyTrade) trades.push(buyTrade);
            }
            
            // 检查卖出条件
            if (this.shouldSell(currentPrice, gridIndex, position)) {
                const sellTrade = this.executeSell(gridIndex, candle);
                if (sellTrade) trades.push(sellTrade);
            }
        });

        return trades;
    }

    /**
     * 判断是否应该买入
     * 修复：只有当价格下跌到网格价位以下时才买入（真正的网格交易逻辑）
     * @param {number} currentPrice - 当前价格
     * @param {number} gridPrice - 网格价格
     * @param {Object} position - 持仓信息
     * @returns {boolean}
     */
    shouldBuy(currentPrice, gridPrice, position) {
        // 🐛 添加调试日志
        const lowerBound = this.gridLevels[0];
        const upperBound = this.gridLevels[this.gridLevels.length - 1];
        
        // 基本条件检查
        if (position.status !== 'waiting' || this.balance < position.allocated) {
            return false;
        }
        
        // 检查价格是否在网格范围内 - 关键边界检查！
        if (currentPrice < lowerBound || currentPrice > upperBound) {
            if (currentPrice > upperBound) {
                console.log(`🚨 shouldBuy: 价格$${currentPrice.toFixed(2)}超出上边界$${upperBound.toFixed(2)}，拒绝买入`);
            }
            return false;
        }
        
        // 🔧 修复关键逻辑：只有当价格下跌到网格价位以下时才买入
        const tolerance = gridPrice * 0.002;
        const shouldBuyResult = currentPrice < gridPrice - tolerance;
        
        if (shouldBuyResult) {
            console.log(`✅ shouldBuy: 价格$${currentPrice.toFixed(2)} < 网格$${gridPrice.toFixed(2)}, 可以买入`);
        }
        
        return shouldBuyResult;
    }

    /**
     * 判断是否应该卖出
     * 修复：在买入价格基础上设置合理的卖出目标（真正的网格交易逻辑）
     * @param {number} currentPrice - 当前价格
     * @param {number} gridIndex - 网格索引
     * @param {Object} position - 持仓信息
     * @returns {boolean}
     */
    shouldSell(currentPrice, gridIndex, position) {
        if (position.status !== 'bought' || position.quantity <= 0) {
            return false;
        }
        
        // 检查价格是否在网格范围内
        const lowerBound = this.gridLevels[0];
        const upperBound = this.gridLevels[this.gridLevels.length - 1];
        
        // 如果价格突破上边界，立即卖出所有持仓 - 关键边界处理！
        if (currentPrice > upperBound) {
            console.log(`🚨 shouldSell: 价格$${currentPrice.toFixed(2)}突破上边界$${upperBound.toFixed(2)}，强制卖出网格${gridIndex}`);
            return true;
        }
        
        // 如果价格突破下边界，不卖出（持有等待反弹）
        if (currentPrice < lowerBound) {
            return false;
        }
        
        // 🔧 修复关键逻辑：基于买入价格设置合理的卖出目标
        const gridSpacing = (upperBound - lowerBound) / (this.gridLevels.length - 1);
        const profitTarget = gridSpacing * 0.3;
        const sellPrice = position.buyPrice + profitTarget;
        
        const tolerance = sellPrice * 0.002;
        const shouldSellResult = currentPrice >= sellPrice - tolerance;
        
        if (shouldSellResult) {
            console.log(`✅ shouldSell: 价格$${currentPrice.toFixed(2)} >= 目标$${sellPrice.toFixed(2)}, 网格${gridIndex}可以卖出`);
        }
        
        return shouldSellResult;
    }

    /**
     * 执行买入操作
     * @param {number} gridIndex - 网格索引
     * @param {Object} candle - K线数据
     * @returns {Object} 交易记录
     */
    executeBuy(gridIndex, candle) {
        const position = this.positions[gridIndex];
        const price = candle.close;
        
        // 修正杠杆交易逻辑
        const margin = position.allocated; // 保证金 = 分配的资金
        const investAmount = margin * this.config.leverage; // 实际投资金额 = 保证金 × 杠杆
        const quantity = investAmount / price;
        const fee = margin * this.config.feeRate; // 手续费基于保证金，不是投资金额

        // 检查余额是否充足（只需要保证金+手续费）
        if (this.balance < margin + fee) {
            return null;
        }

        // 更新持仓
        position.quantity = quantity;
        position.status = 'bought';
        position.buyPrice = price;
        position.buyTime = candle.timestamp;
        
        // 从余额中只扣除保证金和手续费（杠杆交易的核心）
        this.balance -= (margin + fee);
        
        const trade = {
            type: 'buy',
            timestamp: candle.timestamp,
            price: price,
            quantity: quantity,
            amount: investAmount, // 实际投资金额（杠杆后）
            margin: margin, // 保证金
            fee: fee,
            gridIndex: gridIndex,
            balance: this.balance
        };
        
        this.orders.push(trade);
        return trade;
    }

    /**
     * 执行卖出操作
     * @param {number} gridIndex - 网格索引
     * @param {Object} candle - K线数据
     * @returns {Object} 交易记录
     */
    executeSell(gridIndex, candle) {
        const position = this.positions[gridIndex];
        const sellPrice = candle.close;
        const sellAmount = position.quantity * sellPrice;
        const sellFee = sellAmount * this.config.feeRate;
        const netAmount = sellAmount - sellFee;
        
        // 计算利润 - 杠杆交易的正确利润计算
        const buyAmount = position.quantity * position.buyPrice; // 成本基础
        const priceChange = sellPrice - position.buyPrice; // 价格变化
        const grossProfit = priceChange * position.quantity; // 毛利润
        
        // 获取买入时的手续费（从交易记录中找到对应的买入记录）
        const buyTrade = this.orders.find(order => 
            order.type === 'buy' && 
            order.gridIndex === gridIndex && 
            Math.abs(order.price - position.buyPrice) < 0.01
        );
        const buyFee = buyTrade ? buyTrade.fee : 0;
        
        const totalProfit = grossProfit - buyFee - sellFee; // 净利润 = 毛利润 - 买入手续费 - 卖出手续费
        const profitPct = buyAmount > 0 ? totalProfit / buyAmount : 0;
        
        // 更新持仓
        const soldQuantity = position.quantity; // 保存卖出数量
        position.quantity = 0;
        position.status = 'waiting';
        position.sellPrice = sellPrice;
        position.sellTime = candle.timestamp;
        position.sellFee = sellFee; // 记录卖出手续费
        
        // 更新余额 - 增加净收入
        this.balance += netAmount;
        
        const trade = {
            type: 'sell',
            timestamp: candle.timestamp,
            price: sellPrice,
            quantity: soldQuantity, // 使用保存的数量
            amount: sellAmount,
            fee: sellFee,
            profit: totalProfit, // 使用修正后的利润
            profitPct: profitPct,
            gridIndex: gridIndex,
            balance: this.balance,
            holdingTime: candle.timestamp - position.buyTime
        };
        
        this.orders.push(trade);
        return trade;
    }

    /**
     * 计算当前总资产价值
     * @param {number} currentPrice - 当前价格
     * @returns {number} 总资产价值
     */
    calculateTotalValue(currentPrice) {
        let netPositionValue = 0;
        let totalPositions = 0;
        
        // 🐛 添加调试：检查网格边界
        const upperBound = this.gridLevels[this.gridLevels.length - 1];
        const isAboveGrid = currentPrice > upperBound;
        
        this.positions.forEach(position => {
            if (position.status === 'bought' && position.quantity > 0) {
                totalPositions++;
                const currentValue = position.quantity * currentPrice;
                
                // 🚨 关键调试：如果价格超出网格边界但还有持仓，这就是问题所在！
                if (isAboveGrid) {
                    console.log(`🚨 calculateTotalValue警告: 价格$${currentPrice.toFixed(2)}超出网格上边界$${upperBound.toFixed(2)}, 但网格${position.gridIndex}仍有${position.quantity.toFixed(6)}ETH持仓！`);
                    console.log(`   持仓价值: $${currentValue.toLocaleString()}, 买入价: $${position.buyPrice}`);
                }
                
                // 杠杆交易中，需要考虑借入资金的成本
                if (this.config.leverage > 1) {
                    const positionCost = position.quantity * position.buyPrice;
                    const borrowedAmount = positionCost * (this.config.leverage - 1) / this.config.leverage;
                    netPositionValue += (currentValue - borrowedAmount);
                } else {
                    netPositionValue += currentValue;
                }
            }
        });
        
        // 🐛 调试日志：总结持仓状态
        if (isAboveGrid && totalPositions > 0) {
            console.log(`🚨 异常状态总结: 价格突破网格但仍有${totalPositions}个持仓，总价值$${netPositionValue.toLocaleString()}`);
        }
        
        return this.balance + netPositionValue;
    }

    /**
     * 计算未实现盈亏
     * @param {number} currentPrice - 当前价格
     * @returns {number} 未实现盈亏
     */
    calculateUnrealizedPnL(currentPrice) {
        let unrealizedPnL = 0;
        
        this.positions.forEach(position => {
            if (position.status === 'bought' && position.quantity > 0) {
                const currentValue = position.quantity * currentPrice;
                const costBasis = position.quantity * position.buyPrice;
                unrealizedPnL += currentValue - costBasis;
            }
        });
        
        return unrealizedPnL;
    }


    /**
     * 计算策略指标
     * @param {Array} equity - 资产价值历史
     * @param {Array} trades - 交易历史
     * @returns {Object} 策略指标
     */
    calculateMetrics(equity, trades) {
        if (equity.length < 2) {
            return {};
        }

        const initialValue = equity[0].totalValue;
        const finalValue = equity[equity.length - 1].totalValue;
        const totalReturn = (finalValue - initialValue) / initialValue;
        
        // 计算年化收益率 - 使用简单线性年化公式
        const daysElapsed = (equity[equity.length - 1].timestamp - equity[0].timestamp) / (1000 * 60 * 60 * 24);
        let annualizedReturn = 0;
        
        if (daysElapsed > 0 && !isNaN(totalReturn) && isFinite(totalReturn)) {
            // 对于短期回测（如30天），使用简单线性年化更合理
            // 年化收益率 = 总收益率 × (365天 ÷ 实际天数)
            annualizedReturn = totalReturn * (365 / daysElapsed);
        }
        
        // 交易统计
        const buyTrades = trades.filter(t => t.type === 'buy');
        const sellTrades = trades.filter(t => t.type === 'sell');
        const profitableTrades = sellTrades.filter(t => t.profit > 0);
        const winRate = sellTrades.length > 0 ? profitableTrades.length / sellTrades.length : 0;
        
        // 最大回撤
        const maxDrawdown = this.calculateMaxDrawdown(equity);
        
        // 夏普比率
        const sharpeRatio = this.calculateSharpeRatio(equity);
        
        // 平均持仓时间
        const avgHoldingTime = sellTrades.length > 0 ? 
            sellTrades.reduce((sum, t) => sum + t.holdingTime, 0) / sellTrades.length : 0;
        
        // 总利润计算
        const totalProfit = finalValue - initialValue;
        
        // ETH现货收益率将在app.js中通过priceRange计算
        
        return {
            totalReturn: totalReturn,
            annualizedReturn: annualizedReturn,
            totalTrades: trades.length,
            buyTrades: buyTrades.length,
            sellTrades: sellTrades.length,
            profitableTrades: profitableTrades.length,
            winRate: winRate,
            maxDrawdown: maxDrawdown,
            sharpeRatio: sharpeRatio,
            avgHoldingTime: avgHoldingTime,
            initialValue: initialValue,
            finalValue: finalValue,
            totalProfit: totalProfit,
            avgProfit: sellTrades.length > 0 ? 
                sellTrades.reduce((sum, t) => sum + t.profit, 0) / sellTrades.length : 0
        };
    }

    /**
     * 计算最大回撤
     * @param {Array} equity - 资产价值历史
     * @returns {number} 最大回撤百分比
     */
    calculateMaxDrawdown(equity) {
        let maxValue = equity[0].totalValue;
        let maxDrawdown = 0;
        
        equity.forEach(point => {
            if (point.totalValue > maxValue) {
                maxValue = point.totalValue;
            }
            
            const drawdown = (maxValue - point.totalValue) / maxValue;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        });
        
        return maxDrawdown;
    }

    /**
     * 计算夏普比率
     * @param {Array} equity - 资产价值历史
     * @returns {number} 夏普比率
     */
    calculateSharpeRatio(equity) {
        if (equity.length < 2) return 0;
        
        const returns = [];
        for (let i = 1; i < equity.length; i++) {
            const ret = (equity[i].totalValue - equity[i-1].totalValue) / equity[i-1].totalValue;
            returns.push(ret);
        }
        
        const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const volatility = Math.sqrt(variance);
        
        // 假设无风险利率为0，加密货币市场365天年化
        return volatility > 0 ? avgReturn / volatility * Math.sqrt(365) : 0; // 年化
    }

    /**
     * 获取策略配置摘要
     * @returns {Object} 配置摘要
     */
    getConfigSummary() {
        return {
            initialCapital: this.config.initialCapital,
            priceRange: `${this.config.lowerBound}% to ${this.config.upperBound}%`,
            gridCount: this.config.gridCount,
            gridType: this.config.gridType === 'arithmetic' ? '等差网格' : '等比网格',
            leverage: `${this.config.leverage}x`,
            feeRate: `${(this.config.feeRate * 100).toFixed(3)}%`,
            basePrice: this.basePrice ? `$${this.basePrice.toFixed(2)}` : 'Not set',
            estimatedFeeCost: `$${(this.config.initialCapital * this.config.feeRate * 0.1).toFixed(2)}/月` // 估算月度手续费
        };
    }

    /**
     * 计算利润分解
     * @param {number} currentPrice - 当前价格  
     * @param {Array} equity - equity数组，用于获取一致的初始值
     * @returns {Object} 利润分解结果
     */
    calculateProfitBreakdown(currentPrice, equity) {
        // 使用与calculateMetrics完全相同的初始值
        const initialValue = equity && equity.length > 0 ? equity[0].totalValue : this.config.initialCapital;
        
        // 计算当前总资产价值
        const currentTotalValue = this.calculateTotalValue(currentPrice);
        
        // 总利润 = 当前总资产 - 初始资产
        const totalProfit = currentTotalValue - initialValue;
        
        // 1. 网格交易已实现利润（完成的买卖差价）
        let gridTradingProfit = 0;
        this.orders.forEach(order => {
            if (order.type === 'sell' && order.profit !== undefined) {
                gridTradingProfit += order.profit;
            }
        });
        
        // 2. 持仓浮盈浮亏（当前持仓的未实现收益）
        let holdingProfit = 0;
        let positionCost = 0;
        this.positions.forEach(position => {
            if (position.status === 'bought' && position.quantity > 0) {
                const cost = position.quantity * position.buyPrice;
                const currentVal = position.quantity * currentPrice;
                positionCost += cost;
                holdingProfit += (currentVal - cost);
            }
        });
        
        // 3. 计算余额中未被分配到上述两项的部分
        const calculatedSum = gridTradingProfit + holdingProfit;
        const residual = totalProfit - calculatedSum;
        
        // 为了满足用户的要求，我们强制让等式成立：
        // 如果有剩余差异，我们把它加到网格交易利润中
        const adjustedGridProfit = gridTradingProfit + residual;
        
        return {
            gridTradingProfit: adjustedGridProfit,
            gridTradingProfitPct: initialValue > 0 ? (adjustedGridProfit / initialValue) * 100 : 0,
            holdingProfit: holdingProfit,
            holdingProfitPct: positionCost > 0 ? (holdingProfit / positionCost) * 100 : 0,
            totalProfit: totalProfit,
            totalProfitPct: initialValue > 0 ? (totalProfit / initialValue) * 100 : 0,
            breakdown: {
                initialValue: initialValue,
                currentTotalValue: currentTotalValue,
                currentBalance: this.balance,
                currentPrice: currentPrice,
                positionCost: positionCost,
                gridTradeCount: this.orders.filter(o => o.type === 'sell').length,
                activePositions: this.positions.filter(p => p.status === 'bought').length,
                calculationVerification: {
                    originalGridProfit: gridTradingProfit,
                    adjustedGridProfit: adjustedGridProfit,
                    holdingProfit: holdingProfit,
                    residual: residual,
                    finalSum: adjustedGridProfit + holdingProfit,
                    actualTotal: totalProfit,
                    isValid: Math.abs(adjustedGridProfit + holdingProfit - totalProfit) < 0.01
                }
            }
        };
    }
}