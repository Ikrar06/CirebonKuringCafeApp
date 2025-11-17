import 'package:dartz/dartz.dart';

import '../../../../core/errors/exceptions.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/opname_entity.dart';
import '../../domain/entities/stock_item_entity.dart';
import '../../domain/entities/stock_movement_entity.dart';
import '../../domain/entities/supplier_entity.dart';
import '../../domain/repositories/stock_repository.dart';
import '../datasources/stock_local_datasource.dart';
import '../datasources/stock_remote_datasource.dart';
import '../models/opname_model.dart';
import '../models/stock_item_model.dart';
import '../models/stock_movement_model.dart';
import '../models/supplier_model.dart';

class StockRepositoryImpl implements StockRepository {
  final StockRemoteDataSource remoteDataSource;
  final StockLocalDataSource localDataSource;

  StockRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
  });

  // ========== Stock Items ==========

  @override
  Future<Either<Failure, List<StockItemEntity>>> getStockItems() async {
    try {
      final items = await remoteDataSource.getStockItems();
      await localDataSource.cacheStockItems(items);
      return Right(items);
    } on ServerException catch (e) {
      try {
        final cached = await localDataSource.getCachedStockItems();
        if (cached.isNotEmpty) return Right(cached);
      } catch (_) {}
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      try {
        final cached = await localDataSource.getCachedStockItems();
        if (cached.isNotEmpty) return Right(cached);
      } catch (_) {}
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, StockItemEntity>> getStockItemById(String id) async {
    try {
      final item = await remoteDataSource.getStockItemById(id);
      return Right(item);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Stream<Either<Failure, List<StockItemEntity>>> watchStockItems() async* {
    try {
      await for (final items in remoteDataSource.watchStockItems()) {
        await localDataSource.cacheStockItems(items);
        yield Right(items);
      }
    } on ServerException catch (e) {
      yield Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      yield Left(NetworkFailure(e.message));
    } catch (e) {
      yield Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, StockItemEntity>> createStockItem(StockItemEntity item) async {
    try {
      final model = StockItemModel.fromEntity(item);
      final result = await remoteDataSource.createStockItem(model);
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, StockItemEntity>> updateStockItem(StockItemEntity item) async {
    try {
      final model = StockItemModel.fromEntity(item);
      final result = await remoteDataSource.updateStockItem(model);
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteStockItem(String id) async {
    try {
      await remoteDataSource.deleteStockItem(id);
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<StockItemEntity>>> getLowStockItems() async {
    try {
      final items = await remoteDataSource.getLowStockItems();
      return Right(items);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  // ========== Stock Movements ==========

  @override
  Future<Either<Failure, List<StockMovementEntity>>> getStockMovements(String stockItemId) async {
    try {
      final movements = await remoteDataSource.getStockMovements(stockItemId);
      return Right(movements);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<StockMovementEntity>>> getAllStockMovements({
    DateTime? startDate,
    DateTime? endDate,
    String? movementType,
  }) async {
    try {
      final movements = await remoteDataSource.getAllStockMovements(
        startDate: startDate,
        endDate: endDate,
        movementType: movementType,
      );
      return Right(movements);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, StockMovementEntity>> createStockMovement(
    StockMovementEntity movement,
  ) async {
    try {
      final model = StockMovementModel.fromEntity(movement);
      final result = await remoteDataSource.createStockMovement(model);
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Stream<Either<Failure, List<StockMovementEntity>>> watchStockMovements(String stockItemId) async* {
    try {
      await for (final movements in remoteDataSource.watchStockMovements(stockItemId)) {
        yield Right(movements);
      }
    } on ServerException catch (e) {
      yield Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      yield Left(NetworkFailure(e.message));
    } catch (e) {
      yield Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  // ========== Suppliers ==========

  @override
  Future<Either<Failure, List<SupplierEntity>>> getSuppliers() async {
    try {
      final suppliers = await remoteDataSource.getSuppliers();
      return Right(suppliers);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, SupplierEntity>> getSupplierById(String id) async {
    try {
      final supplier = await remoteDataSource.getSupplierById(id);
      return Right(supplier);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, SupplierEntity>> createSupplier(SupplierEntity supplier) async {
    try {
      final model = SupplierModel.fromEntity(supplier);
      final result = await remoteDataSource.createSupplier(model);
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, SupplierEntity>> updateSupplier(SupplierEntity supplier) async {
    try {
      final model = SupplierModel.fromEntity(supplier);
      final result = await remoteDataSource.updateSupplier(model);
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteSupplier(String id) async {
    try {
      await remoteDataSource.deleteSupplier(id);
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<SupplierEntity>>> getActiveSuppliers() async {
    try {
      final suppliers = await remoteDataSource.getActiveSuppliers();
      return Right(suppliers);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  // ========== Stock Opname ==========

  @override
  Future<Either<Failure, List<OpnameEntity>>> getOpnames() async {
    try {
      final opnames = await remoteDataSource.getOpnames();
      return Right(opnames);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, OpnameEntity>> getOpnameById(String id) async {
    try {
      final opname = await remoteDataSource.getOpnameById(id);
      return Right(opname);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, OpnameEntity>> createOpname(OpnameEntity opname) async {
    try {
      final model = OpnameModel.fromEntity(opname);
      final result = await remoteDataSource.createOpname(model);
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, OpnameEntity>> updateOpname(OpnameEntity opname) async {
    try {
      final model = OpnameModel.fromEntity(opname);
      final result = await remoteDataSource.updateOpname(model);
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, OpnameEntity>> completeOpname(String opnameId) async {
    try {
      final result = await remoteDataSource.completeOpname(opnameId);
      return Right(result);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteOpname(String id) async {
    try {
      await remoteDataSource.deleteOpname(id);
      return const Right(null);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }
}
