import 'package:equatable/equatable.dart';

abstract class KitchenEvent extends Equatable {
  const KitchenEvent();

  @override
  List<Object?> get props => [];
}

/// Load active orders
class LoadActiveOrdersEvent extends KitchenEvent {
  const LoadActiveOrdersEvent();
}

/// Watch orders (real-time updates)
class WatchOrdersEvent extends KitchenEvent {
  const WatchOrdersEvent();
}

/// Orders updated from stream
class OrdersUpdatedEvent extends KitchenEvent {
  final List<dynamic> orders; // List<OrderEntity>

  const OrdersUpdatedEvent(this.orders);

  @override
  List<Object> get props => [orders];
}

/// Start preparing an order
class StartOrderEvent extends KitchenEvent {
  final String orderId;

  const StartOrderEvent(this.orderId);

  @override
  List<Object> get props => [orderId];
}

/// Mark order as ready
class MarkOrderReadyEvent extends KitchenEvent {
  final String orderId;

  const MarkOrderReadyEvent(this.orderId);

  @override
  List<Object> get props => [orderId];
}

/// Bump order (complete and remove from screen)
class BumpOrderEvent extends KitchenEvent {
  final String orderId;

  const BumpOrderEvent(this.orderId);

  @override
  List<Object> get props => [orderId];
}

/// Update order status (generic)
class UpdateOrderStatusEvent extends KitchenEvent {
  final String orderId;
  final String status;

  const UpdateOrderStatusEvent({
    required this.orderId,
    required this.status,
  });

  @override
  List<Object> get props => [orderId, status];
}
