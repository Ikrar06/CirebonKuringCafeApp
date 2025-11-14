import 'package:supabase_flutter/supabase_flutter.dart';

import '../errors/exceptions.dart';
import 'network_info.dart';

/// Wrapper for Supabase client with error handling
class SupabaseClientWrapper {
  final SupabaseClient _client;
  final NetworkInfo _networkInfo;

  SupabaseClientWrapper(this._client, this._networkInfo);

  /// Get the raw Supabase client for direct access
  SupabaseClient get client => _client;

  /// Execute a query with network check and error handling
  Future<T> execute<T>({
    required Future<T> Function() query,
  }) async {
    if (!await _networkInfo.isConnected) {
      throw NetworkException('No internet connection. Please check your network.');
    }

    try {
      return await query();
    } on AuthException catch (e) {
      throw AuthenticationException(e.message);
    } on PostgrestException catch (e) {
      throw ServerException(
        e.message,
        statusCode: int.tryParse(e.code ?? '500'),
      );
    } catch (e) {
      throw NetworkException('An unexpected error occurred: ${e.toString()}');
    }
  }

  /// Create a realtime channel
  RealtimeChannel channel(String name) {
    return _client.channel(name);
  }

  /// Get from table
  SupabaseQueryBuilder from(String table) {
    return _client.from(table);
  }
}
