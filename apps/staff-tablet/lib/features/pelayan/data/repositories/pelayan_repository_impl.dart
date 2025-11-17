import 'package:dartz/dartz.dart';

import '../../../../core/errors/exceptions.dart';
import '../../../../core/errors/failures.dart';
import '../../../kitchen/data/models/order_model.dart';
import '../../domain/entities/order_with_table_entity.dart';
import '../../domain/entities/table_entity.dart';
import '../../domain/repositories/pelayan_repository.dart';
import '../datasources/pelayan_local_datasource.dart';
import '../datasources/pelayan_remote_datasource.dart';
import '../models/table_model.dart';

class PelayanRepositoryImpl implements PelayanRepository {
  final PelayanRemoteDataSource remoteDataSource;
  final PelayanLocalDataSource localDataSource;

  PelayanRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
  });

  @override
  Future<Either<Failure, List<TableEntity>>> getTables() async {
    try {
      final tables = await remoteDataSource.getTables();
      await localDataSource.cacheTables(tables);
      return Right(tables);
    } on ServerException catch (e) {
      try {
        final cached = await localDataSource.getCachedTables();
        if (cached.isNotEmpty) return Right(cached);
      } catch (_) {}
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      try {
        final cached = await localDataSource.getCachedTables();
        if (cached.isNotEmpty) return Right(cached);
      } catch (_) {}
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Stream<Either<Failure, List<TableEntity>>> watchTables() async* {
    try {
      await for (final tables in remoteDataSource.watchTables()) {
        await localDataSource.cacheTables(tables);
        yield Right(tables);
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
  Future<Either<Failure, TableEntity>> updateTableStatus(String tableId, String status) async {
    try {
      final table = await remoteDataSource.updateTableStatus(tableId, status);
      return Right(table);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, List<OrderWithTableEntity>>> getReadyOrders() async {
    try {
      final ordersData = await remoteDataSource.getReadyOrders();
      final orders = ordersData.map((data) => _mapToOrderWithTable(data)).toList();
      return Right(orders);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Stream<Either<Failure, List<OrderWithTableEntity>>> watchReadyOrders() async* {
    try {
      await for (final ordersData in remoteDataSource.watchReadyOrders()) {
        final orders = ordersData.map((data) => _mapToOrderWithTable(data)).toList();
        yield Right(orders);
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
  Future<Either<Failure, void>> deliverOrder(String orderId) async {
    try {
      await remoteDataSource.deliverOrder(orderId);
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
  Future<Either<Failure, List<OrderWithTableEntity>>> getOrdersByTable(String tableId) async {
    return Left(ServerFailure('Not implemented'));
  }

  OrderWithTableEntity _mapToOrderWithTable(Map<String, dynamic> data) {
    final order = OrderModel.fromJson(data);
    final table = TableModel.fromJson(data['table'] as Map<String, dynamic>);
    return OrderWithTableEntity(order: order, table: table);
  }
}
