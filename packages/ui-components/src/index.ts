// UI components index

// Button components
export {
  Button,
  ButtonGroup,
  IconButton,
  buttonVariants,
  type ButtonProps,
  type ButtonGroupProps,
  type IconButtonProps,
} from './components/Button/Button'

// Card components
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  StatCard,
  FeatureCard,
  cardVariants,
  type CardProps,
  type CardHeaderProps,
  type CardTitleProps,
  type CardDescriptionProps,
  type CardContentProps,
  type CardFooterProps,
  type StatCardProps,
  type FeatureCardProps,
} from './components/Card/Card'

// Modal components
export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  ConfirmationModal,
  modalVariants,
  type ModalProps,
  type ModalHeaderProps,
  type ModalTitleProps,
  type ModalDescriptionProps,
  type ModalContentProps,
  type ModalFooterProps,
  type ConfirmationModalProps,
} from './components/Modal/Modal'

// Table components
export {
  Table,
  tableVariants,
  type TableProps,
  type TableColumn,
} from './components/Table/Table'

// Re-export variant props type
export type { VariantProps } from 'class-variance-authority'
