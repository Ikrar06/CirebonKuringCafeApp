import '../../config/injection.dart';
import '../../features/auth/domain/usecases/get_current_auth_usecase.dart';
import '../usecases/usecase.dart';

/// Helper class for authentication-related utilities
class AuthHelper {
  /// Get the current logged-in employee ID
  ///
  /// Returns the employee ID from the current auth session.
  /// Returns 'system' as fallback if no employee is logged in.
  static Future<String> getCurrentEmployeeId() async {
    try {
      final getCurrentAuthUseCase = sl<GetCurrentAuthUseCase>();

      // Get current auth from the use case
      final result = await getCurrentAuthUseCase(NoParams());

      return result.fold(
        (failure) => 'system', // Return 'system' on failure
        (authEntity) {
          // If employee is logged in, return their ID
          if (authEntity != null && authEntity.employee != null) {
            return authEntity.employee!.id;
          }
          // Fallback to 'system' if no employee is logged in
          return 'system';
        },
      );
    } catch (e) {
      // If anything fails, return 'system' as safe fallback
      return 'system';
    }
  }

  /// Get the current employee name
  ///
  /// Returns the employee name from the current auth session.
  /// Returns 'System' if no employee is logged in.
  static Future<String> getCurrentEmployeeName() async {
    try {
      final getCurrentAuthUseCase = sl<GetCurrentAuthUseCase>();
      final result = await getCurrentAuthUseCase(NoParams());

      return result.fold(
        (failure) => 'System',
        (authEntity) => authEntity?.employee?.name ?? 'System',
      );
    } catch (e) {
      return 'System';
    }
  }

  /// Check if an employee is currently logged in
  static Future<bool> isEmployeeLoggedIn() async {
    try {
      final getCurrentAuthUseCase = sl<GetCurrentAuthUseCase>();
      final result = await getCurrentAuthUseCase(NoParams());

      return result.fold(
        (failure) => false,
        (authEntity) => authEntity?.employee != null,
      );
    } catch (e) {
      return false;
    }
  }

  /// Get the current device ID
  static Future<String?> getDeviceId() async {
    try {
      final getCurrentAuthUseCase = sl<GetCurrentAuthUseCase>();
      final result = await getCurrentAuthUseCase(NoParams());

      return result.fold(
        (failure) => null,
        (authEntity) => authEntity?.device.id,
      );
    } catch (e) {
      return null;
    }
  }

  /// Get the current device type
  static Future<String?> getDeviceType() async {
    try {
      final getCurrentAuthUseCase = sl<GetCurrentAuthUseCase>();
      final result = await getCurrentAuthUseCase(NoParams());

      return result.fold(
        (failure) => null,
        (authEntity) => authEntity?.device.type.name,
      );
    } catch (e) {
      return null;
    }
  }
}
