import 'package:dartz/dartz.dart';

import '../../../../core/constants/device_types.dart';
import '../../../../core/errors/failures.dart';
import '../entities/auth_entity.dart';

abstract class AuthRepository {
  /// Login with device credentials
  /// Returns AuthEntity with device info only (no employee)
  Future<Either<Failure, AuthEntity>> deviceLogin({
    required String deviceId,
    required String deviceName,
    required DeviceType deviceType,
  });

  /// Login with employee PIN
  /// Returns AuthEntity with both device and employee info
  Future<Either<Failure, AuthEntity>> employeeLogin({
    required String pin,
  });

  /// Logout and clear stored credentials
  Future<Either<Failure, void>> logout();

  /// Get current auth state from local storage
  Future<Either<Failure, AuthEntity?>> getCurrentAuth();

  /// Check if device is already logged in
  Future<Either<Failure, bool>> isDeviceLoggedIn();

  /// Check if employee is logged in
  Future<Either<Failure, bool>> isEmployeeLoggedIn();
}
