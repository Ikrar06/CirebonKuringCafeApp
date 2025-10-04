'use client'

export interface IngredientCost {
  id: string
  name: string
  quantity: number
  unit: string
  cost_per_unit: number
  total_cost: number
}

export interface PricingData {
  ingredients: IngredientCost[]
  preparation_time: number
  category: string
  difficulty_level: 'easy' | 'medium' | 'hard'
  portion_size: number
}

export interface PricingSuggestion {
  base_cost: number
  labor_cost: number
  overhead_cost: number
  total_cost: number
  suggested_prices: {
    low_margin: number     // 30% margin
    medium_margin: number  // 50% margin
    high_margin: number    // 70% margin
    premium_margin: number // 100% margin
  }
  market_analysis: {
    category_average: number
    competitor_range: {
      min: number
      max: number
    }
    recommendation: 'below_market' | 'market_average' | 'above_market' | 'premium'
  }
  breakdown: {
    ingredient_percentage: number
    labor_percentage: number
    overhead_percentage: number
    profit_percentage: number
  }
}

class PricingService {
  // Base rates for cost calculation
  private readonly LABOR_RATE_PER_MINUTE = 250 // IDR per minute (more realistic wage calculation)
  private readonly OVERHEAD_RATE = 0.30 // 30% overhead on base costs (utilities, rent, etc)

  // Market data for different categories (mock data - in real app this would come from API)
  private readonly MARKET_DATA = {
    'appetizer': { min: 15000, max: 45000, average: 25000 },
    'main-course': { min: 25000, max: 85000, average: 45000 },
    'dessert': { min: 12000, max: 35000, average: 20000 },
    'beverage': { min: 8000, max: 25000, average: 15000 },
    'snack': { min: 10000, max: 30000, average: 18000 }
  }

  calculatePricing(data: PricingData): PricingSuggestion {
    // Calculate base ingredient cost
    const baseCost = data.ingredients.reduce((total, ingredient) => {
      return total + ingredient.total_cost
    }, 0)

    // Calculate labor cost based on preparation time and difficulty
    const difficultyMultiplier = {
      'easy': 1.0,
      'medium': 1.3,
      'hard': 1.6
    }

    const laborCost = data.preparation_time * this.LABOR_RATE_PER_MINUTE * difficultyMultiplier[data.difficulty_level]

    // Calculate overhead cost
    const overheadCost = (baseCost + laborCost) * this.OVERHEAD_RATE

    // Total cost
    const totalCost = baseCost + laborCost + overheadCost

    // Calculate suggested prices with different margins
    // Formula: price = cost * (1 + margin_percentage)
    // Rounded to nearest 1000 for cleaner pricing
    const suggestedPrices = {
      low_margin: Math.round((totalCost * 1.20) / 1000) * 1000,      // 20% markup (aman, low risk)
      medium_margin: Math.round((totalCost * 1.35) / 1000) * 1000,   // 35% markup (recommended for cafe)
      high_margin: Math.round((totalCost * 1.50) / 1000) * 1000,     // 50% markup (good margin)
      premium_margin: Math.round((totalCost * 1.70) / 1000) * 1000   // 70% markup (premium cafe)
    }

    // Get market analysis
    const marketData = this.MARKET_DATA[data.category as keyof typeof this.MARKET_DATA] || this.MARKET_DATA['main-course']

    // Determine market positioning
    let recommendation: PricingSuggestion['market_analysis']['recommendation'] = 'market_average'
    if (suggestedPrices.medium_margin < marketData.average * 0.8) {
      recommendation = 'below_market'
    } else if (suggestedPrices.medium_margin > marketData.average * 1.3) {
      recommendation = 'premium'
    } else if (suggestedPrices.medium_margin > marketData.average * 1.1) {
      recommendation = 'above_market'
    }

    // Calculate cost breakdown percentages
    const finalPrice = suggestedPrices.medium_margin
    const breakdown = {
      ingredient_percentage: Math.round((baseCost / finalPrice) * 100),
      labor_percentage: Math.round((laborCost / finalPrice) * 100),
      overhead_percentage: Math.round((overheadCost / finalPrice) * 100),
      profit_percentage: Math.round(((finalPrice - totalCost) / finalPrice) * 100)
    }

    return {
      base_cost: Math.round(baseCost),
      labor_cost: Math.round(laborCost),
      overhead_cost: Math.round(overheadCost),
      total_cost: Math.round(totalCost),
      suggested_prices: suggestedPrices,
      market_analysis: {
        category_average: marketData.average,
        competitor_range: {
          min: marketData.min,
          max: marketData.max
        },
        recommendation: recommendation
      },
      breakdown: breakdown
    }
  }

  // Simulate AI-powered pricing optimization
  async getAIPricingSuggestion(data: PricingData): Promise<PricingSuggestion> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Add some AI-like adjustments to the basic calculation
    const baseSuggestion = this.calculatePricing(data)

    // AI adjustments based on various factors
    const aiAdjustments = {
      // Adjust based on ingredient complexity
      complexity_bonus: data.ingredients.length > 5 ? 1.1 : 1.0,

      // Adjust based on preparation time efficiency
      time_efficiency: data.preparation_time > 30 ? 0.95 : 1.05,

      // Seasonal/trend adjustments (mock)
      trend_factor: Math.random() * 0.1 + 0.95 // -5% to +5% random adjustment
    }

    const aiMultiplier = aiAdjustments.complexity_bonus * aiAdjustments.time_efficiency * aiAdjustments.trend_factor

    // Apply AI adjustments
    const adjustedPrices = {
      low_margin: Math.round(baseSuggestion.suggested_prices.low_margin * aiMultiplier / 1000) * 1000,
      medium_margin: Math.round(baseSuggestion.suggested_prices.medium_margin * aiMultiplier / 1000) * 1000,
      high_margin: Math.round(baseSuggestion.suggested_prices.high_margin * aiMultiplier / 1000) * 1000,
      premium_margin: Math.round(baseSuggestion.suggested_prices.premium_margin * aiMultiplier / 1000) * 1000
    }

    return {
      ...baseSuggestion,
      suggested_prices: adjustedPrices
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  getRecommendationText(recommendation: PricingSuggestion['market_analysis']['recommendation']): string {
    switch (recommendation) {
      case 'below_market':
        return 'Harga di bawah rata-rata pasar - consider meningkatkan margin'
      case 'market_average':
        return 'Harga sesuai rata-rata pasar - positioning yang baik'
      case 'above_market':
        return 'Harga di atas rata-rata pasar - pastikan value proposition kuat'
      case 'premium':
        return 'Harga premium - cocok untuk positioning eksklusif'
      default:
        return 'Analisis pasar tersedia'
    }
  }

  getRecommendationColor(recommendation: PricingSuggestion['market_analysis']['recommendation']): string {
    switch (recommendation) {
      case 'below_market':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'market_average':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'above_market':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'premium':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }
}

export const pricingService = new PricingService()