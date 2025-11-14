import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/constants/api_endpoints.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/supabase_client.dart';
import '../models/order_model.dart';

abstract class OrderRemoteDataSource {
  Future<List<OrderModel>> getActiveOrders();
  Future<OrderModel> getOrderById(String orderId);
  Future<OrderModel> updateOrderStatus(String orderId, String status);
  Future<void> bumpOrder(String orderId);
  Stream<List<OrderModel>> watchOrders();
  void dispose();
}

class OrderRemoteDataSourceImpl implements OrderRemoteDataSource {
  final ApiClient apiClient;
  final SupabaseClientWrapper supabaseClient;

  RealtimeChannel? _ordersChannel;
  StreamController<List<OrderModel>>? _ordersController;

  OrderRemoteDataSourceImpl(this.apiClient, this.supabaseClient);

  @override
  Future<List<OrderModel>> getActiveOrders() async {
    final response = await apiClient.get(
      path: ApiEndpoints.kitchenOrders,
      queryParameters: {
        'status': 'confirmed,preparing,ready',
      },
      parseResponse: (data) => data,
    );

    final List<dynamic> ordersJson = response as List<dynamic>;
    return ordersJson
        .map((json) => OrderModel.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<OrderModel> getOrderById(String orderId) async {
    final response = await apiClient.get(
      path: '${ApiEndpoints.kitchenOrders}/$orderId',
      parseResponse: (data) => data,
    );

    return OrderModel.fromJson(response as Map<String, dynamic>);
  }

  @override
  Future<OrderModel> updateOrderStatus(String orderId, String status) async {
    final response = await apiClient.patch(
      path: '${ApiEndpoints.kitchenOrders}/$orderId',
      data: {
        'status': status,
        if (status == 'preparing') 'preparing_at': DateTime.now().toIso8601String(),
        if (status == 'ready') 'ready_at': DateTime.now().toIso8601String(),
        if (status == 'completed') 'completed_at': DateTime.now().toIso8601String(),
      },
      parseResponse: (data) => data,
    );

    return OrderModel.fromJson(response as Map<String, dynamic>);
  }

  @override
  Future<void> bumpOrder(String orderId) async {
    await apiClient.post(
      path: '${ApiEndpoints.kitchenOrders}/$orderId/bump',
      data: {},
      parseResponse: (data) => null,
    );
  }

  @override
  Stream<List<OrderModel>> watchOrders() {
    // Create stream controller if not exists
    _ordersController ??= StreamController<List<OrderModel>>.broadcast(
      onCancel: () {
        _ordersChannel?.unsubscribe();
        _ordersChannel = null;
      },
    );

    // Create realtime channel if not exists
    if (_ordersChannel == null) {
      _ordersChannel = supabaseClient.channel('kitchen_orders');

      // Subscribe to INSERT events
      _ordersChannel!
          .onPostgresChanges(
            event: PostgresChangeEvent.insert,
            schema: 'public',
            table: 'orders',
            callback: (payload) async {
              // Fetch updated orders list
              await _fetchAndEmitOrders();
            },
          )
          // Subscribe to UPDATE events
          .onPostgresChanges(
            event: PostgresChangeEvent.update,
            schema: 'public',
            table: 'orders',
            callback: (payload) async {
              // Fetch updated orders list
              await _fetchAndEmitOrders();
            },
          )
          // Subscribe to DELETE events
          .onPostgresChanges(
            event: PostgresChangeEvent.delete,
            schema: 'public',
            table: 'orders',
            callback: (payload) async {
              // Fetch updated orders list
              await _fetchAndEmitOrders();
            },
          )
          .subscribe();

      // Fetch initial orders
      _fetchAndEmitOrders();
    }

    return _ordersController!.stream;
  }

  /// Fetch orders and emit to stream
  Future<void> _fetchAndEmitOrders() async {
    try {
      final orders = await getActiveOrders();
      if (!(_ordersController?.isClosed ?? true)) {
        _ordersController?.add(orders);
      }
    } catch (e) {
      if (!(_ordersController?.isClosed ?? true)) {
        _ordersController?.addError(e);
      }
    }
  }

  @override
  void dispose() {
    _ordersChannel?.unsubscribe();
    _ordersChannel = null;
    _ordersController?.close();
    _ordersController = null;
  }
}
