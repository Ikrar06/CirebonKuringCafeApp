  import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Notification service for local notifications
///
/// Handles notifications for:
/// - Kitchen: New orders
/// - Cashier: Payment verification requests
/// - Inventory: Low stock alerts
class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;

  /// Notification channel IDs
  static const String _channelIdKitchen = 'kitchen_orders';
  static const String _channelIdKasir = 'kasir_payments';
  static const String _channelIdStock = 'stock_alerts';

  /// Initialize notification service
  Future<void> initialize() async {
    if (_initialized) return;

    // Android initialization settings
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');

    // iOS initialization settings
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _notifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Create notification channels for Android
    await _createNotificationChannels();

    _initialized = true;

    if (kDebugMode) {
      print('NotificationService initialized');
    }
  }

  /// Create notification channels for Android
  Future<void> _createNotificationChannels() async {
    // Kitchen channel - High importance for new orders
    const kitchenChannel = AndroidNotificationChannel(
      _channelIdKitchen,
      'Pesanan Dapur',
      description: 'Notifikasi pesanan baru untuk dapur',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );

    // Kasir channel - High importance for payment verification
    const kasirChannel = AndroidNotificationChannel(
      _channelIdKasir,
      'Pembayaran Kasir',
      description: 'Notifikasi pembayaran yang perlu diverifikasi',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );

    // Stock channel - Default importance for low stock
    const stockChannel = AndroidNotificationChannel(
      _channelIdStock,
      'Stok Gudang',
      description: 'Notifikasi stok menipis',
      importance: Importance.defaultImportance,
      playSound: true,
    );

    await _notifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(kitchenChannel);

    await _notifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(kasirChannel);

    await _notifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(stockChannel);
  }

  /// Handle notification tap
  void _onNotificationTapped(NotificationResponse response) {
    if (kDebugMode) {
      print('Notification tapped: ${response.payload}');
    }
    // TODO: Navigate to appropriate screen based on payload
  }

  /// Show local notification
  Future<void> showNotification({
    required int id,
    required String title,
    required String body,
    required String channelId,
    String? payload,
  }) async {
    if (!_initialized) {
      await initialize();
    }

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final details = NotificationDetails(
      android: AndroidNotificationDetails(
        channelId,
        channelId == _channelIdKitchen
            ? 'Pesanan Dapur'
            : channelId == _channelIdKasir
                ? 'Pembayaran Kasir'
                : 'Stok Gudang',
        importance: Importance.high,
        priority: Priority.high,
      ),
      iOS: iosDetails,
    );

    await _notifications.show(
      id,
      title,
      body,
      details,
      payload: payload,
    );

    if (kDebugMode) {
      print('Notification shown: $title - $body');
    }
  }

  /// Show notification for new order (Kitchen)
  Future<void> notifyNewOrder({
    required String orderNumber,
    required String tableName,
  }) async {
    await showNotification(
      id: orderNumber.hashCode,
      channelId: _channelIdKitchen,
      title: '🍳 Pesanan Baru',
      body: 'Order $orderNumber dari meja $tableName',
      payload: 'order:$orderNumber',
    );
  }

  /// Show notification for ready order
  Future<void> notifyOrderReady({
    required String orderNumber,
    required String tableName,
  }) async {
    await showNotification(
      id: orderNumber.hashCode + 1000,
      channelId: _channelIdKitchen,
      title: '✅ Pesanan Siap',
      body: 'Order $orderNumber untuk meja $tableName sudah siap',
      payload: 'order:$orderNumber',
    );
  }

  /// Show notification for low stock
  Future<void> notifyLowStock({
    required String itemName,
    required double currentStock,
    required double minStock,
  }) async {
    await showNotification(
      id: itemName.hashCode,
      channelId: _channelIdStock,
      title: '⚠️ Stok Menipis',
      body: '$itemName tersisa $currentStock (min: $minStock)',
      payload: 'stock:$itemName',
    );
  }

  /// Show notification for payment verification (Kasir)
  Future<void> notifyPaymentVerification({
    required String orderNumber,
    required double amount,
  }) async {
    await showNotification(
      id: orderNumber.hashCode + 2000,
      channelId: _channelIdKasir,
      title: '💳 Pembayaran Perlu Verifikasi',
      body: 'Order $orderNumber - Rp ${amount.toStringAsFixed(0)}',
      payload: 'payment:$orderNumber',
    );
  }

  /// Request notification permission (iOS only, Android auto-granted)
  Future<bool> requestPermission() async {
    if (!_initialized) {
      await initialize();
    }

    final result = await _notifications
        .resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin>()
        ?.requestPermissions(
          alert: true,
          badge: true,
          sound: true,
        );

    return result ?? true; // Android auto-grants permission
  }

  /// Cancel all notifications
  Future<void> cancelAll() async {
    await _notifications.cancelAll();
  }

  /// Cancel specific notification
  Future<void> cancel(int id) async {
    await _notifications.cancel(id);
  }
}