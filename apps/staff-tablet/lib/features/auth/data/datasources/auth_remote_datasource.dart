import '../../../../core/constants/api_endpoints.dart';
import '../../../../core/constants/device_types.dart';
import '../../../../core/network/api_client.dart';
import '../models/auth_model.dart';

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
  final ApiClient apiClient;

  AuthRemoteDataSourceImpl(this.apiClient);

  @override
  Future<AuthModel> deviceLogin({
    required String deviceId,
    required String deviceName,
    required DeviceType deviceType,
  }) async {
    final response = await apiClient.post(
      path: ApiEndpoints.deviceLogin,
      data: {
        'device_id': deviceId,
        'device_name': deviceName,
        'device_type': deviceType.name,
      },
      parseResponse: (data) => data,
    );

    return AuthModel.fromJson(response as Map<String, dynamic>);
  }

  @override
  Future<AuthModel> employeeLogin({
    required String pin,
  }) async {
    final response = await apiClient.post(
      path: ApiEndpoints.employeeLogin,
      data: {
        'pin': pin,
      },
      parseResponse: (data) => data,
    );

    return AuthModel.fromJson(response as Map<String, dynamic>);
  }

  @override
  Future<void> logout() async {
    await apiClient.post(
      path: ApiEndpoints.logout,
      data: {},
      parseResponse: (data) => null,
    );
  }
}
