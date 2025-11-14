import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../entities/order_entity.dart';

abstract class OrderRepository {
  /// Get all active orders for kitchen
  /// Status: new, preparing
  Future<Either<Failure, List<OrderEntity>>> getActiveOrders();

  /// Get order by ID
  Future<Either<Failure, OrderEntity>> getOrderById(String orderId);

  /// Update order status
  /// Possible transitions:
  /// - new -> preparing
  /// - preparing -> ready
  /// - ready -> completed (bump)
  Future<Either<Failure, OrderEntity>> updateOrderStatus({
    required String orderId,
    required String status,
  });

  /// Start preparing an order (new -> preparing)
  Future<Either<Failure, OrderEntity>> startOrder(String orderId);

  /// Mark order as ready (preparing -> ready)
  Future<Either<Failure, OrderEntity>> markOrderReady(String orderId);

  /// Bump order (ready -> completed)
  Future<Either<Failure, void>> bumpOrder(String orderId);

  /// Stream of real-time order updates
  Stream<List<OrderEntity>> watchOrders();
}
