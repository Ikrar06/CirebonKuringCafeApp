import 'package:dartz/dartz.dart';

import '../../../../core/errors/exceptions.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/order_entity.dart';
import '../../domain/repositories/order_repository.dart';
import '../datasources/order_local_datasource.dart';
import '../datasources/order_remote_datasource.dart';

class OrderRepositoryImpl implements OrderRepository {
  final OrderRemoteDataSource remoteDataSource;
  final OrderLocalDataSource localDataSource;

  OrderRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
  });

  @override
  Future<Either<Failure, List<OrderEntity>>> getActiveOrders() async {
    try {
      final orders = await remoteDataSource.getActiveOrders();

      // Cache the orders
      await localDataSource.cacheOrders(orders);

      return Right(orders);
    } on ServerException catch (e) {
      // Try to get cached orders on error
      try {
        final cachedOrders = await localDataSource.getCachedOrders();
        if (cachedOrders.isNotEmpty) {
          return Right(cachedOrders);
        }
      } catch (_) {}

      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      // Return cached orders on network error
      try {
        final cachedOrders = await localDataSource.getCachedOrders();
        if (cachedOrders.isNotEmpty) {
          return Right(cachedOrders);
        }
      } catch (_) {}

      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, OrderEntity>> getOrderById(String orderId) async {
    try {
      final order = await remoteDataSource.getOrderById(orderId);
      return Right(order);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, OrderEntity>> updateOrderStatus({
    required String orderId,
    required String status,
  }) async {
    try {
      final order = await remoteDataSource.updateOrderStatus(orderId, status);

      // Update cache
      final cachedOrders = await localDataSource.getCachedOrders();
      final updatedOrders = cachedOrders.map((o) {
        return o.id == orderId ? order : o;
      }).toList();
      await localDataSource.cacheOrders(updatedOrders);

      return Right(order);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, OrderEntity>> startOrder(String orderId) async {
    return updateOrderStatus(orderId: orderId, status: 'preparing');
  }

  @override
  Future<Either<Failure, OrderEntity>> markOrderReady(String orderId) async {
    return updateOrderStatus(orderId: orderId, status: 'ready');
  }

  @override
  Future<Either<Failure, void>> bumpOrder(String orderId) async {
    try {
      await remoteDataSource.bumpOrder(orderId);

      // Remove from cache
      final cachedOrders = await localDataSource.getCachedOrders();
      final updatedOrders = cachedOrders.where((o) => o.id != orderId).toList();
      await localDataSource.cacheOrders(updatedOrders);

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
  Stream<List<OrderEntity>> watchOrders() {
    return remoteDataSource.watchOrders();
  }
}
