/**
 * Card Component
 * 
 * Clean, minimalist card component with Google-inspired design
 * Provides consistent container styling across the application
 */

import React, { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

// Card variants for different use cases
const cardVariants = cva(
  // Base styles - clean white card with subtle shadow
  [
    'rounded-lg bg-white transition-all duration-200',
    'border border-gray-200',
  ],
  {
    variants: {
      variant: {
        // Default - subtle shadow
        default: 'shadow-sm hover:shadow-md',
        // Elevated - more prominent shadow
        elevated: 'shadow-md hover:shadow-lg',
        // Flat - no shadow, just border
        flat: 'shadow-none',
        // Interactive - for clickable cards
        interactive: [
          'shadow-sm hover:shadow-md cursor-pointer',
          'hover:border-gray-300 active:scale-[0.99]',
        ],
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
)

// Card component props
export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

/**
 * Main Card Component
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cardVariants({ variant, padding, className })}
        {...props}
      />
    )
  }
)

Card.displayName = 'Card'

/**
 * Card Header Component
 * For card titles, actions, and metadata
 */
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to add bottom border
   */
  bordered?: boolean
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, bordered = false, ...props }, ref) => {
    const borderClass = bordered ? 'border-b border-gray-200 pb-4' : ''
    
    return (
      <div
        ref={ref}
        className={`flex items-center justify-between space-y-1.5 ${borderClass} ${className || ''}`}
        {...props}
      />
    )
  }
)

CardHeader.displayName = 'CardHeader'

/**
 * Card Title Component
 */
export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /**
   * Heading level
   */
  level?: 1 | 2 | 3 | 4 | 5 | 6
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, level = 3, children, ...props }, ref) => {
    const sizeClasses = {
      1: 'text-2xl font-bold',
      2: 'text-xl font-bold',
      3: 'text-lg font-semibold',
      4: 'text-base font-semibold',
      5: 'text-sm font-semibold',
      6: 'text-xs font-semibold',
    }
    
    const headingProps = {
      ref,
      className: `text-gray-900 leading-none tracking-tight ${sizeClasses[level]} ${className || ''}`,
      ...props,
      children,
    }
    
    switch (level) {
      case 1:
        return <h1 {...headingProps} />
      case 2:
        return <h2 {...headingProps} />
      case 3:
        return <h3 {...headingProps} />
      case 4:
        return <h4 {...headingProps} />
      case 5:
        return <h5 {...headingProps} />
      case 6:
        return <h6 {...headingProps} />
      default:
        return <h3 {...headingProps} />
    }
  }
)

CardTitle.displayName = 'CardTitle'

/**
 * Card Description Component
 */
export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={`text-sm text-gray-600 ${className || ''}`}
      {...props}
    />
  )
)

CardDescription.displayName = 'CardDescription'

/**
 * Card Content Component
 */
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Add top spacing when used with header
   */
  spaced?: boolean
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, spaced = false, ...props }, ref) => {
    const spacingClass = spaced ? 'pt-4' : ''
    
    return (
      <div
        ref={ref}
        className={`${spacingClass} ${className || ''}`}
        {...props}
      />
    )
  }
)

CardContent.displayName = 'CardContent'

/**
 * Card Footer Component
 */
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to add top border
   */
  bordered?: boolean
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, bordered = false, ...props }, ref) => {
    const borderClass = bordered ? 'border-t border-gray-200 pt-4' : ''
    
    return (
      <div
        ref={ref}
        className={`flex items-center ${borderClass} ${className || ''}`}
        {...props}
      />
    )
  }
)

CardFooter.displayName = 'CardFooter'

/**
 * Stat Card Component
 * Specialized card for displaying metrics with clean styling
 */
export interface StatCardProps extends Omit<CardProps, 'children'> {
  /**
   * Main metric value
   */
  value: string | number
  /**
   * Label for the metric
   */
  label: string
  /**
   * Optional description or subtitle
   */
  description?: string
  /**
   * Icon to display
   */
  icon?: React.ReactNode
  /**
   * Trend indicator
   */
  trend?: {
    value: number
    direction: 'up' | 'down'
    isPositive?: boolean
  }
  /**
   * Color theme using Google colors
   */
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray'
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ 
    value, 
    label, 
    description, 
    icon, 
    trend, 
    color = 'gray',
    className,
    ...props 
  }, ref) => {
    const colorClasses = {
      blue: 'text-blue-600 bg-blue-50 border-blue-200',
      green: 'text-green-600 bg-green-50 border-green-200',
      red: 'text-red-600 bg-red-50 border-red-200',
      yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      gray: 'text-gray-600 bg-gray-50 border-gray-200',
    }

    const trendClasses = trend?.isPositive !== false 
      ? trend?.direction === 'up' ? 'text-green-600' : 'text-red-600'
      : trend?.direction === 'up' ? 'text-red-600' : 'text-green-600'

    return (
      <Card ref={ref} className={className} {...props}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              {icon && (
                <div className={`p-2 rounded-md ${colorClasses[color]}`}>
                  {icon}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-600">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                {description && (
                  <p className="text-xs text-gray-500 mt-1">{description}</p>
                )}
              </div>
            </div>
          </div>
          
          {trend && (
            <div className={`flex items-center text-sm ${trendClasses}`}>
              <span className="mr-1">
                {trend.direction === 'up' ? '↗' : '↙'}
              </span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
      </Card>
    )
  }
)

StatCard.displayName = 'StatCard'

/**
 * Feature Card Component
 * For showcasing features, services, or menu items
 */
export interface FeatureCardProps extends Omit<CardProps, 'children'> {
  /**
   * Card title
   */
  title: string
  /**
   * Card description
   */
  description?: string
  /**
   * Image source
   */
  image?: string
  /**
   * Image alt text
   */
  imageAlt?: string
  /**
   * Action button props
   */
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }
  /**
   * Badge/tag content
   */
  badge?: string
  /**
   * Price information
   */
  price?: string
}

export const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ 
    title, 
    description, 
    image, 
    imageAlt,
    action,
    badge,
    price,
    className,
    ...props 
  }, ref) => {
    return (
      <Card 
        ref={ref} 
        variant="interactive"
        padding="none"
        className={className}
        {...props}
      >
        {image && (
          <div className="aspect-video w-full overflow-hidden rounded-t-lg">
            <img
              src={image}
              alt={imageAlt || title}
              className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
            />
          </div>
        )}
        
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <CardTitle level={4}>{title}</CardTitle>
                {badge && (
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                    {badge}
                  </span>
                )}
              </div>
              
              {description && (
                <CardDescription className="mt-1">
                  {description}
                </CardDescription>
              )}
            </div>
            
            {price && (
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{price}</p>
              </div>
            )}
          </div>
          
          {action && (
            <div className="mt-4">
              <button
                onClick={action.onClick}
                className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  action.variant === 'primary'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {action.label}
              </button>
            </div>
          )}
        </div>
      </Card>
    )
  }
)

FeatureCard.displayName = 'FeatureCard'

// Export types
export { cardVariants }
export type { VariantProps }