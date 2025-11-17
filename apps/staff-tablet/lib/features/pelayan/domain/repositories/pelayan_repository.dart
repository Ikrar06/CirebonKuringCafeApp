import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../entities/order_with_table_entity.dart';
import '../entities/table_entity.dart';

/// Repository interface for waiter operations
abstract class PelayanRepository {
  /// Get all tables
  Future<Either<Failure, List<TableEntity>>> getTables();

  /// Watch tables stream (realtime)
  Stream<Either<Failure, List<TableEntity>>> watchTables();

  /// Update table status
  Future<Either<Failure, TableEntity>> updateTableStatus(String tableId, String status);

  /// Get ready orders for delivery
  Future<Either<Failure, List<OrderWithTableEntity>>> getReadyOrders();

  /// Watch ready orders stream (realtime)
  Stream<Either<Failure, List<OrderWithTableEntity>>> watchReadyOrders();

  /// Mark order as delivered
  Future<Either<Failure, void>> deliverOrder(String orderId);

  /// Get active orders by table
  Future<Either<Failure, List<OrderWithTableEntity>>> getOrdersByTable(String tableId);
}
