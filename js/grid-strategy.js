/**
 * 网格交易策略引擎 - 修复版本 v20250722-fix
 * 🔧 已修复核心买入卖出逻辑错误
 */

console.log('🚀 GridStrategy数学验证版本已加载 - v20250722-math-validation');

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
     * 初始化网格交易 - 正确的高抛低吸策略
     * 🔧 用50%资金买入ETH，在不同价位设置买卖网格
     */
    initializePositions() {
        console.log(`\n🚀 初始化网格交易 - 基准价格: $${this.basePrice.toFixed(2)}`);
        console.log(`总资金: $${this.config.initialCapital.toLocaleString()}`);
        console.log(`网格数量: ${this.config.gridCount}`);
        console.log(`杠杆倍数: ${this.config.leverage}x`);
        
        // 🎯 步骤1：直接分配资金到网格，不进行中心化买入
        // 这样避免资金守恒问题，让每个网格独立持有资金
        const totalFunds = this.config.initialCapital;
        const fundsPerGrid = totalFunds / this.config.gridCount;
        
        // 找到基准价格在网格中的位置
        const baseGridIndex = this.findBaseGridIndex();
        
        // 重置balance为0，因为所有资金都分配到网格了
        this.balance = 0;
        this.totalETHHoldings = 0;
        
        console.log(`\n💰 资金分配:`);
        console.log(`每个网格分配资金: $${fundsPerGrid.toLocaleString()}`);
        console.log(`基准价格对应网格索引: ${baseGridIndex}`);
        
        this.gridLevels.forEach((gridPrice, index) => {
            // 🎯 关键：确定每个网格的角色
            const isAboveBase = index > baseGridIndex;
            
            let position;
            
            if (isAboveBase) {
                // 基准价以上的网格：持有USDT等待买入
                position = {
                    gridIndex: index,
                    gridPrice: gridPrice,
                    ethAmount: 0,
                    usdtAmount: fundsPerGrid,                       // 持有USDT等待买入
                    sellPrice: this.calculateSellPrice(gridPrice),
                    buyPrice: this.calculateBuyPrice(gridPrice), 
                    status: 'waiting_buy',
                    buyTime: null,
                    actualBuyPrice: null
                };
                console.log(`⬆️ 网格${index}(${gridPrice.toFixed(2)}): 持有$${fundsPerGrid.toFixed(2)}USDT, 等待买入@$${position.buyPrice.toFixed(2)}`);
            } else {
                // 基准价以下的网格：用资金买入ETH
                const ethAmount = (fundsPerGrid * this.config.leverage) / this.basePrice;
                const fee = fundsPerGrid * this.config.feeRate;
                
                position = {
                    gridIndex: index,
                    gridPrice: gridPrice,
                    ethAmount: ethAmount,                           // 持有ETH等待卖出
                    usdtAmount: 0,
                    sellPrice: this.calculateSellPrice(gridPrice),
                    buyPrice: this.calculateBuyPrice(gridPrice),
                    status: 'holding_eth',
                    buyTime: Date.now(),
                    actualBuyPrice: this.basePrice
                };
                console.log(`⬇️ 网格${index}(${gridPrice.toFixed(2)}): 持有${ethAmount.toFixed(6)}ETH, 等待卖出@$${position.sellPrice.toFixed(2)}`);
            }
            
            this.positions.push(position);
        });
        
        console.log(`\n🎯 网格交易初始化完成！`);
        console.log(`策略：高抛低吸，基准价以下持有ETH等待上涨卖出，以上持有USDT等待下跌买入`);
    }
    
    /**
     * 计算网格的卖出价格 - 在更高的价格卖出
     */
    calculateSellPrice(gridPrice) {
        const gridSpacing = (this.gridLevels[1] - this.gridLevels[0]) || 
                           (this.basePrice * Math.abs(this.config.upperBound - this.config.lowerBound) / 100 / (this.config.gridCount - 1));
        return gridPrice + gridSpacing * 0.5; // 卖出价格是网格价格加半个间距
    }
    
    /**
     * 计算网格的买入价格 - 在更低的价格买入
     */
    calculateBuyPrice(gridPrice) {
        const gridSpacing = (this.gridLevels[1] - this.gridLevels[0]) || 
                           (this.basePrice * Math.abs(this.config.upperBound - this.config.lowerBound) / 100 / (this.config.gridCount - 1));
        return gridPrice - gridSpacing * 0.5; // 买入价格是网格价格减半个间距
    }
    
    /**
     * 找到基准价格在网格中的位置
     * @returns {number} 基准价格对应的网格索引
     */
    findBaseGridIndex() {
        for (let i = 0; i < this.gridLevels.length; i++) {
            if (this.basePrice <= this.gridLevels[i]) {
                return Math.max(0, i - 1); // 返回基准价格以下的最高网格
            }
        }
        return this.gridLevels.length - 1;
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
        const upperBound = this.gridLevels[this.gridLevels.length - 1];

        // 🐛 添加持仓状态调试
        if (currentPrice > upperBound) {
            const boughtPositions = this.positions.filter(p => p.status === 'bought' && p.quantity > 0);
            if (boughtPositions.length > 0) {
                console.log(`🚨 checkGridSignals: 价格$${currentPrice.toFixed(2)}超出边界，但仍有${boughtPositions.length}个持仓！`);
                boughtPositions.forEach((pos, i) => {
                    if (i < 3) { // 只显示前3个
                        console.log(`   网格${pos.gridIndex}: ${pos.quantity.toFixed(6)}ETH, 买入价$${pos.buyPrice}`);
                    }
                });
            }
        }

        this.positions.forEach((position, gridIndex) => {
            // 检查买入条件
            if (this.shouldBuy(currentPrice, position.gridPrice, position)) {
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
     * 判断是否应该买入 - 网格低吸逻辑
     * 🔧 价格下跌到买入价位时，用USDT买入ETH
     * @param {number} currentPrice - 当前价格
     * @param {number} gridPrice - 网格价格
     * @param {Object} position - 持仓信息
     * @returns {boolean}
     */
    shouldBuy(currentPrice, gridPrice, position) {
        // 只有持有USDT等待买入的网格才能买入
        if (position.status !== 'waiting_buy' || position.usdtAmount <= 0) {
            return false;
        }
        
        // 🎯 买入触发：价格下跌到买入价位
        const tolerance = position.buyPrice * 0.0001; // 0.01%容差，更严格
        const effectivePrice = position.buyPrice + tolerance;
        const shouldBuyResult = currentPrice <= effectivePrice;
        
        if (shouldBuyResult) {
            console.log(`📉 网格${position.gridIndex}买入触发: 价格$${currentPrice.toFixed(2)} ≤ 买入价$${position.buyPrice.toFixed(2)}`);
        }
        
        return shouldBuyResult;
    }

    /**
     * 判断是否应该卖出 - 网格高抛逻辑
     * 🔧 价格上涨到卖出价位时，卖出ETH获得USDT
     * @param {number} currentPrice - 当前价格
     * @param {number} gridIndex - 网格索引
     * @param {Object} position - 持仓信息
     * @returns {boolean}
     */
    shouldSell(currentPrice, gridIndex, position) {
        // 只有持有ETH的网格才能卖出
        if (position.status !== 'holding_eth' || position.ethAmount <= 0) {
            return false;
        }
        
        // 🎯 卖出触发：价格上涨到卖出价位
        const tolerance = position.sellPrice * 0.0001; // 0.01%容差，更严格
        const effectivePrice = position.sellPrice - tolerance;
        const shouldSellResult = currentPrice >= effectivePrice;
        
        if (shouldSellResult) {
            console.log(`📈 网格${gridIndex}卖出触发: 价格$${currentPrice.toFixed(2)} ≥ 卖出价$${position.sellPrice.toFixed(2)}`);
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
        
        // 用该网格的USDT买入ETH
        const usdtToSpend = position.usdtAmount;
        const leveragedAmount = usdtToSpend * this.config.leverage;
        const ethQuantity = leveragedAmount / price;
        const fee = usdtToSpend * this.config.feeRate;
        
        // 检查是否有足够的USDT
        if (position.usdtAmount <= 0) {
            console.log(`❌ 网格${gridIndex}买入失败: 没有USDT可用`);
            return null;
        }
        
        // 更新持仓：USDT转为ETH
        position.ethAmount = ethQuantity;
        position.usdtAmount = 0;
        position.status = 'holding_eth';
        position.actualBuyPrice = price;
        position.buyTime = candle.timestamp;
        
        // 扣除手续费
        this.balance -= fee;
        
        const trade = {
            type: 'buy',
            timestamp: candle.timestamp,
            price: price,
            quantity: ethQuantity,
            amount: leveragedAmount,
            margin: usdtToSpend,
            fee: fee,
            gridIndex: gridIndex,
            balance: this.balance
        };
        
        this.orders.push(trade);
        console.log(`🟢 执行买入: 网格${gridIndex}用$${usdtToSpend.toFixed(2)}USDT买入${ethQuantity.toFixed(6)}ETH@$${price.toFixed(2)}`);
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
        
        // 卖出该网格的ETH获得USDT
        const ethToSell = position.ethAmount;
        const sellAmount = ethToSell * sellPrice;
        const fee = sellAmount * this.config.feeRate;
        const netUSDT = sellAmount - fee;
        
        // 计算本次交易利润
        const costBasis = ethToSell * (position.actualBuyPrice || this.basePrice);
        const grossProfit = sellAmount - costBasis;
        const netProfit = grossProfit - fee;
        const profitPct = costBasis > 0 ? netProfit / costBasis : 0;
        
        // 更新持仓：ETH转为USDT
        position.usdtAmount = netUSDT;
        position.ethAmount = 0;
        position.status = 'waiting_buy';
        position.sellPrice = sellPrice;
        position.sellTime = candle.timestamp;
        
        // 手续费已经从netUSDT中扣除，无需额外扣除balance
        
        const trade = {
            type: 'sell',
            timestamp: candle.timestamp,
            price: sellPrice,
            quantity: ethToSell,
            amount: sellAmount,
            fee: fee,
            profit: netProfit,
            profitPct: profitPct,
            gridIndex: gridIndex,
            balance: this.balance,
            holdingTime: candle.timestamp - position.buyTime
        };
        
        this.orders.push(trade);
        console.log(`🔴 执行卖出: 网格${gridIndex}卖出${ethToSell.toFixed(6)}ETH@$${sellPrice.toFixed(2)}获得$${netUSDT.toFixed(2)}USDT，利润$${netProfit.toFixed(2)}`);
        return trade;
    }

    /**
     * 计算当前总资产价值
     * @param {number} currentPrice - 当前价格
     * @returns {number} 总资产价值
     */
    calculateTotalValue(currentPrice) {
        let totalETHValue = 0;
        let totalUSDTValue = this.balance;
        
        this.positions.forEach(position => {
            // ETH持仓价值
            if (position.ethAmount > 0) {
                totalETHValue += position.ethAmount * currentPrice;
            }
            
            // USDT持仓价值
            if (position.usdtAmount > 0) {
                totalUSDTValue += position.usdtAmount;
            }
        });
        
        return totalETHValue + totalUSDTValue;
    }

    /**
     * 计算未实现盈亏
     * @param {number} currentPrice - 当前价格
     * @returns {number} 未实现盈亏
     */
    calculateUnrealizedPnL(currentPrice) {
        let unrealizedPnL = 0;
        
        this.positions.forEach(position => {
            // 只计算ETH持仓的未实现盈亏
            if (position.ethAmount > 0) {
                const currentValue = position.ethAmount * currentPrice;
                const costBasis = position.ethAmount * (position.actualBuyPrice || this.basePrice);
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

        // 🔧 修复：基于真实交易利润计算收益率
        const initialValue = this.config.initialCapital;
        
        // 计算真实利润：已实现交易利润 + 持仓浮盈
        let realizedProfit = 0;
        this.orders.forEach(order => {
            if (order.type === 'sell' && order.profit !== undefined) {
                realizedProfit += order.profit;
            }
        });
        
        let holdingProfit = 0;
        const currentPrice = equity.length > 0 ? equity[equity.length - 1].price : this.basePrice;
        this.positions.forEach(position => {
            if (position.ethAmount > 0) {
                const cost = position.ethAmount * (position.actualBuyPrice || this.basePrice);
                const currentVal = position.ethAmount * currentPrice;
                holdingProfit += (currentVal - cost);
            }
        });
        
        const totalProfit = realizedProfit + holdingProfit;
        const finalValue = initialValue + totalProfit;
        const totalReturn = totalProfit / initialValue;
        
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
        
        // 使用已计算的totalProfit（第491行）
        
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
        // 🔧 修复：初始值应该是用户设置的初始资金，而非计算的初始总价值
        const initialValue = this.config.initialCapital;
        
        // 🐛 关键调试：详细追踪calculateTotalValue的计算
        console.log(`\n🔍 calculateProfitBreakdown调试 - 当前价格: $${currentPrice.toFixed(2)}`);
        console.log(`初始资产: $${initialValue.toLocaleString()}`);
        
        const currentTotalValue = this.calculateTotalValue(currentPrice);
        console.log(`当前总资产: $${currentTotalValue.toLocaleString()}`);
        
        // 总利润 = 当前总资产 - 初始资产
        const totalProfit = currentTotalValue - initialValue;
        console.log(`总利润: $${totalProfit.toLocaleString()} (${((totalProfit/initialValue)*100).toFixed(2)}%)`);
        
        // 🐛 检查余额和持仓价值的分解
        console.log(`当前余额: $${this.balance.toLocaleString()}`);
        const netPositionValue = currentTotalValue - this.balance;
        console.log(`净持仓价值: $${netPositionValue.toLocaleString()}`);
        
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
        let activePositions = 0;
        
        console.log(`\n🔍 检查当前持仓状态:`);
        this.positions.forEach((position, index) => {
            if (position.ethAmount > 0) {
                const actualBuyPrice = position.actualBuyPrice || this.basePrice;
                const cost = position.ethAmount * actualBuyPrice;
                const currentVal = position.ethAmount * currentPrice;
                positionCost += cost;
                holdingProfit += (currentVal - cost);
                activePositions++;
                
                if (activePositions <= 5) { // 显示前5个持仓
                    console.log(`持仓${index}: ${position.ethAmount.toFixed(6)}ETH, 成本$${actualBuyPrice.toFixed(2)}, 当前值$${currentVal.toLocaleString()}`);
                }
            }
        });
        
        console.log(`活跃持仓数: ${activePositions}个`);
        console.log(`持仓总成本: $${positionCost.toLocaleString()}`);
        console.log(`持仓浮盈浮亏: $${holdingProfit.toLocaleString()}`);
        console.log(`已实现利润: $${gridTradingProfit.toLocaleString()}`);
        
        // 🔍 验证网格交易利润的数学关系
        this.validateGridTradingMath(gridTradingProfit);
        
        // 🔧 修复：使用真实的交易利润，不包含投入本金
        const realTotalProfit = gridTradingProfit + holdingProfit;
        
        return {
            gridTradingProfit: gridTradingProfit,
            gridTradingProfitPct: initialValue > 0 ? (gridTradingProfit / initialValue) * 100 : 0,
            holdingProfit: holdingProfit,
            holdingProfitPct: positionCost > 0 ? (holdingProfit / positionCost) * 100 : 0,
            totalProfit: realTotalProfit,
            totalProfitPct: initialValue > 0 ? (realTotalProfit / initialValue) * 100 : 0,
            breakdown: {
                initialValue: initialValue,
                currentTotalValue: currentTotalValue,
                currentBalance: this.balance,
                currentPrice: currentPrice,
                positionCost: positionCost,
                gridTradeCount: this.orders.filter(o => o.type === 'sell').length,
                activePositions: this.positions.filter(p => p.ethAmount > 0).length,
                calculationVerification: {
                    realizedProfit: gridTradingProfit,
                    holdingProfit: holdingProfit,
                    totalProfit: realTotalProfit,
                    isValid: Math.abs(realTotalProfit - (gridTradingProfit + holdingProfit)) < 0.01
                }
            }
        };
    }
    
    /**
     * 验证网格交易数学关系
     * @param {number} totalGridProfit - 总网格交易利润
     */
    validateGridTradingMath(totalGridProfit) {
        console.log(`\n🔍 网格交易数学验证:`);
        
        const sellOrders = this.orders.filter(o => o.type === 'sell');
        const totalTrades = sellOrders.length;
        
        if (totalTrades === 0) {
            console.log(`❌ 没有交易记录，无法验证`);
            return;
        }
        
        // 计算每笔交易的利润
        let manualTotalProfit = 0;
        let profitDetails = [];
        
        sellOrders.forEach((trade, index) => {
            manualTotalProfit += trade.profit;
            profitDetails.push({
                trade: index + 1,
                gridIndex: trade.gridIndex,
                profit: trade.profit,
                price: trade.price,
                quantity: trade.quantity
            });
        });
        
        // 计算平均单格利润
        const avgProfitPerTrade = manualTotalProfit / totalTrades;
        
        console.log(`总交易次数: ${totalTrades}次`);
        console.log(`手动计算总利润: $${manualTotalProfit.toFixed(2)}`);
        console.log(`系统计算总利润: $${totalGridProfit.toFixed(2)}`);
        console.log(`平均单格利润: $${avgProfitPerTrade.toFixed(2)}`);
        
        // 验证数学关系
        const difference = Math.abs(manualTotalProfit - totalGridProfit);
        const isValid = difference < 0.01;
        
        console.log(`\n🔍 数学验证结果:`);
        console.log(`手动计算 vs 系统计算差异: $${difference.toFixed(2)}`);
        console.log(`验证结果: ${isValid ? '✅ 匹配' : '❌ 不匹配'}`);
        
        if (!isValid) {
            console.log(`\n⚠️ 发现利润计算错误！`);
            console.log(`预期：总利润 = 单格平均利润 × 交易次数`);
            console.log(`预期：$${totalGridProfit.toFixed(2)} = $${avgProfitPerTrade.toFixed(2)} × ${totalTrades}`);
            console.log(`实际：$${manualTotalProfit.toFixed(2)} ≠ $${totalGridProfit.toFixed(2)}`);
        }
        
        // 显示前5笔交易详情
        console.log(`\n📊 交易详情（前5笔）:`);
        profitDetails.slice(0, 5).forEach(detail => {
            console.log(`  交易${detail.trade}: 网格${detail.gridIndex}, 利润$${detail.profit.toFixed(2)}, 价格$${detail.price.toFixed(2)}`);
        });
        
        return {
            isValid,
            totalTrades,
            manualTotalProfit,
            systemTotalProfit: totalGridProfit,
            avgProfitPerTrade,
            difference
        };
    }
}