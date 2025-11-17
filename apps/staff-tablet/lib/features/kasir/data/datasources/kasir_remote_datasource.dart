import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/network/supabase_client.dart';
import '../models/cash_summary_model.dart';
import '../models/payment_model.dart';

abstract class KasirRemoteDataSource {
  Future<List<Map<String, dynamic>>> getPendingPayments();
  Future<List<Map<String, dynamic>>> getTodayOrders();
  Stream<List<Map<String, dynamic>>> watchOrders();
  Future<PaymentModel> verifyPayment(String paymentId, String employeeId);
  Future<CashSummaryModel> createCashSummary(CashSummaryModel summary);
  void dispose();
}

class KasirRemoteDataSourceImpl implements KasirRemoteDataSource {
  final ApiClient apiClient;
  final SupabaseClientWrapper supabaseClient;

  RealtimeChannel? _ordersChannel;
  StreamController<List<Map<String, dynamic>>>? _ordersController;

  KasirRemoteDataSourceImpl(this.apiClient, this.supabaseClient);

  @override
  Future<List<Map<String, dynamic>>> getPendingPayments() async {
    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('orders')
          .select('''
            *,
            table:tables!orders_table_id_fkey(table_number),
            items:order_items(*, menu_item:menu_items(*))
          ''')
          .eq('status', 'pending_payment')
          .order('created_at', ascending: false),
    );

    return (response as List).cast<Map<String, dynamic>>();
  }

  @override
  Future<List<Map<String, dynamic>>> getTodayOrders() async {
    final today = DateTime.now();
    final startOfDay = DateTime(today.year, today.month, today.day);

    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('orders')
          .select('''
            *,
            table:tables!orders_table_id_fkey(table_number),
            items:order_items(*, menu_item:menu_items(*))
          ''')
          .gte('created_at', startOfDay.toIso8601String())
          .order('created_at', ascending: false),
    );

    return (response as List).cast<Map<String, dynamic>>();
  }

  @override
  Stream<List<Map<String, dynamic>>> watchOrders() {
    _ordersController ??= StreamController<List<Map<String, dynamic>>>.broadcast(
      onCancel: () {
        _ordersChannel?.unsubscribe();
        _ordersChannel = null;
      },
    );

    if (_ordersChannel == null) {
      _ordersChannel = supabaseClient.channel('kasir_orders');

      _ordersChannel!
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'orders',
            callback: (payload) async => await _fetchAndEmitOrders(),
          )
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'payments',
            callback: (payload) async => await _fetchAndEmitOrders(),
          )
          .subscribe();

      _fetchAndEmitOrders();
    }

    return _ordersController!.stream;
  }

  Future<void> _fetchAndEmitOrders() async {
    try {
      final orders = await getTodayOrders();
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
  Future<PaymentModel> verifyPayment(String paymentId, String employeeId) async {
    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('payments')
          .update({
            'status': 'verified',
            'verified_by': employeeId,
            'verified_at': DateTime.now().toIso8601String(),
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', paymentId)
          .select('''
            *,
            order:orders!payments_order_id_fkey(order_number),
            verified_by_employee:employees!payments_verified_by_fkey(name)
          ''')
          .single(),
    );

    return PaymentModel.fromJson(response);
  }

  @override
  Future<CashSummaryModel> createCashSummary(CashSummaryModel summary) async {
    final data = summary.toJson();
    data.remove('id');

    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('cash_summaries')
          .insert(data)
          .select('*, employee:employees!cash_summaries_employee_id_fkey(name)')
          .single(),
    );

    return CashSummaryModel.fromJson(response);
  }

  @override
  void dispose() {
    _ordersChannel?.unsubscribe();
    _ordersChannel = null;
    _ordersController?.close();
    _ordersController = null;
  }
}
