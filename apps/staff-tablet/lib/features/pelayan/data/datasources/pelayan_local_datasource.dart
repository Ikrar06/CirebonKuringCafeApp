import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

import '../models/table_model.dart';

abstract class PelayanLocalDataSource {
  Future<List<TableModel>> getCachedTables();
  Future<void> cacheTables(List<TableModel> tables);
}

class PelayanLocalDataSourceImpl implements PelayanLocalDataSource {
  final SharedPreferences sharedPreferences;

  static const String _tablesKey = 'cached_tables';

  PelayanLocalDataSourceImpl(this.sharedPreferences);

  @override
  Future<List<TableModel>> getCachedTables() async {
    final jsonString = sharedPreferences.getString(_tablesKey);
    if (jsonString == null) return [];

    final List<dynamic> jsonList = json.decode(jsonString);
    return jsonList.map((json) => TableModel.fromJson(json as Map<String, dynamic>)).toList();
  }

  @override
  Future<void> cacheTables(List<TableModel> tables) async {
    final jsonList = tables.map((table) => table.toJson()).toList();
    await sharedPreferences.setString(_tablesKey, json.encode(jsonList));
  }
}
