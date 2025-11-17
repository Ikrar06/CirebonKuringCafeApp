import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

import '../models/stock_item_model.dart';

abstract class StockLocalDataSource {
  Future<List<StockItemModel>> getCachedStockItems();
  Future<void> cacheStockItems(List<StockItemModel> items);
  Future<void> clearCache();
}

class StockLocalDataSourceImpl implements StockLocalDataSource {
  final SharedPreferences sharedPreferences;

  static const String _stockItemsKey = 'cached_stock_items';

  StockLocalDataSourceImpl(this.sharedPreferences);

  @override
  Future<List<StockItemModel>> getCachedStockItems() async {
    final jsonString = sharedPreferences.getString(_stockItemsKey);
    if (jsonString == null) {
      return [];
    }

    final List<dynamic> jsonList = json.decode(jsonString);
    return jsonList
        .map((json) => StockItemModel.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  @override
  Future<void> cacheStockItems(List<StockItemModel> items) async {
    final jsonList = items.map((item) => item.toJson()).toList();
    await sharedPreferences.setString(_stockItemsKey, json.encode(jsonList));
  }

  @override
  Future<void> clearCache() async {
    await sharedPreferences.remove(_stockItemsKey);
  }
}
