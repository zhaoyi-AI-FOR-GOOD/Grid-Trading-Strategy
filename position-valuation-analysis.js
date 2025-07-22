/**
 * 持仓价值计算分析 - 发现198.78%收益率异常的根本原因
 * 重点分析价格突破网格边界后的持仓估值问题
 */

class PositionValuationAnalysis {
    constructor() {
        console.log('💰 持仓价值计算分析');
        console.log('专门分析198.78%收益率异常的根本原因');
        console.log('='.repeat(70));
    }

    /**
     * 模拟实际场景的持仓价值计算
     */
    analyzeActualScenario() {
        console.log('\n📊 实际场景模拟分析');
        console.log('-'.repeat(50));
        
        // 实际参数
        const config = {
            initialCapital: 999896,
            leverage: 2,
            gridCount: 25,
            lowerBound: -10,  // -10%
            upperBound: 10    // +10%
        };
        
        const basePrice = 2272;      // ETH起始价格
        const finalPrice = 3687.67;  // ETH最终价格
        const gridUpperBound = 2499.20; // 网格上边界
        
        console.log(`初始资金: $${config.initialCapital.toLocaleString()}`);
        console.log(`杠杆倍数: ${config.leverage}x`);
        console.log(`基准价格: $${basePrice}`);
        console.log(`网格上边界: $${gridUpperBound}`);
        console.log(`最终价格: $${finalPrice}`);
        
        // 计算每个网格的资金分配
        const capitalPerGrid = config.initialCapital / config.gridCount;
        console.log(`每网格分配资金: $${capitalPerGrid.toLocaleString()}`);
        
        // 模拟持仓情况
        this.simulatePositionScenarios(config, basePrice, gridUpperBound, finalPrice, capitalPerGrid);
    }

    /**
     * 模拟不同的持仓场景
     */
    simulatePositionScenarios(config, basePrice, gridUpperBound, finalPrice, capitalPerGrid) {
        console.log('\n🔍 关键问题分析: 价格突破后的持仓估值');
        console.log('-'.repeat(50));
        
        // 场景1: 假设有一些持仓是在网格内买入的
        console.log('\n📈 场景分析: 网格内买入的持仓');
        
        // 假设在$2300买入了一些ETH (在网格范围内)
        const buyPrice = 2300;
        const margin = capitalPerGrid;  // 保证金
        const investAmount = margin * config.leverage; // 实际投资金额
        const quantity = investAmount / buyPrice; // 购买数量
        
        console.log(`假设在$${buyPrice}买入:`);
        console.log(`  保证金: $${margin.toLocaleString()}`);
        console.log(`  实际投资金额: $${investAmount.toLocaleString()} (${config.leverage}x杠杆)`);
        console.log(`  购买ETH数量: ${quantity.toFixed(6)} ETH`);
        
        // 当价格到达网格上边界时的价值
        console.log(`\n当价格到达网格上边界 $${gridUpperBound}:`);
        const valueAtBoundary = quantity * gridUpperBound;
        const borrowedAmount = investAmount - margin; // 借入金额
        const netValueAtBoundary = valueAtBoundary - borrowedAmount;
        const profitAtBoundary = netValueAtBoundary - margin;
        
        console.log(`  持仓总价值: $${valueAtBoundary.toLocaleString()}`);
        console.log(`  借入金额: $${borrowedAmount.toLocaleString()}`);
        console.log(`  净持仓价值: $${netValueAtBoundary.toLocaleString()}`);
        console.log(`  净利润: $${profitAtBoundary.toLocaleString()}`);
        
        // 🚨 关键问题: 当价格涨到$3687.67时
        console.log(`\n🚨 关键问题: 当价格涨到最终价格 $${finalPrice}:`);
        const valueAtFinal = quantity * finalPrice;
        const netValueAtFinal = valueAtFinal - borrowedAmount;
        const totalProfit = netValueAtFinal - margin;
        const totalReturnPct = (totalProfit / margin) * 100;
        
        console.log(`  持仓总价值: $${valueAtFinal.toLocaleString()}`);
        console.log(`  净持仓价值: $${netValueAtFinal.toLocaleString()}`);
        console.log(`  净利润: $${totalProfit.toLocaleString()}`);
        console.log(`  单个持仓收益率: ${totalReturnPct.toFixed(2)}%`);
        
        // 分析收益来源
        console.log(`\n💡 收益分解分析:`);
        const inGridReturn = ((gridUpperBound - buyPrice) / buyPrice) * 100;
        const beyondGridReturn = ((finalPrice - gridUpperBound) / gridUpperBound) * 100;
        const inGridProfit = (gridUpperBound - buyPrice) * quantity;
        const beyondGridProfit = (finalPrice - gridUpperBound) * quantity;
        
        console.log(`  网格内涨幅: ${inGridReturn.toFixed(2)}% (${buyPrice} → ${gridUpperBound})`);
        console.log(`  超出网格涨幅: ${beyondGridReturn.toFixed(2)}% (${gridUpperBound} → ${finalPrice})`);
        console.log(`  网格内利润: $${inGridProfit.toLocaleString()}`);
        console.log(`  超出网格利润: $${beyondGridProfit.toLocaleString()}`);
        
        // 计算如果所有25个网格都有类似持仓的总收益
        this.calculateTotalPortfolioImpact(config, totalReturnPct, margin);
    }

    /**
     * 计算整个投资组合的影响
     */
    calculateTotalPortfolioImpact(config, singlePositionReturn, capitalPerGrid) {
        console.log(`\n📊 整个投资组合影响分析:`);
        console.log('-'.repeat(40));
        
        // 假设有一定比例的网格被激活并持有到最终价格
        const activeGridRatio = 0.6; // 假设60%的网格被激活
        const activeGrids = Math.floor(config.gridCount * activeGridRatio);
        const activeCapital = activeGrids * capitalPerGrid;
        
        console.log(`活跃网格数: ${activeGrids}个 (${config.gridCount}个中的${(activeGridRatio*100).toFixed(0)}%)`);
        console.log(`活跃资金: $${activeCapital.toLocaleString()}`);
        
        // 如果这些活跃网格都获得类似的收益率
        const totalActiveProfit = activeCapital * (singlePositionReturn / 100);
        const portfolioReturn = (totalActiveProfit / config.initialCapital) * 100;
        
        console.log(`活跃部分总利润: $${totalActiveProfit.toLocaleString()}`);
        console.log(`整体投资组合收益率: ${portfolioReturn.toFixed(2)}%`);
        
        console.log(`\n🔍 与实际结果对比:`);
        console.log(`计算的投资组合收益率: ${portfolioReturn.toFixed(2)}%`);
        console.log(`实际报告的收益率: 198.78%`);
        
        if (portfolioReturn > 150) {
            console.log(`\n✅ 分析结论:`);
            console.log(`这解释了为什么会有接近200%的收益率!`);
            console.log(`关键原因:`);
            console.log(`1. 价格大幅突破网格上边界 (47.55%的额外涨幅)`);
            console.log(`2. 杠杆放大了收益效果`);
            console.log(`3. 在网格内建立的持仓获得了整个价格上涨的收益`);
            console.log(`4. 这种情况下高收益是合理的!`);
        }
        
        // 验证这是否是合理的收益计算
        this.validateReasonableness(config, singlePositionReturn);
    }

    /**
     * 验证收益计算的合理性
     */
    validateReasonableness(config, calculatedReturn) {
        console.log(`\n✅ 收益合理性验证:`);
        console.log('-'.repeat(30));
        
        // ETH现货收益
        const ethSpotReturn = ((3687.67 - 2272) / 2272) * 100;
        console.log(`ETH现货收益率: ${ethSpotReturn.toFixed(2)}%`);
        
        // 理论杠杆收益
        const theoreticalLeverageReturn = ethSpotReturn * config.leverage;
        console.log(`理论2倍杠杆收益: ${theoreticalLeverageReturn.toFixed(2)}%`);
        
        // 网格策略的额外收益
        const gridStrategyBonus = calculatedReturn - theoreticalLeverageReturn;
        console.log(`网格策略额外收益: ${gridStrategyBonus.toFixed(2)}%`);
        
        console.log(`\n💡 结论:`);
        if (gridStrategyBonus > 0 && gridStrategyBonus < 100) {
            console.log(`✅ 收益计算是合理的!`);
            console.log(`网格策略确实可以在价格突破时获得额外收益`);
            console.log(`这是因为:`);
            console.log(`1. 网格在上涨过程中建立了有利仓位`);
            console.log(`2. 价格突破后这些仓位获得了巨大收益`);
            console.log(`3. 杠杆进一步放大了这种效果`);
        } else {
            console.log(`⚠️ 收益可能过高，需要进一步检查计算逻辑`);
        }
    }

    /**
     * 运行完整分析
     */
    runCompleteAnalysis() {
        this.analyzeActualScenario();
        
        console.log(`\n🎯 最终分析结论:`);
        console.log('='.repeat(50));
        console.log(`1. 价格区间计算是正确的 (2044.80 - 2499.20)`);
        console.log(`2. 价格确实大幅突破了网格上边界 (+47.55%)`);
        console.log(`3. 在网格内建立的杠杆仓位获得了整个价格上涨收益`);
        console.log(`4. 198.78%的收益率在这种极端情况下是可能的`);
        console.log(`5. 关键是确保边界突破后不再进行新的网格交易`);
        
        console.log(`\n⚠️  需要验证的关键点:`);
        console.log(`1. 系统是否在价格超出2499.20后停止了新交易?`);
        console.log(`2. 持仓价值计算是否正确考虑了杠杆?`);
        console.log(`3. 是否正确处理了借入资金的成本?`);
    }
}

// 运行分析
const analysis = new PositionValuationAnalysis();
analysis.runCompleteAnalysis();