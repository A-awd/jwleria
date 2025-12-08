import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple in-memory rate limiting (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5 // 5 orders per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return false
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true
  }
  
  record.count++
  return false
}

// Validation functions
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

function validateString(str: string, minLength: number, maxLength: number): boolean {
  return typeof str === 'string' && str.trim().length >= minLength && str.trim().length <= maxLength
}

function validatePhone(phone: string | null | undefined): boolean {
  if (!phone) return true // Phone is optional
  const phoneRegex = /^[+]?[\d\s\-()]+$/
  return phoneRegex.test(phone) && phone.length <= 30
}

function validateNumber(num: number): boolean {
  return typeof num === 'number' && !isNaN(num) && num > 0
}

function validateOrderItem(item: any): boolean {
  return (
    typeof item.product_id === 'number' &&
    validateString(item.product_name, 1, 200) &&
    validateString(item.product_brand, 1, 100) &&
    validateNumber(item.unit_price) &&
    typeof item.quantity === 'number' &&
    item.quantity >= 1 &&
    item.quantity <= 100
  )
}

interface OrderRequest {
  customer_email: string
  customer_name: string
  customer_phone?: string
  shipping_address: string
  shipping_city: string
  shipping_postal_code?: string
  shipping_country: string
  currency: string
  total_amount: number
  items: Array<{
    product_id: number
    product_name: string
    product_brand: string
    product_image?: string
    unit_price: number
    quantity: number
  }>
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown'

    // Check rate limit
    if (isRateLimited(clientIP)) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`)
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: OrderRequest = await req.json()
    console.log('Received order request:', { 
      email: body.customer_email, 
      itemCount: body.items?.length,
      total: body.total_amount 
    })

    // Validate required fields
    const validationErrors: string[] = []

    if (!validateEmail(body.customer_email)) {
      validationErrors.push('Invalid email address')
    }
    if (!validateString(body.customer_name, 2, 100)) {
      validationErrors.push('Customer name must be between 2 and 100 characters')
    }
    if (!validatePhone(body.customer_phone)) {
      validationErrors.push('Invalid phone number format')
    }
    if (!validateString(body.shipping_address, 5, 200)) {
      validationErrors.push('Shipping address must be between 5 and 200 characters')
    }
    if (!validateString(body.shipping_city, 2, 100)) {
      validationErrors.push('City must be between 2 and 100 characters')
    }
    if (!validateString(body.shipping_country, 2, 100)) {
      validationErrors.push('Country must be between 2 and 100 characters')
    }
    if (!validateNumber(body.total_amount)) {
      validationErrors.push('Invalid total amount')
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      validationErrors.push('Order must contain at least one item')
    } else if (body.items.length > 50) {
      validationErrors.push('Order cannot contain more than 50 items')
    } else {
      body.items.forEach((item, index) => {
        if (!validateOrderItem(item)) {
          validationErrors.push(`Invalid item at position ${index + 1}`)
        }
      })
    }

    // Verify total amount matches items
    const calculatedTotal = body.items?.reduce(
      (sum, item) => sum + (item.unit_price * item.quantity),
      0
    ) || 0
    
    // Allow small floating point difference
    if (Math.abs(calculatedTotal - body.total_amount) > 0.01) {
      validationErrors.push('Total amount does not match item prices')
    }

    if (validationErrors.length > 0) {
      console.log('Validation errors:', validationErrors)
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validationErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role key for backend operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_email: body.customer_email.trim().toLowerCase(),
        customer_name: body.customer_name.trim(),
        customer_phone: body.customer_phone?.trim() || null,
        shipping_address: body.shipping_address.trim(),
        shipping_city: body.shipping_city.trim(),
        shipping_postal_code: body.shipping_postal_code?.trim() || null,
        shipping_country: body.shipping_country.trim(),
        currency: body.currency || 'EUR',
        total_amount: body.total_amount,
        status: 'pending',
      })
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Order created:', order.id, order.order_number)

    // Create order items
    const orderItems = body.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name.trim(),
      product_brand: item.product_brand.trim(),
      product_image: item.product_image || null,
      unit_price: item.unit_price,
      quantity: item.quantity,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Error creating order items:', itemsError)
      // Still return success since order was created
    }

    // Create initial status history entry
    const { error: historyError } = await supabase
      .from('order_status_history')
      .insert({
        order_id: order.id,
        status: 'pending',
        notes: 'Order created',
      })

    if (historyError) {
      console.error('Error creating status history:', historyError)
    }

    console.log('Order completed successfully:', order.order_number)

    return new Response(
      JSON.stringify({
        success: true,
        order_number: order.order_number,
        order_id: order.id,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
