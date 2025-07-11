// src/app/api/integrations/shopify/test/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { shopDomain } = body

    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Shop domain is required' },
        { status: 400 }
      )
    }

    // Test domain processing
    let cleanShopDomain = shopDomain.trim().toLowerCase()
    
    // Log original input
    console.log('Original domain input:', shopDomain)
    
    // Remove common prefixes and suffixes
    cleanShopDomain = cleanShopDomain.replace(/^https?:\/\//, '') // Remove http:// or https://
    cleanShopDomain = cleanShopDomain.replace(/^www\./, '') // Remove www.
    cleanShopDomain = cleanShopDomain.replace(/\.myshopify\.com$/, '') // Remove .myshopify.com
    cleanShopDomain = cleanShopDomain.replace(/\/.*$/, '') // Remove any path after domain
    
    console.log('After basic cleanup:', cleanShopDomain)
    
    // If it's a custom domain, extract the main part
    if (cleanShopDomain.includes('.') && !cleanShopDomain.endsWith('.myshopify.com')) {
      const domainParts = cleanShopDomain.split('.')
      if (domainParts.length >= 2) {
        const originalDomain = cleanShopDomain
        cleanShopDomain = domainParts[domainParts.length - 2] // Get the main domain part
        console.log(`Custom domain ${originalDomain} -> ${cleanShopDomain}`)
      }
    }
    
    console.log('Final processed domain:', cleanShopDomain)
    
    // Validate domain format
    const isValid = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(cleanShopDomain) && cleanShopDomain.length >= 3
    
    return NextResponse.json({
      success: true,
      input: shopDomain,
      processed: cleanShopDomain,
      isValid,
      validationMessage: isValid 
        ? 'Domain format is valid' 
        : 'Domain must be at least 3 characters and contain only letters, numbers, and hyphens',
      steps: [
        { step: 'Original', value: shopDomain },
        { step: 'Trimmed/Lowercased', value: shopDomain.trim().toLowerCase() },
        { step: 'Removed protocols', value: shopDomain.trim().toLowerCase().replace(/^https?:\/\//, '') },
        { step: 'Removed www', value: shopDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '') },
        { step: 'Removed .myshopify.com', value: cleanShopDomain },
        { step: 'Final processed', value: cleanShopDomain }
      ]
    })

  } catch (error) {
    console.error('Test connection error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}   