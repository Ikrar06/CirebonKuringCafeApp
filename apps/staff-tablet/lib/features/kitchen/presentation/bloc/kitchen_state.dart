import 'package:equatable/equatable.dart';

import '../../domain/entities/order_entity.dart';

abstract class KitchenState extends Equatable {
  const KitchenState();

  @override
  List<Object?> get props => [];
}

/// Initial state
class KitchenInitial extends KitchenState {
  const KitchenInitial();
}

/// Loading state
class KitchenLoading extends KitchenState {
  const KitchenLoading();
}

/// Orders loaded successfully
class KitchenLoaded extends KitchenState {
  final List<OrderEntity> orders;
  final DateTime lastUpdated;

  const KitchenLoaded({
    required this.orders,
    required this.lastUpdated,
  });

  // Separate orders by status for display
  List<OrderEntity> get confirmedOrders =>
      orders.where((o) => o.status == 'confirmed').toList();

  List<OrderEntity> get preparingOrders =>
      orders.where((o) => o.status == 'preparing').toList();

  List<OrderEntity> get readyOrders =>
      orders.where((o) => o.status == 'ready').toList();

  // Sort orders by creation time (older first = FIFO)
  List<OrderEntity> getSortedOrders() {
    final sorted = List<OrderEntity>.from(orders);
    sorted.sort((a, b) {
      // Sort by creation time - older orders first (FIFO)
      return a.createdAt.compareTo(b.createdAt);
    });
    return sorted;
  }

  @override
  List<Object> get props => [orders, lastUpdated];

  KitchenLoaded copyWith({
    List<OrderEntity>? orders,
    DateTime? lastUpdated,
  }) {
    return KitchenLoaded(
      orders: orders ?? this.orders,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }
}

/// Order update in progress
class KitchenUpdating extends KitchenState {
  final List<OrderEntity> orders;
  final String updatingOrderId;

  const KitchenUpdating({
    required this.orders,
    required this.updatingOrderId,
  });

  @override
  List<Object> get props => [orders, updatingOrderId];
}

/// Error state
class KitchenError extends KitchenState {
  final String message;
  final List<OrderEntity>? orders; // Keep previous orders on error

  const KitchenError({
    required this.message,
    this.orders,
  });

  @override
  List<Object?> get props => [message, orders];
}
