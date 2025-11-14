import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/errors/exceptions.dart';
import '../models/auth_model.dart';

abstract class AuthLocalDataSource {
  /// Get cached auth data
  Future<AuthModel?> getCachedAuth();

  /// Cache auth data
  Future<void> cacheAuth(AuthModel auth);

  /// Clear cached auth data
  Future<void> clearAuth();

  /// Check if device is logged in
  Future<bool> isDeviceLoggedIn();

  /// Check if employee is logged in
  Future<bool> isEmployeeLoggedIn();
}

class AuthLocalDataSourceImpl implements AuthLocalDataSource {
  final SharedPreferences sharedPreferences;

  static const String _keyAuth = 'CACHED_AUTH';
  static const String _keyAuthToken = 'AUTH_TOKEN';
  static const String _keyDeviceId = 'DEVICE_ID';
  static const String _keyEmployeeId = 'EMPLOYEE_ID';

  AuthLocalDataSourceImpl(this.sharedPreferences);

  @override
  Future<AuthModel?> getCachedAuth() async {
    try {
      final jsonString = sharedPreferences.getString(_keyAuth);
      if (jsonString == null) return null;

      final jsonMap = json.decode(jsonString) as Map<String, dynamic>;
      return AuthModel.fromJson(jsonMap);
    } catch (e) {
      throw CacheException('Failed to get cached auth: ${e.toString()}');
    }
  }

  @override
  Future<void> cacheAuth(AuthModel auth) async {
    try {
      final jsonString = json.encode(auth.toJson());
      await sharedPreferences.setString(_keyAuth, jsonString);
      await sharedPreferences.setString(_keyAuthToken, auth.token);
      await sharedPreferences.setString(_keyDeviceId, auth.device.id);

      if (auth.employee != null) {
        await sharedPreferences.setString(_keyEmployeeId, auth.employee!.id);
      }
    } catch (e) {
      throw CacheException('Failed to cache auth: ${e.toString()}');
    }
  }

  @override
  Future<void> clearAuth() async {
    try {
      await sharedPreferences.remove(_keyAuth);
      await sharedPreferences.remove(_keyAuthToken);
      await sharedPreferences.remove(_keyDeviceId);
      await sharedPreferences.remove(_keyEmployeeId);
    } catch (e) {
      throw CacheException('Failed to clear auth: ${e.toString()}');
    }
  }

  @override
  Future<bool> isDeviceLoggedIn() async {
    return sharedPreferences.containsKey(_keyDeviceId);
  }

  @override
  Future<bool> isEmployeeLoggedIn() async {
    return sharedPreferences.containsKey(_keyEmployeeId);
  }
}
