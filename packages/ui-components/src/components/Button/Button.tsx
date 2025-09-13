/**
 * Button Component
 * 
 * Reusable button component with clean, minimalist Google-inspired design
 * Supports multiple variants, sizes, and states
 */

import React, { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

// Button variants using class-variance-authority for clean variant management
const buttonVariants = cva(
  // Base styles - clean, minimalist foundation
  [
    'inline-flex items-center justify-center rounded-md text-sm font-medium',
    'transition-all duration-200 ease-in-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]', // Subtle press feedback
  ],
  {
    variants: {
      variant: {
        // Primary - Google Blue
        primary: [
          'bg-blue-600 text-white shadow-sm',
          'hover:bg-blue-700',
          'focus-visible:ring-blue-600',
        ],
        // Secondary - Clean white with subtle border
        secondary: [
          'bg-white text-gray-900 border border-gray-200 shadow-sm',
          'hover:bg-gray-50 hover:border-gray-300',
          'focus-visible:ring-gray-600',
        ],
        // Success - Google Green
        success: [
          'bg-green-600 text-white shadow-sm',
          'hover:bg-green-700',
          'focus-visible:ring-green-600',
        ],
        // Danger - Google Red
        danger: [
          'bg-red-600 text-white shadow-sm',
          'hover:bg-red-700',
          'focus-visible:ring-red-600',
        ],
        // Warning - Google Yellow with dark text for accessibility
        warning: [
          'bg-yellow-400 text-gray-900 shadow-sm',
          'hover:bg-yellow-500',
          'focus-visible:ring-yellow-500',
        ],
        // Ghost - Minimal, text-only
        ghost: [
          'bg-transparent text-gray-700',
          'hover:bg-gray-100',
          'focus-visible:ring-gray-600',
        ],
        // Outline variants with Google colors
        'outline-primary': [
          'bg-white text-blue-600 border border-blue-200',
          'hover:bg-blue-50 hover:border-blue-300',
          'focus-visible:ring-blue-600',
        ],
        'outline-success': [
          'bg-white text-green-600 border border-green-200',
          'hover:bg-green-50 hover:border-green-300',
          'focus-visible:ring-green-600',
        ],
        'outline-danger': [
          'bg-white text-red-600 border border-red-200',
          'hover:bg-red-50 hover:border-red-300',
          'focus-visible:ring-red-600',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-10 px-6 text-base',
        xl: 'h-11 px-8 text-base',
        icon: 'h-9 w-9', // Square button for icons
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

// TypeScript interface for component props
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Loading state - shows spinner and disables interaction
   */
  loading?: boolean
  /**
   * Icon to display before text content
   */
  leftIcon?: React.ReactNode
  /**
   * Icon to display after text content
   */
  rightIcon?: React.ReactNode
  /**
   * Makes button full width
   */
  fullWidth?: boolean
}

/**
 * Loading Spinner Component
 * Clean, minimal spinner matching Google's design language
 */
const LoadingSpinner = ({ className }: { className?: string }) => (
  <svg
    className={`animate-spin -ml-1 mr-2 h-4 w-4 ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

/**
 * Button Component
 * 
 * @example
 * // Primary button
 * <Button>Save Changes</Button>
 * 
 * @example
 * // Button with icon and loading state
 * <Button 
 *   variant="success" 
 *   leftIcon={<CheckIcon />} 
 *   loading={isSubmitting}
 * >
 *   Submit Order
 * </Button>
 * 
 * @example
 * // Outline danger button
 * <Button variant="outline-danger" size="sm">
 *   Delete Item
 * </Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={buttonVariants({ variant, size, fullWidth, className })}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {/* Loading spinner - only show when loading */}
        {loading && <LoadingSpinner />}
        
        {/* Left icon - only show when not loading */}
        {!loading && leftIcon && (
          <span className="mr-2 flex items-center">{leftIcon}</span>
        )}
        
        {/* Button content */}
        {children && <span>{children}</span>}
        
        {/* Right icon - only show when not loading */}
        {!loading && rightIcon && (
          <span className="ml-2 flex items-center">{rightIcon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

/**
 * Button Group Component
 * For grouping related buttons together with clean visual connection
 */
export interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
  /**
   * Orientation of button group
   */
  orientation?: 'horizontal' | 'vertical'
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  className,
  orientation = 'horizontal',
}) => {
  const baseClasses = 'flex'
  const orientationClasses = {
    horizontal: 'flex-row',
    vertical: 'flex-col',
  }

  return (
    <div
      className={`${baseClasses} ${orientationClasses[orientation]} ${className || ''}`}
      role="group"
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          const isFirst = index === 0
          const isLast = index === React.Children.count(children) - 1
          
          // Apply group styling for seamless connection
          const groupClasses = orientation === 'horizontal'
            ? `${!isFirst ? '-ml-px' : ''} ${!isFirst && !isLast ? 'rounded-none' : ''} ${
                isFirst ? 'rounded-r-none' : isLast ? 'rounded-l-none' : ''
              }`
            : `${!isFirst ? '-mt-px' : ''} ${!isFirst && !isLast ? 'rounded-none' : ''} ${
                isFirst ? 'rounded-b-none' : isLast ? 'rounded-t-none' : ''
              }`

          return React.cloneElement(child as React.ReactElement<any>, {
            className: `${(child as React.ReactElement<any>).props.className || ''} ${groupClasses}`.trim(),
          })
        }
        return child
      })}
    </div>
  )
}

/**
 * Icon Button Component
 * Specialized button for icon-only usage
 */
export interface IconButtonProps
  extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  /**
   * Icon to display
   */
  icon: React.ReactNode
  /**
   * Accessible label for screen readers
   */
  'aria-label': string
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, size = 'icon', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size={size}
        className={className}
        {...props}
      >
        {icon}
      </Button>
    )
  }
)

IconButton.displayName = 'IconButton'

// Export types for external usage
export type { VariantProps }
export { buttonVariants }