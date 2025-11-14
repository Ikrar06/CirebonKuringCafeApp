import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/errors/exceptions.dart';
import '../models/order_model.dart';

abstract class OrderLocalDataSource {
  Future<List<OrderModel>> getCachedOrders();
  Future<void> cacheOrders(List<OrderModel> orders);
  Future<void> clearCache();
}

class OrderLocalDataSourceImpl implements OrderLocalDataSource {
  final SharedPreferences sharedPreferences;

  static const String _keyOrders = 'CACHED_ORDERS';

  OrderLocalDataSourceImpl(this.sharedPreferences);

  @override
  Future<List<OrderModel>> getCachedOrders() async {
    try {
      final jsonString = sharedPreferences.getString(_keyOrders);
      if (jsonString == null) return [];

      final List<dynamic> jsonList = json.decode(jsonString) as List<dynamic>;
      return jsonList
          .map((json) => OrderModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw CacheException('Failed to get cached orders: ${e.toString()}');
    }
  }

  @override
  Future<void> cacheOrders(List<OrderModel> orders) async {
    try {
      final jsonList = orders.map((order) => order.toJson()).toList();
      final jsonString = json.encode(jsonList);
      await sharedPreferences.setString(_keyOrders, jsonString);
    } catch (e) {
      throw CacheException('Failed to cache orders: ${e.toString()}');
    }
  }

  @override
  Future<void> clearCache() async {
    try {
      await sharedPreferences.remove(_keyOrders);
    } catch (e) {
      throw CacheException('Failed to clear cache: ${e.toString()}');
    }
  }
}
