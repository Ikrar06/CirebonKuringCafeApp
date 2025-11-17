import 'package:dartz/dartz.dart';

import '../../../../core/errors/failures.dart';
import '../entities/opname_entity.dart';
import '../entities/stock_item_entity.dart';
import '../entities/stock_movement_entity.dart';
import '../entities/supplier_entity.dart';

/// Repository interface for stock management
abstract class StockRepository {
  // ========== Stock Items ==========

  /// Get all stock items
  Future<Either<Failure, List<StockItemEntity>>> getStockItems();

  /// Get stock item by ID
  Future<Either<Failure, StockItemEntity>> getStockItemById(String id);

  /// Watch stock items stream (realtime)
  Stream<Either<Failure, List<StockItemEntity>>> watchStockItems();

  /// Create new stock item
  Future<Either<Failure, StockItemEntity>> createStockItem(StockItemEntity item);

  /// Update stock item
  Future<Either<Failure, StockItemEntity>> updateStockItem(StockItemEntity item);

  /// Delete stock item
  Future<Either<Failure, void>> deleteStockItem(String id);

  /// Get low stock items
  Future<Either<Failure, List<StockItemEntity>>> getLowStockItems();

  // ========== Stock Movements ==========

  /// Get stock movements for an item
  Future<Either<Failure, List<StockMovementEntity>>> getStockMovements(String stockItemId);

  /// Get all stock movements (with optional filters)
  Future<Either<Failure, List<StockMovementEntity>>> getAllStockMovements({
    DateTime? startDate,
    DateTime? endDate,
    String? movementType,
  });

  /// Create stock movement (in/out/adjustment)
  Future<Either<Failure, StockMovementEntity>> createStockMovement(
    StockMovementEntity movement,
  );

  /// Watch stock movements stream
  Stream<Either<Failure, List<StockMovementEntity>>> watchStockMovements(String stockItemId);

  // ========== Suppliers ==========

  /// Get all suppliers
  Future<Either<Failure, List<SupplierEntity>>> getSuppliers();

  /// Get supplier by ID
  Future<Either<Failure, SupplierEntity>> getSupplierById(String id);

  /// Create supplier
  Future<Either<Failure, SupplierEntity>> createSupplier(SupplierEntity supplier);

  /// Update supplier
  Future<Either<Failure, SupplierEntity>> updateSupplier(SupplierEntity supplier);

  /// Delete supplier
  Future<Either<Failure, void>> deleteSupplier(String id);

  /// Get active suppliers only
  Future<Either<Failure, List<SupplierEntity>>> getActiveSuppliers();

  // ========== Stock Opname ==========

  /// Get all stock opnames
  Future<Either<Failure, List<OpnameEntity>>> getOpnames();

  /// Get opname by ID
  Future<Either<Failure, OpnameEntity>> getOpnameById(String id);

  /// Create stock opname
  Future<Either<Failure, OpnameEntity>> createOpname(OpnameEntity opname);

  /// Update stock opname
  Future<Either<Failure, OpnameEntity>> updateOpname(OpnameEntity opname);

  /// Complete stock opname (apply adjustments)
  Future<Either<Failure, OpnameEntity>> completeOpname(String opnameId);

  /// Delete stock opname
  Future<Either<Failure, void>> deleteOpname(String id);
}
