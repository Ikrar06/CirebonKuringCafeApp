import 'package:equatable/equatable.dart';

import '../../../kitchen/domain/entities/order_entity.dart';
import 'payment_entity.dart';

/// Combined entity for orders with payment information
class OrderWithPaymentEntity extends Equatable {
  final OrderEntity order;
  final PaymentEntity? payment;

  const OrderWithPaymentEntity({
    required this.order,
    this.payment,
  });

  /// Check if payment is pending
  bool get isPendingPayment => payment == null || payment!.status == 'pending';

  /// Check if payment is verified
  bool get isPaymentVerified => payment?.status == 'verified';

  /// Get total amount
  double get totalAmount {
    return order.items.fold(
      0,
      (sum, item) => sum + (item.menuItem.basePrice * item.quantity),
    );
  }

  @override
  List<Object?> get props => [order, payment];
}
