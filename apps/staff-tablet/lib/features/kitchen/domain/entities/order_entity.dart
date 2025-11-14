import 'package:equatable/equatable.dart';

import 'order_item_entity.dart';

class OrderEntity extends Equatable {
  final String id;
  final String orderNumber;
  final String tableId; // UUID reference to tables
  final String tableNumber; // Display string like "Table 5"
  final List<OrderItemEntity> items;
  final String status; // pending_payment, confirmed, preparing, ready, delivered, completed, cancelled
  final DateTime createdAt;
  final DateTime? confirmedAt;
  final DateTime? preparingAt;
  final DateTime? readyAt;
  final DateTime? deliveredAt;
  final DateTime? completedAt;
  final String? customerNotes;

  const OrderEntity({
    required this.id,
    required this.orderNumber,
    required this.tableId,
    required this.tableNumber,
    required this.items,
    required this.status,
    required this.createdAt,
    this.confirmedAt,
    this.preparingAt,
    this.readyAt,
    this.deliveredAt,
    this.completedAt,
    this.customerNotes,
  });

  // Calculate total preparation time
  int get estimatedPrepTime {
    return items.fold(
      0,
      (sum, item) => sum + (item.menuItem.estimatedPrepTime * item.quantity),
    );
  }

  // Calculate elapsed time since order was created
  Duration get elapsedTime {
    return DateTime.now().difference(createdAt);
  }

  // Check if order is overdue (> estimated prep time)
  bool get isOverdue {
    if (status == 'completed') return false;
    return elapsedTime.inMinutes > estimatedPrepTime;
  }

  @override
  List<Object?> get props => [
        id,
        orderNumber,
        tableId,
        tableNumber,
        items,
        status,
        createdAt,
        confirmedAt,
        preparingAt,
        readyAt,
        deliveredAt,
        completedAt,
        customerNotes,
      ];
}
