/**
 * Modal Component
 * 
 * Clean, accessible modal component with Google-inspired design
 * Supports different sizes, animations, and proper focus management
 */

import React, { forwardRef, useEffect, useRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { createPortal } from 'react-dom'

// Modal variants for different sizes and styles
const modalVariants = cva(
  // Base modal content styles - clean white container
  [
    'relative bg-white rounded-lg shadow-xl',
    'border border-gray-200',
    'max-h-[90vh] overflow-hidden',
    'transition-all duration-300 ease-out',
  ],
  {
    variants: {
      size: {
        sm: 'w-full max-w-sm',
        md: 'w-full max-w-md',
        lg: 'w-full max-w-lg', 
        xl: 'w-full max-w-xl',
        '2xl': 'w-full max-w-2xl',
        '3xl': 'w-full max-w-3xl',
        '4xl': 'w-full max-w-4xl',
        full: 'w-[95vw] h-[95vh]',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
)

// Overlay animation classes
const overlayVariants = cva(
  [
    'fixed inset-0 bg-black/50 backdrop-blur-sm',
    'transition-opacity duration-300 ease-out',
    'flex items-center justify-center p-4',
    'z-50',
  ],
  {
    variants: {
      state: {
        entering: 'opacity-0',
        entered: 'opacity-100',
        exiting: 'opacity-0',
      },
    },
  }
)

// Modal content animation classes
const contentVariants = cva(
  [],
  {
    variants: {
      state: {
        entering: 'scale-95 opacity-0',
        entered: 'scale-100 opacity-100',
        exiting: 'scale-95 opacity-0',
      },
    },
  }
)

export interface ModalProps extends VariantProps<typeof modalVariants> {
  /**
   * Whether the modal is open
   */
  open: boolean
  /**
   * Callback when modal should close
   */
  onClose: () => void
  /**
   * Modal content
   */
  children: React.ReactNode
  /**
   * Whether to close on overlay click
   */
  closeOnOverlayClick?: boolean
  /**
   * Whether to close on escape key
   */
  closeOnEscape?: boolean
  /**
   * Custom class name for modal container
   */
  className?: string
  /**
   * Custom class name for overlay
   */
  overlayClassName?: string
  /**
   * Portal container (defaults to document.body)
   */
  container?: Element
}

/**
 * Main Modal Component
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  children,
  size,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
  overlayClassName,
  container,
}) => {
  const [animationState, setAnimationState] = React.useState<'entering' | 'entered' | 'exiting'>('entering')
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Handle animation states
  useEffect(() => {
    if (open) {
      setAnimationState('entering')
      // Store currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement
      
      const timer = setTimeout(() => setAnimationState('entered'), 50)
      return () => clearTimeout(timer)
    } else {
      setAnimationState('exiting')
    }
  }, [open])

  // Handle escape key
  useEffect(() => {
    if (!open || !closeOnEscape) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, closeOnEscape, onClose])

  // Focus management
  useEffect(() => {
    if (!open) return

    // Focus the modal when it opens
    const focusModal = () => {
      if (modalRef.current) {
        modalRef.current.focus()
      }
    }

    // Focus trap
    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !modalRef.current) return

      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (!firstElement) return

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    const timer = setTimeout(focusModal, 100)
    document.addEventListener('keydown', handleTabKey)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', handleTabKey)
      
      // Restore focus to previous element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [open])

  // Don't render if not open and animation is complete
  if (!open && animationState === 'exiting') {
    return null
  }

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose()
    }
  }

  const modalContent = (
    <div
      className={overlayVariants({ state: animationState, className: overlayClassName })}
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={modalVariants({ 
          size, 
          className: `${contentVariants({ state: animationState })} ${className || ''}`
        })}
      >
        {children}
      </div>
    </div>
  )

  // Render to portal
  const portalContainer = container || document.body
  return createPortal(modalContent, portalContainer)
}

/**
 * Modal Header Component
 */
export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to show close button
   */
  showClose?: boolean
  /**
   * Close button click handler
   */
  onClose?: () => void
  /**
   * Whether to add bottom border
   */
  bordered?: boolean
}

export const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ 
    className, 
    children,
    showClose = true, 
    onClose,
    bordered = true,
    ...props 
  }, ref) => {
    const borderClass = bordered ? 'border-b border-gray-200' : ''
    
    return (
      <div
        ref={ref}
        className={`flex items-center justify-between p-6 ${borderClass} ${className || ''}`}
        {...props}
      >
        <div className="flex-1">
          {children}
        </div>
        
        {showClose && onClose && (
          <button
            onClick={onClose}
            className="ml-4 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    )
  }
)

ModalHeader.displayName = 'ModalHeader'

/**
 * Modal Title Component
 */
export interface ModalTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6
}

export const ModalTitle = forwardRef<HTMLHeadingElement, ModalTitleProps>(
  ({ className, level = 2, children, ...props }, ref) => {
    const headingProps = {
      ref,
      className: `text-lg font-semibold text-gray-900 ${className || ''}`,
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
        return <h2 {...headingProps} />
    }
  }
)

ModalTitle.displayName = 'ModalTitle'

/**
 * Modal Description Component
 */
export interface ModalDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const ModalDescription = forwardRef<HTMLParagraphElement, ModalDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={`mt-1 text-sm text-gray-600 ${className || ''}`}
      {...props}
    />
  )
)

ModalDescription.displayName = 'ModalDescription'

/**
 * Modal Content Component
 */
export interface ModalContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether content is scrollable
   */
  scrollable?: boolean
}

export const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(
  ({ className, scrollable = true, ...props }, ref) => {
    const scrollClass = scrollable ? 'overflow-y-auto' : 'overflow-hidden'
    
    return (
      <div
        ref={ref}
        className={`px-6 py-4 ${scrollClass} ${className || ''}`}
        {...props}
      />
    )
  }
)

ModalContent.displayName = 'ModalContent'

/**
 * Modal Footer Component
 */
export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to add top border
   */
  bordered?: boolean
  /**
   * Footer alignment
   */
  align?: 'left' | 'center' | 'right' | 'between'
}

export const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ 
    className, 
    bordered = true,
    align = 'right',
    ...props 
  }, ref) => {
    const borderClass = bordered ? 'border-t border-gray-200' : ''
    
    const alignmentClasses = {
      left: 'justify-start',
      center: 'justify-center', 
      right: 'justify-end',
      between: 'justify-between',
    }
    
    return (
      <div
        ref={ref}
        className={`flex items-center gap-3 px-6 py-4 ${borderClass} ${alignmentClasses[align]} ${className || ''}`}
        {...props}
      />
    )
  }
)

ModalFooter.displayName = 'ModalFooter'

/**
 * Confirmation Modal Component
 * Pre-built modal for confirmations with clean Google-style design
 */
export interface ConfirmationModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'primary' | 'danger'
  loading?: boolean
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  loading = false,
}) => {
  const confirmButtonClass = confirmVariant === 'danger'
    ? 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600'
    : 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600'

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>
        <ModalTitle>{title}</ModalTitle>
        {description && (
          <ModalDescription>{description}</ModalDescription>
        )}
      </ModalHeader>
      
      <ModalFooter align="right">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:opacity-50 transition-colors"
        >
          {cancelText}
        </button>
        
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 ${confirmButtonClass}`}
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Processing...
            </span>
          ) : (
            confirmText
          )}
        </button>
      </ModalFooter>
    </Modal>
  )
}

// Export types
export { modalVariants }
export type { VariantProps }