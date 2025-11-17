import 'package:bcrypt/bcrypt.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/constants/device_types.dart';
import '../../../../core/errors/exceptions.dart';
import '../models/auth_model.dart';
import '../models/device_model.dart';
import '../models/employee_model.dart';

abstract class AuthRemoteDataSource {
  /// Login with device credentials
  Future<AuthModel> deviceLogin({
    required String deviceId,
    required String deviceName,
    required DeviceType deviceType,
  });

  /// Login with employee PIN
  Future<AuthModel> employeeLogin({
    required String pin,
  });

  /// Logout
  Future<void> logout();
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final SupabaseClient supabaseClient;

  AuthRemoteDataSourceImpl(this.supabaseClient);

  @override
  Future<AuthModel> deviceLogin({
    required String deviceId,
    required String deviceName,
    required DeviceType deviceType,
  }) async {
    try {
      print('🔍 Device Login Attempt:');
      print('   Device ID: $deviceId');
      print('   Device Type: ${deviceType.name}');

      // Query device_accounts table
      final response = await supabaseClient
          .from('device_accounts')
          .select()
          .eq('device_code', deviceId)
          .eq('device_type', deviceType.name)
          .maybeSingle();

      print('📦 Response from database: $response');

      if (response == null) {
        // Try to get all devices to debug
        final allDevices = await supabaseClient
            .from('device_accounts')
            .select();
        print('📋 All devices in database: $allDevices');

        throw AuthenticationException('Device not found or invalid device type');
      }

      if (response['is_active'] != true) {
        throw AuthenticationException('Device is not active');
      }

      // Create DeviceModel
      final device = DeviceModel(
        id: response['id'] as String,
        name: response['device_name'] as String,
        type: DeviceType.fromString(response['device_type'] as String?) ?? deviceType,
        isActive: response['is_active'] as bool? ?? true,
        lastLoginAt: DateTime.now().toIso8601String(),
      );

      // Return auth model with device info only (no employee yet)
      // Generate a simple token (in production, this should come from backend)
      final token = 'device_${device.id}_${DateTime.now().millisecondsSinceEpoch}';

      return AuthModel(
        token: token,
        device: device,
        employee: null,
        expiresAt: DateTime.now().add(const Duration(days: 30)),
      );
    } on PostgrestException catch (e) {
      throw ServerException('Database error: ${e.message}');
    } catch (e) {
      if (e is AuthenticationException) rethrow;
      throw ServerException('Failed to login device: ${e.toString()}');
    }
  }

  @override
  Future<AuthModel> employeeLogin({
    required String pin,
  }) async {
    try {
      // Get all active employees
      // We need to fetch all and verify bcrypt on client side
      // since Supabase doesn't support bcrypt functions directly in queries
      final response = await supabaseClient
          .from('employees')
          .select()
          .not('password_hash', 'is', null);

      if (response.isEmpty) {
        throw AuthenticationException('No employees found');
      }

      // Try to find employee with matching PIN using bcrypt
      Map<String, dynamic>? matchedEmployee;

      for (final employee in response) {
        final passwordHash = employee['password_hash'] as String?;
        if (passwordHash != null) {
          try {
            // Verify PIN against bcrypt hash
            if (BCrypt.checkpw(pin, passwordHash)) {
              matchedEmployee = employee;
              break;
            }
          } catch (e) {
            // Continue to next employee if bcrypt check fails
            continue;
          }
        }
      }

      if (matchedEmployee == null) {
        throw AuthenticationException('Invalid PIN');
      }

      // Create EmployeeModel
      final employee = EmployeeModel(
        id: matchedEmployee['id'] as String,
        name: matchedEmployee['full_name'] as String,
        email: matchedEmployee['username'] as String? ?? '',
        phone: matchedEmployee['phone_number'] as String? ?? '',
        role: matchedEmployee['position'] as String,
        isActive: true,
        photoUrl: null,
      );

      // Note: This should merge with existing device info from local storage
      // For now, we create a temporary device (repository should merge this)
      // Generate a simple token
      final token = 'employee_${employee.id}_${DateTime.now().millisecondsSinceEpoch}';

      return AuthModel(
        token: token,
        device: const DeviceModel(
          id: 'temp',
          name: 'Temporary Device',
          type: DeviceType.kasir,
          isActive: true,
        ),
        employee: employee,
        expiresAt: DateTime.now().add(const Duration(hours: 8)),
      );
    } on PostgrestException catch (e) {
      throw ServerException('Database error: ${e.message}');
    } catch (e) {
      if (e is AuthenticationException) rethrow;
      throw ServerException('Failed to login employee: ${e.toString()}');
    }
  }

  @override
  Future<void> logout() async {
    // For now, logout is handled locally
    // Could add session tracking in Supabase if needed
    return;
  }
}
