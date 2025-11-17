import 'package:shared_preferences/shared_preferences.dart';

abstract class KasirLocalDataSource {
  Future<void> cacheOpeningBalance(double balance);
  Future<double?> getCachedOpeningBalance();
}

class KasirLocalDataSourceImpl implements KasirLocalDataSource {
  final SharedPreferences sharedPreferences;

  static const String _openingBalanceKey = 'opening_balance';

  KasirLocalDataSourceImpl(this.sharedPreferences);

  @override
  Future<void> cacheOpeningBalance(double balance) async {
    await sharedPreferences.setDouble(_openingBalanceKey, balance);
  }

  @override
  Future<double?> getCachedOpeningBalance() async {
    return sharedPreferences.getDouble(_openingBalanceKey);
  }
}
