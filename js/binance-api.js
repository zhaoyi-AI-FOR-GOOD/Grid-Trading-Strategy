/**
 * 币安API数据获取模块
 */
class BinanceAPI {
    constructor() {
        this.baseUrl = 'https://fapi.binance.com/fapi/v1'; // 永续合约API
        this.cache = new Map();
    }

    /**
     * 获取ETH/USDT K线数据
     * @param {string} interval - 时间间隔 (1h, 4h, 1d)
     * @param {string} period - 时间范围 ('recent30' 或 'YYYY-MM')
     * @returns {Promise<Array>} K线数据数组
     */
    async getKlineData(interval = '1h', period = 'recent30') {
        const symbol = 'ETHUSDT';
        const cacheKey = `${symbol}_${interval}_${period}`;

        // 检查缓存
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            const cacheAge = Date.now() - cached.timestamp;
            // 缓存10分钟有效
            if (cacheAge < 10 * 60 * 1000) {
                console.log(`使用缓存数据: ${period}`);
                return cached.data;
            }
        }

        try {
            const { startTime, endTime, limit } = this.calculateTimeRange(interval, period);
            
            const url = `${this.baseUrl}/klines`;
            const params = new URLSearchParams({
                symbol: symbol,
                interval: interval,
                startTime: startTime.toString(),
                endTime: endTime.toString(),
                limit: limit.toString()
            });

            console.log(`正在获取 ${symbol} ${interval} 数据，时间范围: ${period}`);
            console.log(`开始时间: ${new Date(startTime).toLocaleString()}`);
            console.log(`结束时间: ${new Date(endTime).toLocaleString()}`);
            
            const response = await fetch(`${url}?${params}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`币安API错误 ${response.status}: ${errorText}`);
            }
            
            const rawData = await response.json();
            
            // 验证数据完整性
            if (!Array.isArray(rawData) || rawData.length === 0) {
                throw new Error('获取的数据为空或格式错误');
            }
            
            const formattedData = this.formatKlineData(rawData);
            
            // 验证时间范围
            if (formattedData.length > 0) {
                const dataStart = new Date(formattedData[0].timestamp);
                const dataEnd = new Date(formattedData[formattedData.length - 1].timestamp);
                console.log(`实际数据时间范围: ${dataStart.toLocaleString()} 至 ${dataEnd.toLocaleString()}`);
            }
            
            // 缓存数据
            this.cache.set(cacheKey, {
                data: formattedData,
                timestamp: Date.now(),
                period: period,
                requestTime: new Date().toISOString()
            });
            
            console.log(`成功获取 ${formattedData.length} 条真实K线数据`);
            return formattedData;
            
        } catch (error) {
            console.error('获取币安数据失败:', error);
            throw new Error(`无法获取${period}的市场数据: ${error.message}`);
        }
    }

    /**
     * 计算时间范围和数据条数
     * @param {string} interval - 时间间隔
     * @param {string} period - 时间范围
     * @returns {Object} 包含开始时间、结束时间和限制条数
     */
    calculateTimeRange(interval, period) {
        const now = new Date();
        let startTime, endTime, limit;

        if (period === 'recent30') {
            // 最近30天
            endTime = now.getTime();
            startTime = endTime - (30 * 24 * 60 * 60 * 1000);
            limit = this.getDataPointsForDays(interval, 30);
        } else if (period.match(/^\d{4}-\d{2}$/)) {
            // 指定月份 (YYYY-MM)
            const [year, month] = period.split('-').map(Number);
            
            // 构建月份的开始和结束时间
            const startDate = new Date(year, month - 1, 1); // month - 1 因为Date的月份从0开始
            const endDate = new Date(year, month, 0); // 0表示上个月的最后一天，即当前月的最后一天
            endDate.setHours(23, 59, 59, 999); // 设置为当天最后一毫秒
            
            startTime = startDate.getTime();
            endTime = endDate.getTime();
            
            // 验证时间范围的有效性
            if (startTime > now.getTime()) {
                throw new Error(`所选月份 ${period} 尚未到来`);
            }
            
            // 如果是当前月份，结束时间设为现在
            if (year === now.getFullYear() && month - 1 === now.getMonth()) {
                endTime = now.getTime();
            }
            
            const daysInMonth = Math.ceil((endTime - startTime) / (24 * 60 * 60 * 1000));
            limit = this.getDataPointsForDays(interval, daysInMonth);
            
            console.log(`计算 ${period} 数据范围: ${daysInMonth} 天`);
        } else {
            throw new Error(`不支持的时间范围格式: ${period}`);
        }

        return {
            startTime,
            endTime,
            limit: Math.min(limit, 1500) // 币安API限制
        };
    }

    /**
     * 根据时间间隔计算指定天数的数据点数
     * @param {string} interval - 时间间隔
     * @param {number} days - 天数
     * @returns {number} 数据点数
     */
    getDataPointsForDays(interval, days) {
        const intervalMap = {
            '1h': days * 24,
            '4h': days * 6,
            '1d': days * 1
        };
        
        return intervalMap[interval] || days * 24;
    }

    /**
     * 格式化K线数据
     * @param {Array} rawData - 原始K线数据
     * @returns {Array} 格式化后的数据
     */
    formatKlineData(rawData) {
        return rawData.map(candle => {
            const [
                openTime,
                open,
                high,
                low,
                close,
                volume,
                closeTime,
                quoteAssetVolume,
                numberOfTrades,
                takerBuyBaseAssetVolume,
                takerBuyQuoteAssetVolume,
                ignore
            ] = candle;

            return {
                timestamp: parseInt(openTime),
                date: new Date(parseInt(openTime)),
                open: parseFloat(open),
                high: parseFloat(high),
                low: parseFloat(low),
                close: parseFloat(close),
                volume: parseFloat(volume),
                closeTime: parseInt(closeTime),
                trades: parseInt(numberOfTrades)
            };
        }).sort((a, b) => a.timestamp - b.timestamp); // 确保按时间排序
    }

    /**
     * 获取当前ETH价格
     * @returns {Promise<number>} 当前价格
     */
    async getCurrentPrice() {
        try {
            const response = await fetch(`${this.baseUrl}/ticker/price?symbol=ETHUSDT`);
            const data = await response.json();
            return parseFloat(data.price);
        } catch (error) {
            console.error('获取当前价格失败:', error);
            throw error;
        }
    }

    /**
     * 获取24小时统计数据
     * @returns {Promise<Object>} 24小时统计
     */
    async get24hrStats() {
        try {
            const response = await fetch(`${this.baseUrl}/ticker/24hr?symbol=ETHUSDT`);
            const data = await response.json();
            return {
                priceChange: parseFloat(data.priceChange),
                priceChangePercent: parseFloat(data.priceChangePercent),
                highPrice: parseFloat(data.highPrice),
                lowPrice: parseFloat(data.lowPrice),
                volume: parseFloat(data.volume),
                count: parseInt(data.count)
            };
        } catch (error) {
            console.error('获取24小时统计失败:', error);
            throw error;
        }
    }

    /**
     * 清除缓存
     */
    clearCache() {
        this.cache.clear();
        console.log('API缓存已清除');
    }

    /**
     * 获取价格变化分析
     * @param {Array} data - K线数据
     * @returns {Object} 价格分析结果
     */
    analyzePriceData(data) {
        if (!data || data.length < 2) {
            return null;
        }

        const prices = data.map(d => d.close);
        const returns = [];
        
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }

        const volatility = this.calculateVolatility(returns);
        const trend = this.calculateTrend(prices);
        
        return {
            startPrice: prices[0],
            endPrice: prices[prices.length - 1],
            minPrice: Math.min(...prices),
            maxPrice: Math.max(...prices),
            volatility: volatility,
            trend: trend,
            totalReturn: (prices[prices.length - 1] - prices[0]) / prices[0],
            dataPoints: data.length
        };
    }

    /**
     * 计算波动率
     * @param {Array} returns - 收益率数组
     * @returns {number} 年化波动率
     */
    calculateVolatility(returns) {
        if (returns.length < 2) return 0;
        
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
        const dailyVol = Math.sqrt(variance);
        
        // 年化波动率 (假设一年365天)
        return dailyVol * Math.sqrt(365);
    }

    /**
     * 计算趋势
     * @param {Array} prices - 价格数组
     * @returns {string} 趋势方向
     */
    calculateTrend(prices) {
        if (prices.length < 10) return 'neutral';
        
        const firstHalf = prices.slice(0, Math.floor(prices.length / 2));
        const secondHalf = prices.slice(Math.floor(prices.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, p) => sum + p, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, p) => sum + p, 0) / secondHalf.length;
        
        const changePct = (secondAvg - firstAvg) / firstAvg;
        
        if (changePct > 0.05) return 'bullish';
        if (changePct < -0.05) return 'bearish';
        return 'neutral';
    }
}