import 'package:shared_preferences/shared_preferences.dart';

class AppConfig {
  // Supabase configuration
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://your-project.supabase.co',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '',
  );

  static String get apiBaseUrl => '$supabaseUrl/functions/v1';

  // App version
  static const String appVersion = '1.0.0';
  static const String appName = 'Cirebon Kuring Staff Tablet';

  // Device configuration
  static String? deviceId;
  static String? deviceName;
  static String? deviceRole; // 'dapur', 'kasir', 'pelayan', 'stok'

  // Initialize configuration
  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();

    // Load device configuration from local storage
    deviceId = prefs.getString('device_id');
    deviceName = prefs.getString('device_name');
    deviceRole = prefs.getString('device_role');
  }

  // Save device configuration
  static Future<void> saveDeviceConfig({
    required String id,
    required String name,
    required String role,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('device_id', id);
    await prefs.setString('device_name', name);
    await prefs.setString('device_role', role);

    deviceId = id;
    deviceName = name;
    deviceRole = role;
  }

  // Clear device configuration
  static Future<void> clearDeviceConfig() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('device_id');
    await prefs.remove('device_name');
    await prefs.remove('device_role');

    deviceId = null;
    deviceName = null;
    deviceRole = null;
  }

  // Check if device is configured
  static bool get isDeviceConfigured {
    return deviceId != null && deviceName != null && deviceRole != null;
  }
}
