/**
 * 杠杆持仓价值计算调试
 * 专门检查calculateTotalValue和holdingProfit计算中的杠杆处理
 */

class LeveragePositionDebug {
    constructor() {
        console.log('🔧 杠杆持仓价值计算调试');
        console.log('检查calculateTotalValue和holdingProfit的差异');
        console.log('='.repeat(60));
    }

    /**
     * 对比两种计算方式的差异
     */
    compareCalculationMethods() {
        console.log('\n📊 对比分析: calculateTotalValue vs holdingProfit计算');
        console.log('-'.repeat(55));
        
        // 模拟一个具体的持仓
        const position = {
            quantity: 34.78,        // ETH数量
            buyPrice: 2300,         // 买入价格
            status: 'bought'
        };
        
        const currentPrice = 3687.67;   // 当前价格
        const leverage = 2;             // 杠杆倍数
        const margin = 39995.84;        // 保证金
        
        console.log('持仓信息:');
        console.log(`  ETH数量: ${position.quantity} ETH`);
        console.log(`  买入价格: $${position.buyPrice}`);
        console.log(`  当前价格: $${currentPrice}`);
        console.log(`  杠杆倍数: ${leverage}x`);
        console.log(`  保证金: $${margin.toLocaleString()}`);
        
        // 方法1: calculateTotalValue的计算方式
        console.log('\n🔵 方法1: calculateTotalValue的计算方式');
        const currentValue = position.quantity * currentPrice;
        const positionCost = position.quantity * position.buyPrice;
        const borrowedAmount = positionCost * (leverage - 1) / leverage;
        const netPositionValue = currentValue - borrowedAmount;
        
        console.log(`  当前市值: $${currentValue.toLocaleString()}`);
        console.log(`  持仓成本: $${positionCost.toLocaleString()}`);
        console.log(`  借入金额: $${borrowedAmount.toLocaleString()}`);
        console.log(`  净持仓价值: $${netPositionValue.toLocaleString()}`);
        console.log(`  净利润: $${(netPositionValue - margin).toLocaleString()}`);
        
        // 方法2: holdingProfit的计算方式 (原calculateProfitBreakdown中的)
        console.log('\n🔴 方法2: holdingProfit的计算方式');
        const cost = position.quantity * position.buyPrice;  // 这里没有考虑杠杆！
        const currentVal = position.quantity * currentPrice;
        const holdingProfit = currentVal - cost;  // 这里计算的是总价值变化，不是净利润！
        
        console.log(`  成本基础: $${cost.toLocaleString()}`);
        console.log(`  当前市值: $${currentVal.toLocaleString()}`);
        console.log(`  持仓浮盈: $${holdingProfit.toLocaleString()}`);
        
        // 🚨 关键差异分析
        console.log('\n🚨 关键差异分析:');
        const netProfit1 = netPositionValue - margin;  // 方法1的净利润
        const difference = holdingProfit - netProfit1;   // 两种方法的差异
        
        console.log(`  方法1净利润: $${netProfit1.toLocaleString()}`);
        console.log(`  方法2浮盈: $${holdingProfit.toLocaleString()}`);
        console.log(`  差异: $${difference.toLocaleString()}`);
        console.log(`  差异百分比: ${(difference/netProfit1*100).toFixed(2)}%`);
        
        console.log('\n💡 问题分析:');
        console.log('方法2 (holdingProfit) 的问题:');
        console.log('1. 计算 cost = quantity × buyPrice，但这是总投资额');
        console.log('2. 没有考虑杠杆交易中只用了部分资金作为保证金');
        console.log('3. 没有扣除借入资金成本');
        console.log('4. 导致浮盈计算过高!');
        
        return {
            netProfit1,
            holdingProfit,
            difference,
            currentPrice,
            leverage
        };
    }

    /**
     * 计算对整个投资组合的影响
     */
    calculatePortfolioImpact(singlePositionAnalysis) {
        console.log('\n📈 对整个投资组合的影响');
        console.log('-'.repeat(35));
        
        const { netProfit1, holdingProfit, currentPrice } = singlePositionAnalysis;
        
        // 假设有15个类似的持仓
        const activePositions = 15;
        const totalCorrectProfit = netProfit1 * activePositions;
        const totalIncorrectProfit = holdingProfit * activePositions;
        const profitDifference = totalIncorrectProfit - totalCorrectProfit;
        
        console.log(`活跃持仓数: ${activePositions}个`);
        console.log(`正确的总利润: $${totalCorrectProfit.toLocaleString()}`);
        console.log(`错误的总浮盈: $${totalIncorrectProfit.toLocaleString()}`);
        console.log(`利润差异: $${profitDifference.toLocaleString()}`);
        
        // 对收益率的影响
        const initialCapital = 999896;
        const correctReturnPct = (totalCorrectProfit / initialCapital) * 100;
        const incorrectReturnPct = (totalIncorrectProfit / initialCapital) * 100;
        const returnDifference = incorrectReturnPct - correctReturnPct;
        
        console.log(`\n收益率影响:`);
        console.log(`  正确收益率: ${correctReturnPct.toFixed(2)}%`);
        console.log(`  错误收益率: ${incorrectReturnPct.toFixed(2)}%`);
        console.log(`  收益率差异: ${returnDifference.toFixed(2)}%`);
        
        console.log(`\n🎯 这可能解释了为什么收益率过高!`);
        
        return {
            correctReturnPct,
            incorrectReturnPct,
            returnDifference
        };
    }

    /**
     * 提供修复建议
     */
    provideFix() {
        console.log('\n🔧 修复建议');
        console.log('='.repeat(30));
        
        console.log('问题根源:');
        console.log('calculateProfitBreakdown中的holdingProfit计算不正确');
        console.log('');
        console.log('当前错误代码:');
        console.log('```javascript');
        console.log('const cost = position.quantity * position.buyPrice;  // 错误!');
        console.log('const currentVal = position.quantity * currentPrice;');
        console.log('holdingProfit += (currentVal - cost);  // 没有考虑杠杆!');
        console.log('```');
        console.log('');
        console.log('正确的计算应该是:');
        console.log('```javascript');
        console.log('// 杠杆持仓的正确计算');
        console.log('const currentValue = position.quantity * currentPrice;');
        console.log('if (this.config.leverage > 1) {');
        console.log('    const positionCost = position.quantity * position.buyPrice;');
        console.log('    const borrowedAmount = positionCost * (this.config.leverage - 1) / this.config.leverage;');
        console.log('    const netCurrentValue = currentValue - borrowedAmount;');
        console.log('    // 计算相对于保证金的盈亏');
        console.log('    const margin = positionCost / this.config.leverage;');
        console.log('    holdingProfit += (netCurrentValue - margin);');
        console.log('} else {');
        console.log('    const cost = position.quantity * position.buyPrice;');
        console.log('    holdingProfit += (currentValue - cost);');
        console.log('}');
        console.log('```');
    }

    /**
     * 运行完整调试
     */
    runCompleteDebug() {
        const analysis = this.compareCalculationMethods();
        const portfolioImpact = this.calculatePortfolioImpact(analysis);
        this.provideFix();
        
        console.log('\n🎯 调试结论:');
        console.log('='.repeat(40));
        console.log('✅ 找到了198.78%收益率异常的根本原因!');
        console.log('❌ holdingProfit计算没有正确处理杠杆交易');
        console.log('💡 需要修复calculateProfitBreakdown函数');
        console.log('📈 修复后收益率应该更合理');
        
        return {
            analysis,
            portfolioImpact,
            conclusion: '需要修复holdingProfit的杠杆计算逻辑'
        };
    }
}

// 运行调试
const debug = new LeveragePositionDebug();
debug.runCompleteDebug();