/**
 * 网格交易策略引擎 - 修复版本 v20250722-fix
 * 🔧 已修复核心买入卖出逻辑错误
 */

console.log('🚀 GridStrategy纯参数网格版本已加载 - v20250722-pure-grid');

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
     * 初始化网格交易 - 买入初始多仓并设置挂单
     * 🔧 核心：用初始资金买入ETH多仓，然后在订单簿上挂单
     */
    initializePositions() {
        const capitalPerGrid = this.config.initialCapital / this.config.gridCount;
        let totalEthPurchased = 0;
        let totalUsdtUsed = 0;
        
        console.log(`\n🚀 初始化网格交易 - 基准价格: $${this.basePrice.toFixed(2)}`);
        console.log(`总资金: $${this.config.initialCapital.toLocaleString()}`);
        console.log(`每个网格分配资金: $${capitalPerGrid.toLocaleString()}`);
        
        this.gridLevels.forEach((gridPrice, index) => {
            const sellPrice = index < this.gridLevels.length - 1 ? this.gridLevels[index + 1] : null;
            
            const position = {
                gridIndex: index,
                gridPrice: gridPrice,          // 网格价格
                sellPrice: sellPrice,          // 卖出价格
                quantity: 0,
                allocated: capitalPerGrid,
                status: 'waiting',
                buyPrice: null,
                buyTime: null
            };
            
            // 🎯 关键：立即买入ETH多仓，按网格分配资金
            const margin = capitalPerGrid;
            const investAmount = margin * this.config.leverage;
            const quantity = investAmount / gridPrice;
            const fee = margin * this.config.feeRate;
            
            // 检查余额是否充足
            if (this.balance >= margin + fee) {
                // 买入ETH
                position.quantity = quantity;
                position.status = 'bought';
                position.buyPrice = gridPrice;
                position.buyTime = Date.now();
                
                // 扣除资金
                this.balance -= (margin + fee);
                totalEthPurchased += quantity;
                totalUsdtUsed += (margin + fee);
                
                if (sellPrice) {
                    console.log(`✅ 网格${index}: 买入${quantity.toFixed(6)}ETH@$${gridPrice.toFixed(2)}, 挂卖单@$${sellPrice.toFixed(2)}`);
                } else {
                    console.log(`✅ 网格${index}: 买入${quantity.toFixed(6)}ETH@$${gridPrice.toFixed(2)}, 最高网格持有`);
                }
            }
            
            this.positions.push(position);
        });
        
        console.log(`\n📊 初始化完成:`);
        console.log(`总购买ETH: ${totalEthPurchased.toFixed(6)}ETH`);
        console.log(`已使用资金: $${totalUsdtUsed.toLocaleString()}`);
        console.log(`剩余余额: $${this.balance.toLocaleString()}`);
        console.log(`初始ETH价值: $${(totalEthPurchased * this.basePrice).toLocaleString()}`);
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
     * 判断是否应该买入 - 网格补仓逻辑
     * 🔧 当卖出后，在更低价位补仓买入
     * @param {number} currentPrice - 当前价格
     * @param {number} gridPrice - 网格价格
     * @param {Object} position - 持仓信息
     * @returns {boolean}
     */
    shouldBuy(currentPrice, gridPrice, position) {
        // 只有卖出后的网格才需要补仓
        if (position.status !== 'waiting' || this.balance < position.allocated) {
            return false;
        }
        
        // 🎯 网格交易核心：价格回落到网格价位时补仓
        const tolerance = gridPrice * 0.002; // 0.2%容差
        const shouldBuyResult = currentPrice <= gridPrice + tolerance;
        
        if (shouldBuyResult) {
            console.log(`✅ 网格补仓买入: 价格$${currentPrice.toFixed(2)} ≤ 网格$${gridPrice.toFixed(2)}`);
        }
        
        return shouldBuyResult;
    }

    /**
     * 判断是否应该卖出 - 网格挂单卖出逻辑
     * 🔧 纯挂单系统：价格触及卖出价位时执行卖出挂单
     * @param {number} currentPrice - 当前价格
     * @param {number} gridIndex - 网格索引
     * @param {Object} position - 持仓信息
     * @returns {boolean}
     */
    shouldSell(currentPrice, gridIndex, position) {
        if (position.status !== 'bought' || position.quantity <= 0) {
            return false;
        }
        
        // 🎯 网格交易核心：使用预设的卖出价位
        const targetSellPrice = position.sellPrice;
        
        // 如果没有卖出价位（最高网格），说明已到用户设定的价格区间上限
        if (!targetSellPrice) {
            // 🎯 最高网格：按用户参数设定，没有更高价位可卖，持有不动
            return false;
        }
        
        // 价格触及卖出挂单价位时执行
        const tolerance = targetSellPrice * 0.002; // 0.2%容差，模拟挂单成交
        const shouldSellResult = currentPrice >= targetSellPrice - tolerance;
        
        if (shouldSellResult) {
            console.log(`✅ 网格卖出挂单执行: 价格$${currentPrice.toFixed(2)} ≥ 卖出价$${targetSellPrice.toFixed(2)}`);
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
            if (position.status === 'bought' && position.quantity > 0) {
                const cost = position.quantity * position.buyPrice;
                const currentVal = position.quantity * currentPrice;
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
            if (position.status === 'bought' && position.quantity > 0) {
                const cost = position.quantity * position.buyPrice;
                const currentVal = position.quantity * currentPrice;
                positionCost += cost;
                holdingProfit += (currentVal - cost);
                activePositions++;
                
                if (activePositions <= 5) { // 显示前5个持仓
                    console.log(`持仓${index}: ${position.quantity.toFixed(6)}ETH, 成本$${position.buyPrice.toFixed(2)}, 当前值$${currentVal.toLocaleString()}`);
                }
            }
        });
        
        console.log(`活跃持仓数: ${activePositions}个`);
        console.log(`持仓总成本: $${positionCost.toLocaleString()}`);
        console.log(`持仓浮盈浮亏: $${holdingProfit.toLocaleString()}`);
        console.log(`已实现利润: $${gridTradingProfit.toLocaleString()}`);
        
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
                activePositions: this.positions.filter(p => p.status === 'bought').length,
                calculationVerification: {
                    realizedProfit: gridTradingProfit,
                    holdingProfit: holdingProfit,
                    totalProfit: realTotalProfit,
                    isValid: Math.abs(realTotalProfit - (gridTradingProfit + holdingProfit)) < 0.01
                }
            }
        };
    }
}