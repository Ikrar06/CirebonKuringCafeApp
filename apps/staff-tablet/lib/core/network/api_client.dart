import 'package:dio/dio.dart';

import '../errors/exceptions.dart';
import 'dio_client.dart';
import 'network_info.dart';

class ApiClient {
  final DioClient _dioClient;
  final NetworkInfo _networkInfo;

  ApiClient(this._dioClient, this._networkInfo);

  // Wrapper method that checks network connectivity before making requests
  Future<T> execute<T>({
    required Future<Response> Function() request,
    required T Function(dynamic) parseResponse,
  }) async {
    // Check network connectivity first
    if (!await _networkInfo.isConnected) {
      throw NetworkException('No internet connection. Please check your network.');
    }

    try {
      final response = await request();

      // Check if response is successful
      if (response.statusCode == null || response.statusCode! < 200 || response.statusCode! >= 300) {
        throw ServerException(
          'Request failed with status code: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }

      return parseResponse(response.data);
    } on NetworkException {
      rethrow;
    } on ServerException {
      rethrow;
    } on AuthenticationException {
      rethrow;
    } on ValidationException {
      rethrow;
    } catch (e) {
      throw NetworkException('An unexpected error occurred: ${e.toString()}');
    }
  }

  // GET request wrapper
  Future<T> get<T>({
    required String path,
    Map<String, dynamic>? queryParameters,
    required T Function(dynamic) parseResponse,
  }) async {
    return execute(
      request: () => _dioClient.get(path, queryParameters: queryParameters),
      parseResponse: parseResponse,
    );
  }

  // POST request wrapper
  Future<T> post<T>({
    required String path,
    dynamic data,
    Map<String, dynamic>? queryParameters,
    required T Function(dynamic) parseResponse,
  }) async {
    return execute(
      request: () => _dioClient.post(
        path,
        data: data,
        queryParameters: queryParameters,
      ),
      parseResponse: parseResponse,
    );
  }

  // PATCH request wrapper
  Future<T> patch<T>({
    required String path,
    dynamic data,
    Map<String, dynamic>? queryParameters,
    required T Function(dynamic) parseResponse,
  }) async {
    return execute(
      request: () => _dioClient.patch(
        path,
        data: data,
        queryParameters: queryParameters,
      ),
      parseResponse: parseResponse,
    );
  }

  // PUT request wrapper
  Future<T> put<T>({
    required String path,
    dynamic data,
    Map<String, dynamic>? queryParameters,
    required T Function(dynamic) parseResponse,
  }) async {
    return execute(
      request: () => _dioClient.put(
        path,
        data: data,
        queryParameters: queryParameters,
      ),
      parseResponse: parseResponse,
    );
  }

  // DELETE request wrapper
  Future<T> delete<T>({
    required String path,
    dynamic data,
    Map<String, dynamic>? queryParameters,
    required T Function(dynamic) parseResponse,
  }) async {
    return execute(
      request: () => _dioClient.delete(
        path,
        data: data,
        queryParameters: queryParameters,
      ),
      parseResponse: parseResponse,
    );
  }

  // Helper method for requests that don't return data (e.g., delete operations)
  Future<void> executeVoid({
    required Future<Response> Function() request,
  }) async {
    if (!await _networkInfo.isConnected) {
      throw NetworkException('No internet connection. Please check your network.');
    }

    try {
      final response = await request();

      if (response.statusCode == null || response.statusCode! < 200 || response.statusCode! >= 300) {
        throw ServerException(
          'Request failed with status code: ${response.statusCode}',
          statusCode: response.statusCode,
        );
      }
    } on NetworkException {
      rethrow;
    } on ServerException {
      rethrow;
    } on AuthenticationException {
      rethrow;
    } on ValidationException {
      rethrow;
    } catch (e) {
      throw NetworkException('An unexpected error occurred: ${e.toString()}');
    }
  }
}
