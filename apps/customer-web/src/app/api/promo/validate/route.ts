import { NextRequest, NextResponse } from 'next/server'

// Mock promo codes data
const MOCK_PROMO_CODES = {
  'WELCOME10': {
    code: 'WELCOME10',
    name: 'Selamat Datang',
    description: 'Diskon 10% untuk pelanggan baru',
    discount_type: 'percentage' as const,
    discount_value: 10,
    minimum_order: 0,
    maximum_discount: 50000,
    valid_until: '2024-12-31T23:59:59.000Z',
    terms_conditions: [
      'Berlaku untuk pemesanan pertama',
      'Tidak dapat digabung dengan promo lain'
    ]
  },
  'HEMAT25': {
    code: 'HEMAT25',
    name: 'Hemat Istimewa',
    description: 'Diskon Rp 25.000 min. pembelian Rp 100.000',
    discount_type: 'fixed' as const,
    discount_value: 25000,
    minimum_order: 100000,
    maximum_discount: 25000,
    valid_until: '2024-12-31T23:59:59.000Z',
    terms_conditions: [
      'Minimum pembelian Rp 100.000',
      'Berlaku untuk semua menu'
    ]
  },
  'MAKAN15': {
    code: 'MAKAN15',
    name: 'Makan Hemat',
    description: 'Diskon 15% min. pembelian Rp 50.000',
    discount_type: 'percentage' as const,
    discount_value: 15,
    minimum_order: 50000,
    maximum_discount: 75000,
    valid_until: '2024-12-31T23:59:59.000Z',
    terms_conditions: [
      'Minimum pembelian Rp 50.000',
      'Maksimal diskon Rp 75.000'
    ]
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, order_total } = body

    // Validate input
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        {
          valid: false,
          message: 'Kode promo tidak valid',
          discount_amount: 0,
          final_total: order_total
        },
        { status: 400 }
      )
    }

    if (!order_total || typeof order_total !== 'number') {
      return NextResponse.json(
        {
          valid: false,
          message: 'Total pesanan tidak valid',
          discount_amount: 0,
          final_total: 0
        },
        { status: 400 }
      )
    }

    const promoCode = code.toUpperCase().trim()
    const promo = MOCK_PROMO_CODES[promoCode as keyof typeof MOCK_PROMO_CODES]

    // Check if promo code exists
    if (!promo) {
      return NextResponse.json({
        valid: false,
        message: 'Kode promo tidak ditemukan',
        discount_amount: 0,
        final_total: order_total
      })
    }

    // Check minimum order requirement
    if (order_total < promo.minimum_order) {
      return NextResponse.json({
        valid: false,
        message: `Minimum pemesanan Rp ${promo.minimum_order.toLocaleString('id-ID')}`,
        discount_amount: 0,
        final_total: order_total
      })
    }

    // Calculate discount
    let discount_amount = 0
    if (promo.discount_type === 'percentage') {
      discount_amount = Math.round(order_total * (promo.discount_value / 100))
      // Apply maximum discount cap
      if (promo.maximum_discount && discount_amount > promo.maximum_discount) {
        discount_amount = promo.maximum_discount
      }
    } else if (promo.discount_type === 'fixed') {
      discount_amount = promo.discount_value
      // Discount cannot exceed order total
      if (discount_amount > order_total) {
        discount_amount = order_total
      }
    }

    const final_total = Math.max(0, order_total - discount_amount)

    // Return success response
    return NextResponse.json({
      valid: true,
      message: `Promo ${promo.name} berhasil diterapkan!`,
      discount_amount,
      discount_percentage: promo.discount_type === 'percentage' ? promo.discount_value : undefined,
      final_total,
      promo_data: {
        ...promo,
        discount_amount
      }
    })

  } catch (error) {
    console.error('Error validating promo code:', error)
    return NextResponse.json(
      {
        valid: false,
        message: 'Terjadi kesalahan sistem',
        discount_amount: 0,
        final_total: 0
      },
      { status: 500 }
    )
  }
}

// Handle GET requests (optional - for listing available promos)
export async function GET() {
  try {
    const availablePromos = Object.values(MOCK_PROMO_CODES).map(promo => ({
      code: promo.code,
      name: promo.name,
      description: promo.description,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      minimum_order: promo.minimum_order,
      valid_until: promo.valid_until
    }))

    return NextResponse.json({
      success: true,
      data: availablePromos
    })
  } catch (error) {
    console.error('Error fetching promo codes:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Terjadi kesalahan sistem'
      },
      { status: 500 }
    )
  }
}