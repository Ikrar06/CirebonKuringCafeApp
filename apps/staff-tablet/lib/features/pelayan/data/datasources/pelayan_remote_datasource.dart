import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/network/supabase_client.dart';
import '../models/table_model.dart';

abstract class PelayanRemoteDataSource {
  Future<List<TableModel>> getTables();
  Stream<List<TableModel>> watchTables();
  Future<TableModel> updateTableStatus(String tableId, String status);
  Future<List<Map<String, dynamic>>> getReadyOrders();
  Stream<List<Map<String, dynamic>>> watchReadyOrders();
  Future<void> deliverOrder(String orderId);
  void dispose();
}

class PelayanRemoteDataSourceImpl implements PelayanRemoteDataSource {
  final ApiClient apiClient;
  final SupabaseClientWrapper supabaseClient;

  RealtimeChannel? _tablesChannel;
  StreamController<List<TableModel>>? _tablesController;
  RealtimeChannel? _ordersChannel;
  StreamController<List<Map<String, dynamic>>>? _ordersController;

  PelayanRemoteDataSourceImpl(this.apiClient, this.supabaseClient);

  @override
  Future<List<TableModel>> getTables() async {
    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('tables')
          .select()
          .order('table_number', ascending: true),
    );

    return (response as List)
        .map((json) => TableModel.fromJson(json))
        .toList();
  }

  @override
  Stream<List<TableModel>> watchTables() {
    _tablesController ??= StreamController<List<TableModel>>.broadcast(
      onCancel: () {
        _tablesChannel?.unsubscribe();
        _tablesChannel = null;
      },
    );

    if (_tablesChannel == null) {
      _tablesChannel = supabaseClient.channel('pelayan_tables');

      _tablesChannel!
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'tables',
            callback: (payload) async => await _fetchAndEmitTables(),
          )
          .subscribe();

      _fetchAndEmitTables();
    }

    return _tablesController!.stream;
  }

  Future<void> _fetchAndEmitTables() async {
    try {
      final tables = await getTables();
      if (!(_tablesController?.isClosed ?? true)) {
        _tablesController?.add(tables);
      }
    } catch (e) {
      if (!(_tablesController?.isClosed ?? true)) {
        _tablesController?.addError(e);
      }
    }
  }

  @override
  Future<TableModel> updateTableStatus(String tableId, String status) async {
    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('tables')
          .update({
            'status': status,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', tableId)
          .select()
          .single(),
    );

    return TableModel.fromJson(response);
  }

  @override
  Future<List<Map<String, dynamic>>> getReadyOrders() async {
    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('orders')
          .select('''
            *,
            table:tables!orders_table_id_fkey(*),
            items:order_items(*, menu_item:menu_items(*))
          ''')
          .eq('status', 'ready')
          .order('ready_at', ascending: true),
    );

    return (response as List).cast<Map<String, dynamic>>();
  }

  @override
  Stream<List<Map<String, dynamic>>> watchReadyOrders() {
    _ordersController ??= StreamController<List<Map<String, dynamic>>>.broadcast(
      onCancel: () {
        _ordersChannel?.unsubscribe();
        _ordersChannel = null;
      },
    );

    if (_ordersChannel == null) {
      _ordersChannel = supabaseClient.channel('pelayan_ready_orders');

      _ordersChannel!
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'orders',
            filter: PostgresChangeFilter(
              type: PostgresChangeFilterType.eq,
              column: 'status',
              value: 'ready',
            ),
            callback: (payload) async => await _fetchAndEmitOrders(),
          )
          .subscribe();

      _fetchAndEmitOrders();
    }

    return _ordersController!.stream;
  }

  Future<void> _fetchAndEmitOrders() async {
    try {
      final orders = await getReadyOrders();
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
  Future<void> deliverOrder(String orderId) async {
    await supabaseClient.execute(
      query: () => supabaseClient.from('orders')
          .update({
            'status': 'delivered',
            'delivered_at': DateTime.now().toIso8601String(),
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', orderId),
    );
  }

  @override
  void dispose() {
    _tablesChannel?.unsubscribe();
    _tablesChannel = null;
    _tablesController?.close();
    _tablesController = null;
    _ordersChannel?.unsubscribe();
    _ordersChannel = null;
    _ordersController?.close();
    _ordersController = null;
  }
}
