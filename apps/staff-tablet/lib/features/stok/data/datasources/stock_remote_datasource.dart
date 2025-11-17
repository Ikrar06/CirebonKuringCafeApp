import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/network/supabase_client.dart';
import '../models/opname_model.dart';
import '../models/stock_item_model.dart';
import '../models/stock_movement_model.dart';
import '../models/supplier_model.dart';

abstract class StockRemoteDataSource {
  // Stock Items
  Future<List<StockItemModel>> getStockItems();
  Future<StockItemModel> getStockItemById(String id);
  Future<StockItemModel> createStockItem(StockItemModel item);
  Future<StockItemModel> updateStockItem(StockItemModel item);
  Future<void> deleteStockItem(String id);
  Future<List<StockItemModel>> getLowStockItems();
  Stream<List<StockItemModel>> watchStockItems();

  // Stock Movements
  Future<List<StockMovementModel>> getStockMovements(String stockItemId);
  Future<List<StockMovementModel>> getAllStockMovements({
    DateTime? startDate,
    DateTime? endDate,
    String? movementType,
  });
  Future<StockMovementModel> createStockMovement(StockMovementModel movement);
  Stream<List<StockMovementModel>> watchStockMovements(String stockItemId);

  // Suppliers
  Future<List<SupplierModel>> getSuppliers();
  Future<SupplierModel> getSupplierById(String id);
  Future<SupplierModel> createSupplier(SupplierModel supplier);
  Future<SupplierModel> updateSupplier(SupplierModel supplier);
  Future<void> deleteSupplier(String id);
  Future<List<SupplierModel>> getActiveSuppliers();

  // Opnames
  Future<List<OpnameModel>> getOpnames();
  Future<OpnameModel> getOpnameById(String id);
  Future<OpnameModel> createOpname(OpnameModel opname);
  Future<OpnameModel> updateOpname(OpnameModel opname);
  Future<OpnameModel> completeOpname(String opnameId);
  Future<void> deleteOpname(String id);

  void dispose();
}

class StockRemoteDataSourceImpl implements StockRemoteDataSource {
  final ApiClient apiClient;
  final SupabaseClientWrapper supabaseClient;

  RealtimeChannel? _stockItemsChannel;
  StreamController<List<StockItemModel>>? _stockItemsController;
  final Map<String, RealtimeChannel> _movementChannels = {};
  final Map<String, StreamController<List<StockMovementModel>>> _movementControllers = {};

  StockRemoteDataSourceImpl(this.apiClient, this.supabaseClient);

  // ========== Stock Items ==========

  @override
  Future<List<StockItemModel>> getStockItems() async {
    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('stock_items')
          .select()
          .order('name', ascending: true),
    );

    return (response as List)
        .map((json) => StockItemModel.fromJson(json))
        .toList();
  }

  @override
  Future<StockItemModel> getStockItemById(String id) async {
    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('stock_items')
          .select()
          .eq('id', id)
          .single(),
    );

    return StockItemModel.fromJson(response);
  }

  @override
  Future<StockItemModel> createStockItem(StockItemModel item) async {
    final data = item.toJson();
    data.remove('id'); // Let database generate ID
    data['created_at'] = DateTime.now().toIso8601String();
    data['updated_at'] = DateTime.now().toIso8601String();

    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('stock_items')
          .insert(data)
          .select()
          .single(),
    );

    return StockItemModel.fromJson(response);
  }

  @override
  Future<StockItemModel> updateStockItem(StockItemModel item) async {
    final data = item.toJson();
    data['updated_at'] = DateTime.now().toIso8601String();

    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('stock_items')
          .update(data)
          .eq('id', item.id)
          .select()
          .single(),
    );

    return StockItemModel.fromJson(response);
  }

  @override
  Future<void> deleteStockItem(String id) async {
    await supabaseClient.execute(
      query: () => supabaseClient.from('stock_items')
          .delete()
          .eq('id', id),
    );
  }

  @override
  Future<List<StockItemModel>> getLowStockItems() async {
    final response = await supabaseClient.execute(
      query: () => supabaseClient.client
          .rpc('get_low_stock_items')
          .select(),
    );

    return (response as List)
        .map((json) => StockItemModel.fromJson(json))
        .toList();
  }

  @override
  Stream<List<StockItemModel>> watchStockItems() {
    _stockItemsController ??= StreamController<List<StockItemModel>>.broadcast(
      onCancel: () {
        _stockItemsChannel?.unsubscribe();
        _stockItemsChannel = null;
      },
    );

    if (_stockItemsChannel == null) {
      _stockItemsChannel = supabaseClient.channel('stock_items_channel');

      _stockItemsChannel!
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'stock_items',
            callback: (payload) async {
              await _fetchAndEmitStockItems();
            },
          )
          .subscribe();

      _fetchAndEmitStockItems();
    }

    return _stockItemsController!.stream;
  }

  Future<void> _fetchAndEmitStockItems() async {
    try {
      final items = await getStockItems();
      if (!(_stockItemsController?.isClosed ?? true)) {
        _stockItemsController?.add(items);
      }
    } catch (e) {
      if (!(_stockItemsController?.isClosed ?? true)) {
        _stockItemsController?.addError(e);
      }
    }
  }

  // ========== Stock Movements ==========

  @override
  Future<List<StockMovementModel>> getStockMovements(String stockItemId) async {
    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('stock_movements')
          .select('''
            *,
            stock_item:stock_items!stock_movements_stock_item_id_fkey(name, unit),
            supplier:suppliers!stock_movements_supplier_id_fkey(name),
            employee:employees!stock_movements_employee_id_fkey(name)
          ''')
          .eq('stock_item_id', stockItemId)
          .order('created_at', ascending: false),
    );

    return (response as List)
        .map((json) => StockMovementModel.fromJson(json))
        .toList();
  }

  @override
  Future<List<StockMovementModel>> getAllStockMovements({
    DateTime? startDate,
    DateTime? endDate,
    String? movementType,
  }) async {
    var query = supabaseClient.from('stock_movements').select('''
      *,
      stock_item:stock_items!stock_movements_stock_item_id_fkey(name, unit),
      supplier:suppliers!stock_movements_supplier_id_fkey(name),
      employee:employees!stock_movements_employee_id_fkey(name)
    ''');

    if (startDate != null) {
      query = query.gte('created_at', startDate.toIso8601String());
    }
    if (endDate != null) {
      query = query.lte('created_at', endDate.toIso8601String());
    }
    if (movementType != null) {
      query = query.eq('movement_type', movementType);
    }

    final response = await supabaseClient.execute(
      query: () => query.order('created_at', ascending: false),
    );

    return (response as List)
        .map((json) => StockMovementModel.fromJson(json))
        .toList();
  }

  @override
  Future<StockMovementModel> createStockMovement(StockMovementModel movement) async {
    final data = movement.toJson();
    data.remove('id');
    data['created_at'] = DateTime.now().toIso8601String();

    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('stock_movements')
          .insert(data)
          .select('''
            *,
            stock_item:stock_items!stock_movements_stock_item_id_fkey(name, unit),
            supplier:suppliers!stock_movements_supplier_id_fkey(name),
            employee:employees!stock_movements_employee_id_fkey(name)
          ''')
          .single(),
    );

    return StockMovementModel.fromJson(response);
  }

  @override
  Stream<List<StockMovementModel>> watchStockMovements(String stockItemId) {
    final key = 'movement_$stockItemId';

    _movementControllers[key] ??= StreamController<List<StockMovementModel>>.broadcast(
      onCancel: () {
        _movementChannels[key]?.unsubscribe();
        _movementChannels.remove(key);
        _movementControllers.remove(key);
      },
    );

    if (_movementChannels[key] == null) {
      _movementChannels[key] = supabaseClient.channel('stock_movements_$stockItemId');

      _movementChannels[key]!
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'stock_movements',
            filter: PostgresChangeFilter(
              type: PostgresChangeFilterType.eq,
              column: 'stock_item_id',
              value: stockItemId,
            ),
            callback: (payload) async {
              await _fetchAndEmitMovements(stockItemId, key);
            },
          )
          .subscribe();

      _fetchAndEmitMovements(stockItemId, key);
    }

    return _movementControllers[key]!.stream;
  }

  Future<void> _fetchAndEmitMovements(String stockItemId, String key) async {
    try {
      final movements = await getStockMovements(stockItemId);
      if (!(_movementControllers[key]?.isClosed ?? true)) {
        _movementControllers[key]?.add(movements);
      }
    } catch (e) {
      if (!(_movementControllers[key]?.isClosed ?? true)) {
        _movementControllers[key]?.addError(e);
      }
    }
  }

  // ========== Suppliers ==========

  @override
  Future<List<SupplierModel>> getSuppliers() async {
    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('suppliers')
          .select()
          .order('name', ascending: true),
    );

    return (response as List)
        .map((json) => SupplierModel.fromJson(json))
        .toList();
  }

  @override
  Future<SupplierModel> getSupplierById(String id) async {
    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('suppliers')
          .select()
          .eq('id', id)
          .single(),
    );

    return SupplierModel.fromJson(response);
  }

  @override
  Future<SupplierModel> createSupplier(SupplierModel supplier) async {
    final data = supplier.toJson();
    data.remove('id');
    data['created_at'] = DateTime.now().toIso8601String();
    data['updated_at'] = DateTime.now().toIso8601String();

    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('suppliers')
          .insert(data)
          .select()
          .single(),
    );

    return SupplierModel.fromJson(response);
  }

  @override
  Future<SupplierModel> updateSupplier(SupplierModel supplier) async {
    final data = supplier.toJson();
    data['updated_at'] = DateTime.now().toIso8601String();

    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('suppliers')
          .update(data)
          .eq('id', supplier.id)
          .select()
          .single(),
    );

    return SupplierModel.fromJson(response);
  }

  @override
  Future<void> deleteSupplier(String id) async {
    await supabaseClient.execute(
      query: () => supabaseClient.from('suppliers')
          .delete()
          .eq('id', id),
    );
  }

  @override
  Future<List<SupplierModel>> getActiveSuppliers() async {
    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('suppliers')
          .select()
          .eq('is_active', true)
          .order('name', ascending: true),
    );

    return (response as List)
        .map((json) => SupplierModel.fromJson(json))
        .toList();
  }

  // ========== Opnames ==========

  @override
  Future<List<OpnameModel>> getOpnames() async {
    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('stock_opnames')
          .select('''
            *,
            employee:employees!stock_opnames_employee_id_fkey(name),
            items:stock_opname_items(
              *,
              stock_item:stock_items!stock_opname_items_stock_item_id_fkey(name, unit)
            )
          ''')
          .order('opname_date', ascending: false),
    );

    return (response as List)
        .map((json) => OpnameModel.fromJson(json))
        .toList();
  }

  @override
  Future<OpnameModel> getOpnameById(String id) async {
    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('stock_opnames')
          .select('''
            *,
            employee:employees!stock_opnames_employee_id_fkey(name),
            items:stock_opname_items(
              *,
              stock_item:stock_items!stock_opname_items_stock_item_id_fkey(name, unit)
            )
          ''')
          .eq('id', id)
          .single(),
    );

    return OpnameModel.fromJson(response);
  }

  @override
  Future<OpnameModel> createOpname(OpnameModel opname) async {
    final data = opname.toJson();
    data.remove('id');
    data['created_at'] = DateTime.now().toIso8601String();
    data['updated_at'] = DateTime.now().toIso8601String();

    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('stock_opnames')
          .insert(data)
          .select('''
            *,
            employee:employees!stock_opnames_employee_id_fkey(name),
            items:stock_opname_items(
              *,
              stock_item:stock_items!stock_opname_items_stock_item_id_fkey(name, unit)
            )
          ''')
          .single(),
    );

    return OpnameModel.fromJson(response);
  }

  @override
  Future<OpnameModel> updateOpname(OpnameModel opname) async {
    final data = opname.toJson();
    data['updated_at'] = DateTime.now().toIso8601String();

    final response = await supabaseClient.execute(
      query: () => supabaseClient.from('stock_opnames')
          .update(data)
          .eq('id', opname.id)
          .select('''
            *,
            employee:employees!stock_opnames_employee_id_fkey(name),
            items:stock_opname_items(
              *,
              stock_item:stock_items!stock_opname_items_stock_item_id_fkey(name, unit)
            )
          ''')
          .single(),
    );

    return OpnameModel.fromJson(response);
  }

  @override
  Future<OpnameModel> completeOpname(String opnameId) async {
    final response = await supabaseClient.execute(
      query: () => supabaseClient.client
          .rpc('complete_stock_opname', params: {'opname_id': opnameId})
          .select()
          .single(),
    );

    return OpnameModel.fromJson(response);
  }

  @override
  Future<void> deleteOpname(String id) async {
    await supabaseClient.execute(
      query: () => supabaseClient.from('stock_opnames')
          .delete()
          .eq('id', id),
    );
  }

  @override
  void dispose() {
    _stockItemsChannel?.unsubscribe();
    _stockItemsChannel = null;
    _stockItemsController?.close();
    _stockItemsController = null;

    for (var channel in _movementChannels.values) {
      channel.unsubscribe();
    }
    _movementChannels.clear();

    for (var controller in _movementControllers.values) {
      controller.close();
    }
    _movementControllers.clear();
  }
}
