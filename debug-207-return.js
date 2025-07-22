/**
 * 调试207.12%异常收益率
 * 分析最新测试中的问题
 */

class Debug207Return {
    constructor() {
        console.log('🔍 调试207.12%异常收益率问题');
        console.log('分析修复后代码为什么还是出现异常收益');
        console.log('='.repeat(60));
    }

    analyzeLatestTestData() {
        console.log('\n📊 最新测试数据分析');
        console.log('-'.repeat(30));
        
        // 从日志中提取的关键数据
        const testData = {
            basePrice: 2278.81,
            priceRange: {
                lower: 2050.93,
                upper: 2506.69
            },
            finalPrice: 3697.7,
            totalTrades: 98,
            totalReturn: 207.12,
            ethReturn: 62.26,
            leverage: 2
        };
        
        console.log(`基准价格: $${testData.basePrice}`);
        console.log(`网格范围: $${testData.priceRange.lower} - $${testData.priceRange.upper}`);
        console.log(`最终价格: $${testData.finalPrice}`);
        console.log(`网格策略收益: ${testData.totalReturn}%`);
        console.log(`ETH现货收益: ${testData.ethReturn}%`);
        console.log(`交易次数: ${testData.totalTrades}次`);
        
        // 分析价格突破情况
        const exceedsUpper = testData.finalPrice > testData.priceRange.upper;
        const exceedAmount = testData.finalPrice - testData.priceRange.upper;
        const exceedPercentage = (exceedAmount / testData.priceRange.upper) * 100;
        
        console.log(`\n🚨 价格突破分析:`);
        console.log(`价格是否超出网格上边界: ${exceedsUpper ? '是' : '否'}`);
        if (exceedsUpper) {
            console.log(`超出金额: $${exceedAmount.toFixed(2)}`);
            console.log(`超出幅度: ${exceedPercentage.toFixed(2)}%`);
        }
        
        // 分析收益异常性
        this.analyzeReturnAnomaly(testData);
    }

    analyzeReturnAnomaly(testData) {
        console.log(`\n💰 收益异常性分析:`);
        console.log('-'.repeat(25));
        
        // 理论网格交易收益
        const gridRange = testData.priceRange.upper - testData.priceRange.lower;
        const gridCount = 25;
        const gridSpacing = gridRange / (gridCount - 1);
        const avgPrice = (testData.priceRange.lower + testData.priceRange.upper) / 2;
        
        console.log(`网格价格区间: $${gridRange.toFixed(2)}`);
        console.log(`网格间距: $${gridSpacing.toFixed(2)}`);
        console.log(`平均价格: $${avgPrice.toFixed(2)}`);
        
        // 理论单次交易收益
        const theoreticalProfitPerTrade = gridSpacing * 0.3; // 30%间距利润
        const theoreticalReturnPerTrade = (theoreticalProfitPerTrade / avgPrice) * testData.leverage;
        const maxTheoreticalReturn = theoreticalReturnPerTrade * gridCount;
        
        console.log(`\n理论分析:`);
        console.log(`单次交易理论利润: $${theoreticalProfitPerTrade.toFixed(2)}`);
        console.log(`单次交易收益率: ${(theoreticalReturnPerTrade * 100).toFixed(3)}%`);
        console.log(`最大理论总收益: ${(maxTheoreticalReturn * 100).toFixed(2)}%`);
        
        console.log(`\n实际vs理论对比:`);
        console.log(`实际收益率: ${testData.totalReturn}%`);
        console.log(`理论收益率: ${(maxTheoreticalReturn * 100).toFixed(2)}%`);
        console.log(`异常倍数: ${(testData.totalReturn / (maxTheoreticalReturn * 100)).toFixed(2)}x`);
        
        // 🚨 关键问题分析
        console.log(`\n🚨 关键问题分析:`);
        if (testData.totalReturn > maxTheoreticalReturn * 100 * 2) {
            console.log(`❌ 收益率严重异常！实际收益远超理论值`);
            console.log(`这说明修复后的代码没有生效，或者存在其他问题：`);
            console.log(`1. shouldBuy/shouldSell修复可能没有正确实现`);
            console.log(`2. 可能存在其他代码路径绕过了边界检查`);
            console.log(`3. 持仓价值计算仍然存在问题`);
            console.log(`4. 交易执行逻辑可能有其他bug`);
        }
        
        // 分析交易次数
        this.analyzeTradeCount(testData);
    }

    analyzeTradeCount(testData) {
        console.log(`\n📈 交易次数分析:`);
        console.log('-'.repeat(20));
        
        const completeCycles = Math.floor(testData.totalTrades / 2);
        console.log(`总交易次数: ${testData.totalTrades}次`);
        console.log(`完整买卖周期: ${completeCycles}个`);
        
        // 如果有98次交易，说明系统确实在大量交易
        if (testData.totalTrades > 50) {
            console.log(`\n🚨 交易次数异常高！`);
            console.log(`这可能说明：`);
            console.log(`1. 系统在价格突破边界后仍在交易`);
            console.log(`2. shouldBuy/shouldSell的边界检查没有生效`);
            console.log(`3. 需要检查实际的交易日志`);
        }
    }

    identifyRootCause() {
        console.log(`\n🔍 根本原因分析:`);
        console.log('='.repeat(25));
        
        console.log(`基于日志数据，可能的原因：`);
        console.log(`\n1. 代码修复没有正确部署`);
        console.log(`   - 浏览器可能使用了缓存的旧版本`);
        console.log(`   - 需要强制刷新浏览器缓存`);
        
        console.log(`\n2. 边界检查逻辑有漏洞`);
        console.log(`   - shouldBuy/shouldSell可能存在逻辑漏洞`);
        console.log(`   - 某些代码路径绕过了边界检查`);
        
        console.log(`\n3. 持仓价值计算错误`);
        console.log(`   - calculateTotalValue可能仍在计算虚假ETH价值`);
        console.log(`   - 在价格$3697.7时仍在计算ETH持仓收益`);
        
        console.log(`\n4. 数据时间范围问题`);
        console.log(`   - 测试使用的是recent30天数据(6/22-7/22)`);
        console.log(`   - 可能包含了ETH大幅上涨的时间段`);
        
        console.log(`\n🔧 立即需要做的检查：`);
        console.log(`1. 强制刷新浏览器，清除缓存`);
        console.log(`2. 检查shouldBuy/shouldSell是否真正被调用`);
        console.log(`3. 添加调试日志追踪交易执行`);
        console.log(`4. 验证边界检查是否真正生效`);
    }

    runCompleteAnalysis() {
        this.analyzeLatestTestData();
        this.identifyRootCause();
        
        console.log(`\n🎯 紧急行动计划:`);
        console.log('='.repeat(30));
        console.log(`✅ 1. 立即添加调试日志到shouldBuy/shouldSell`);
        console.log(`✅ 2. 检查边界检查是否被正确执行`);
        console.log(`✅ 3. 追踪价格超过$2506.69后的交易行为`);
        console.log(`✅ 4. 验证修复是否真正生效`);
        
        return {
            anomalyDetected: true,
            suspectedCause: '边界检查修复未生效',
            urgentAction: '添加调试日志和验证修复'
        };
    }
}

// 运行分析
const debug207 = new Debug207Return();
debug207.runCompleteAnalysis();