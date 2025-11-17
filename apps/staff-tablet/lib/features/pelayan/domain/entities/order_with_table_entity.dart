import 'package:equatable/equatable.dart';

import '../../../kitchen/domain/entities/order_entity.dart';
import 'table_entity.dart';

/// Combined entity for orders with table information (for waiter view)
class OrderWithTableEntity extends Equatable {
  final OrderEntity order;
  final TableEntity table;

  const OrderWithTableEntity({
    required this.order,
    required this.table,
  });

  /// Check if order is ready for delivery
  bool get isReadyForDelivery => order.status == 'ready';

  /// Check if order has been delivered
  bool get isDelivered => order.status == 'delivered';

  /// Get table display name
  String get tableDisplay => 'Meja ${table.tableNumber}';

  @override
  List<Object?> get props => [order, table];
}
