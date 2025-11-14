import 'package:dartz/dartz.dart';

import '../../../../core/constants/device_types.dart';
import '../../../../core/errors/exceptions.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/auth_entity.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_local_datasource.dart';
import '../datasources/auth_remote_datasource.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;
  final AuthLocalDataSource localDataSource;

  AuthRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
  });

  @override
  Future<Either<Failure, AuthEntity>> deviceLogin({
    required String deviceId,
    required String deviceName,
    required DeviceType deviceType,
  }) async {
    try {
      final authModel = await remoteDataSource.deviceLogin(
        deviceId: deviceId,
        deviceName: deviceName,
        deviceType: deviceType,
      );

      // Cache the auth data
      await localDataSource.cacheAuth(authModel);

      return Right(authModel);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } on AuthenticationException catch (e) {
      return Left(AuthenticationFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, AuthEntity>> employeeLogin({
    required String pin,
  }) async {
    try {
      final authModel = await remoteDataSource.employeeLogin(pin: pin);

      // Update cached auth with employee data
      await localDataSource.cacheAuth(authModel);

      return Right(authModel);
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      return Left(NetworkFailure(e.message));
    } on AuthenticationException catch (e) {
      return Left(AuthenticationFailure(e.message));
    } on ValidationException catch (e) {
      return Left(ValidationFailure(e.message));
    } catch (e) {
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, void>> logout() async {
    try {
      // Call remote logout
      await remoteDataSource.logout();

      // Clear local cache
      await localDataSource.clearAuth();

      return const Right(null);
    } on ServerException catch (e) {
      // Even if remote logout fails, clear local cache
      await localDataSource.clearAuth();
      return Left(ServerFailure(e.message));
    } on NetworkException catch (e) {
      // Clear local cache even without network
      await localDataSource.clearAuth();
      return Left(NetworkFailure(e.message));
    } catch (e) {
      await localDataSource.clearAuth();
      return Left(ServerFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, AuthEntity?>> getCurrentAuth() async {
    try {
      final authModel = await localDataSource.getCachedAuth();
      return Right(authModel);
    } on CacheException catch (e) {
      return Left(CacheFailure(e.message));
    } catch (e) {
      return Left(CacheFailure('Unexpected error: ${e.toString()}'));
    }
  }

  @override
  Future<Either<Failure, bool>> isDeviceLoggedIn() async {
    try {
      final isLoggedIn = await localDataSource.isDeviceLoggedIn();
      return Right(isLoggedIn);
    } catch (e) {
      return Left(CacheFailure('Failed to check device login status'));
    }
  }

  @override
  Future<Either<Failure, bool>> isEmployeeLoggedIn() async {
    try {
      final isLoggedIn = await localDataSource.isEmployeeLoggedIn();
      return Right(isLoggedIn);
    } catch (e) {
      return Left(CacheFailure('Failed to check employee login status'));
    }
  }
}
